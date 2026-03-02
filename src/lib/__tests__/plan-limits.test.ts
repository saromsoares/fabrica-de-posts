/* eslint-disable no-console */
/**
 * Teste de Divergência — plan-limits
 *
 * PROPÓSITO: Garantir que os valores do fallback em `getFallbackLimits()`
 * estejam sincronizados com a tabela `plan_limits` do Supabase.
 *
 * COMO RODAR:
 *   pnpm test:plan-limits
 *
 * QUANDO RODAR:
 *   - Antes de qualquer deploy que altere planos/preços
 *   - Após qualquer alteração na tabela `plan_limits` do Supabase
 *   - Semanalmente no CI para detectar drift
 *
 * SE FALHAR:
 *   1. Acesse o Supabase Dashboard → Table Editor → plan_limits
 *   2. Atualize os valores em `getFallbackLimits()` em src/lib/plan-limits.ts
 *   3. Rode o teste novamente para confirmar sincronização
 */

import { createClient } from '@supabase/supabase-js';
import { getFallbackLimits } from '../plan-limits';
import type { PlanLimits } from '../plan-limits';

// Carrega as env vars do .env.local se disponível
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function runDivergenceTest(): Promise<void> {
  console.log('\n🔍 Teste de Divergência — plan-limits\n');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('⚠️  NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não definidas.');
    console.warn('   Rode: source .env.local && npx tsx src/lib/__tests__/plan-limits.test.ts');
    console.warn('   Pulando teste de divergência com banco (apenas validando fallback).\n');
    validateFallbackStructure();
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: dbPlans, error } = await supabase
    .from('plan_limits')
    .select('*')
    .order('monthly_generations');

  if (error) {
    console.error('❌ Erro ao buscar plan_limits do banco:', error.message);
    process.exit(1);
  }

  if (!dbPlans || dbPlans.length === 0) {
    console.error('❌ Tabela plan_limits está vazia no banco!');
    console.error('   Execute a migration de seed de planos antes de continuar.');
    process.exit(1);
  }

  const fallback = getFallbackLimits();
  let hasDivergence = false;

  console.log('Comparando banco vs. fallback:\n');
  console.log('Plan Name       | Campo                  | Banco        | Fallback     | Status');
  console.log('----------------|------------------------|--------------|--------------|-------');

  for (const dbPlan of dbPlans as PlanLimits[]) {
    const fallbackPlan = fallback.find((f) => f.plan_name === dbPlan.plan_name);

    if (!fallbackPlan) {
      console.log(`${dbPlan.plan_name.padEnd(16)}| (plano inteiro)         | presente     | AUSENTE      | ❌ DIVERGÊNCIA`);
      hasDivergence = true;
      continue;
    }

    const fields: (keyof PlanLimits)[] = [
      'monthly_generations',
      'max_products',
      'max_factories_followed',
      'price_brl',
    ];

    for (const field of fields) {
      const dbVal = dbPlan[field];
      const fbVal = fallbackPlan[field];
      const ok = dbVal === fbVal;
      if (!ok) hasDivergence = true;
      const status = ok ? '✅ OK' : '❌ DIVERGÊNCIA';
      console.log(
        `${dbPlan.plan_name.padEnd(16)}| ${field.padEnd(23)} | ${String(dbVal).padEnd(12)} | ${String(fbVal).padEnd(12)} | ${status}`
      );
    }
  }

  // Verificar planos no fallback que não existem no banco
  for (const fbPlan of fallback) {
    const dbPlan = (dbPlans as PlanLimits[]).find((d) => d.plan_name === fbPlan.plan_name);
    if (!dbPlan) {
      console.log(`${fbPlan.plan_name.padEnd(16)}| (plano inteiro)         | AUSENTE      | presente     | ⚠️  AVISO`);
    }
  }

  console.log('\n');

  if (hasDivergence) {
    console.error('❌ FALHA: Divergência detectada entre banco e fallback!');
    console.error('   Atualize getFallbackLimits() em src/lib/plan-limits.ts');
    process.exit(1);
  } else {
    console.log('✅ PASSOU: Banco e fallback estão sincronizados.');
  }
}

function validateFallbackStructure(): void {
  const fallback = getFallbackLimits();
  const requiredPlans = ['free', 'loja', 'pro'];
  const requiredFields: (keyof PlanLimits)[] = [
    'plan_name', 'monthly_generations', 'max_products',
    'max_factories_followed', 'price_brl',
  ];

  let ok = true;

  for (const planName of requiredPlans) {
    const plan = fallback.find((p) => p.plan_name === planName);
    if (!plan) {
      console.error(`❌ Plano '${planName}' ausente no fallback!`);
      ok = false;
      continue;
    }
    for (const field of requiredFields) {
      if (plan[field] === undefined || plan[field] === null) {
        console.error(`❌ Campo '${field}' ausente no plano '${planName}'!`);
        ok = false;
      }
    }
  }

  if (ok) {
    console.log('✅ Estrutura do fallback válida (free, loja, pro com todos os campos).');
  } else {
    process.exit(1);
  }
}

runDivergenceTest().catch((err) => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
