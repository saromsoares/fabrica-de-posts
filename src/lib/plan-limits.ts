/**
 * plan-limits.ts — Fonte única de verdade para limites de planos
 *
 * REGRA DE OURO: Nunca hardcodar limites de plano no frontend.
 * Sempre usar esta lib. Se precisar mudar um limite, mudar APENAS
 * na tabela `plan_limits` do Supabase. O frontend pega automaticamente.
 *
 * A tabela `plan_limits` é a fonte de verdade. As Edge Functions
 * generate-post (v6) e lojista-stats (v3) já leem desta tabela.
 */

import { createClient } from '@/lib/supabase-browser';

export interface PlanLimits {
  plan_name: string;
  monthly_generations: number;
  max_products: number;
  max_factories_followed: number;
  description: string;
  price_brl: number;
}

// Cache em memória — revalidar a cada 5 minutos
let _cachedLimits: PlanLimits[] | null = null;
let _cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Retorna todos os planos com seus limites.
 * Usa cache em memória (TTL 5min) e fallback seguro se o banco falhar.
 */
export async function getAllPlanLimits(): Promise<PlanLimits[]> {
  const now = Date.now();
  if (_cachedLimits && now - _cachedAt < CACHE_TTL_MS) {
    return _cachedLimits;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('plan_limits')
      .select('*')
      .order('monthly_generations');

    if (error || !data || data.length === 0) {
      console.warn('[plan-limits] Failed to fetch from DB, using fallback:', error?.message);
      return getFallbackLimits();
    }

    _cachedLimits = data as PlanLimits[];
    _cachedAt = now;
    return _cachedLimits;
  } catch (err) {
    console.warn('[plan-limits] Unexpected error, using fallback:', err);
    return getFallbackLimits();
  }
}

/**
 * Retorna os limites de um plano específico.
 * Fallback para o plano 'free' se o plano não for encontrado.
 */
export async function getPlanLimit(planName: string): Promise<PlanLimits> {
  const all = await getAllPlanLimits();
  return all.find((p) => p.plan_name === planName) ?? getFallbackLimits()[0];
}

/**
 * Invalida o cache manualmente (ex: após upgrade de plano).
 */
export function invalidatePlanLimitsCache(): void {
  _cachedLimits = null;
  _cachedAt = 0;
}

/**
 * Formata o valor de um limite para exibição.
 * 999999 → '∞' (ilimitado)
 */
export function formatLimit(value: number): string {
  return value >= 999999 ? '∞' : String(value);
}

/**
 * Formata o preço para exibição em BRL.
 * 0 → 'Grátis'
 */
export function formatPlanPrice(priceBrl: number): string {
  if (priceBrl === 0) return 'Grátis';
  return `R$ ${priceBrl.toFixed(2).replace('.', ',')}/mês`;
}

/**
 * Fallback APENAS se o banco estiver inacessível.
 * DEVE refletir exatamente os mesmos valores da tabela `plan_limits`.
 * Se mudar a tabela, atualizar aqui também e rodar o teste de divergência.
 */
export function getFallbackLimits(): PlanLimits[] {
  return [
    {
      plan_name: 'free',
      monthly_generations: 5,
      max_products: 10,
      max_factories_followed: 3,
      description: 'Plano gratuito',
      price_brl: 0,
    },
    {
      plan_name: 'loja',
      monthly_generations: 50,
      max_products: 100,
      max_factories_followed: 20,
      description: 'Plano Loja',
      price_brl: 49.90,
    },
    {
      plan_name: 'pro',
      monthly_generations: 999999,
      max_products: 999999,
      max_factories_followed: 999999,
      description: 'Plano Pro',
      price_brl: 149.90,
    },
  ];
}
