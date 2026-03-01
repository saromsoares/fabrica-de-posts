import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { Check, Sparkles, Crown, Zap, Star } from 'lucide-react';
import { getFallbackLimits } from '@/lib/plan-limits';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface PlanRow {
  plan_name: string;
  display_name: string;
  price_brl: number;
  monthly_generations: number;
  monthly_copys: number;
  max_factories_followed: number;
  template_level: string;
  description: string | null;
}

/* ─── Configuração visual por plano ─────────────────────────────────────────── */
const PLAN_CONFIG: Record<string, {
  badge_color: string;
  border: string;
  header_bg: string;
  icon: React.ElementType;
  icon_color: string;
  cta_class: string;
  highlight: boolean;
  highlight_label?: string;
  is_super?: boolean;
}> = {
  gratis: {
    badge_color: 'bg-gray-700/60 text-gray-300 border-gray-600/40',
    border: 'border-dark-800/40',
    header_bg: 'bg-dark-900/40',
    icon: Sparkles,
    icon_color: 'text-gray-400',
    cta_class: 'bg-dark-800 hover:bg-dark-700 text-dark-200 border border-dark-700/40',
    highlight: false,
  },
  basico: {
    badge_color: 'bg-blue-900/50 text-blue-300 border-blue-700/40',
    border: 'border-blue-800/30',
    header_bg: 'bg-blue-950/30',
    icon: Zap,
    icon_color: 'text-blue-400',
    cta_class: 'bg-blue-700 hover:bg-blue-600 text-white',
    highlight: false,
  },
  intermediario: {
    badge_color: 'bg-purple-900/50 text-purple-300 border-purple-600/40',
    border: 'border-purple-500/50',
    header_bg: 'bg-purple-950/40',
    icon: Crown,
    icon_color: 'text-purple-400',
    cta_class: 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30',
    highlight: true,
    highlight_label: 'Mais popular',
  },
  premium: {
    badge_color: 'bg-amber-900/50 text-amber-300 border-amber-700/40',
    border: 'border-amber-700/30',
    header_bg: 'bg-amber-950/30',
    icon: Star,
    icon_color: 'text-amber-400',
    cta_class: 'bg-amber-600 hover:bg-amber-500 text-white',
    highlight: false,
  },
  super_premium: {
    badge_color: 'bg-gradient-to-r from-yellow-900/60 to-amber-900/60 text-yellow-200 border-yellow-600/40',
    border: 'border-yellow-600/40',
    header_bg: 'bg-gradient-to-br from-yellow-950/60 via-amber-950/40 to-dark-900/60',
    icon: Crown,
    icon_color: 'text-yellow-300',
    cta_class: 'bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-white font-700 shadow-lg shadow-yellow-600/30',
    highlight: false,
    is_super: true,
  },
};

/* ─── CTA por plano ──────────────────────────────────────────────────────────── */
const PLAN_CTA: Record<string, string> = {
  gratis: 'Começar grátis',
  basico: 'Assinar Básico',
  intermediario: 'Assinar Intermediário',
  premium: 'Assinar Premium',
  super_premium: 'Assinar Super Premium',
};

/* ─── Features por plano (do JSON) ──────────────────────────────────────────── */
const PLAN_FEATURES: Record<string, string[]> = {
  gratis: [
    'Acesso a 1 fábrica',
    '1 template básico',
    '1 arte por mês',
    '1 copy por mês',
  ],
  basico: [
    'Acesso a 2 fábricas',
    'Templates intermediários',
    '4 artes por mês',
    '4 copys por mês',
  ],
  intermediario: [
    'Acesso a 5 fábricas',
    'Templates premium',
    '8 artes por mês',
    '8 copys por mês',
  ],
  premium: [
    'Acesso a 7 fábricas',
    'Templates até seu nível',
    '12 artes por mês',
    '12 copys por mês',
  ],
  super_premium: [
    'Acesso a TODAS as fábricas',
    'Templates exclusivos',
    '30 artes por mês',
    '30 copys por mês',
  ],
};

/* ─── Data fetching ──────────────────────────────────────────────────────────── */
async function getPlansAndCurrentUser(): Promise<{
  plans: PlanRow[];
  currentPlan: string | null;
}> {
  try {
    const supabase = await createClient();

    // Buscar planos do banco
    const { data: plansData, error: plansError } = await supabase
      .from('plan_limits')
      .select('plan_name, display_name, price_brl, monthly_generations, monthly_copys, max_factories_followed, template_level, description')
      .order('price_brl');

    const plans = (plansError || !plansData || plansData.length === 0)
      ? (getFallbackLimits() as unknown as PlanRow[])
      : (plansData as PlanRow[]);

    // Buscar plano do usuário logado (se houver sessão)
    const { data: { session } } = await supabase.auth.getSession();
    let currentPlan: string | null = null;

    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', session.user.id)
        .single();
      currentPlan = profile?.plan ?? null;
    }

    return { plans, currentPlan };
  } catch {
    return { plans: getFallbackLimits() as unknown as PlanRow[], currentPlan: null };
  }
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function formatPrice(price: number): React.ReactNode {
  if (price === 0) return <span className="text-4xl font-800 font-display">Grátis</span>;
  return (
    <>
      <span className="text-sm text-dark-400 font-400 mr-0.5">R$</span>
      <span className="text-4xl font-800 font-display">
        {price.toFixed(2).replace('.', ',')}
      </span>
      <span className="text-base text-dark-400 font-400">/mês</span>
    </>
  );
}

function formatFactories(n: number): string {
  return n >= 999999 ? 'Todas' : String(n);
}

/* ─── Page Component ─────────────────────────────────────────────────────────── */
export default async function PlanosPage() {
  const { plans, currentPlan } = await getPlansAndCurrentUser();

  return (
    <main className="min-h-screen bg-dark-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display font-700 text-lg hover:opacity-80 transition-opacity">
            Fábrica de <span className="text-brand-400">Posts</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/#como-funciona" className="hidden md:block text-sm text-dark-300 hover:text-white transition-colors">
              Como funciona
            </Link>
            <Link href="/login" className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-600 rounded-xl transition-all">
              {currentPlan ? 'Meu painel' : 'Entrar'}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dark-800/60 border border-dark-700/50 mb-6 text-sm text-dark-300">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            Planos e Preços
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-800 tracking-tight mb-4 leading-tight">
            Escolha o plano <span className="text-brand-500">ideal</span> para sua loja
          </h1>
          <p className="text-dark-400 text-lg max-w-xl mx-auto">
            Comece grátis e evolua conforme sua loja cresce. Sem fidelidade, cancele quando quiser.
          </p>
        </div>
      </section>

      {/* Cards de planos */}
      <section className="pb-24 px-4 md:px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 lg:gap-5 items-start">
            {plans.map((plan) => {
              const config = PLAN_CONFIG[plan.plan_name] ?? PLAN_CONFIG.gratis;
              const features = PLAN_FEATURES[plan.plan_name] ?? [];
              const cta = PLAN_CTA[plan.plan_name] ?? 'Assinar';
              const isCurrentPlan = currentPlan === plan.plan_name;
              const IconComp = config.icon;

              return (
                <div
                  key={plan.plan_name}
                  className={`relative rounded-2xl border overflow-hidden flex flex-col transition-all duration-300 ${config.border} ${
                    config.highlight
                      ? 'shadow-[0_0_50px_rgba(147,51,234,0.15)] scale-[1.02] xl:scale-[1.03]'
                      : config.is_super
                      ? 'shadow-[0_0_40px_rgba(234,179,8,0.12)]'
                      : ''
                  }`}
                >
                  {/* Badge "Mais popular" */}
                  {config.highlight && config.highlight_label && (
                    <div className="absolute top-0 left-0 right-0 flex justify-center">
                      <div className="px-4 py-1 bg-purple-600 text-white text-[10px] font-800 uppercase tracking-wider rounded-b-xl shadow-lg">
                        {config.highlight_label}
                      </div>
                    </div>
                  )}

                  {/* Header do card */}
                  <div className={`p-5 pt-${config.highlight ? '8' : '5'} ${config.header_bg}`}>
                    {config.highlight && <div className="h-4" />}

                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-1.5 rounded-lg ${config.is_super ? 'bg-yellow-500/20' : 'bg-white/5'}`}>
                        <IconComp size={16} className={config.icon_color} />
                      </div>
                      <span className={`text-[10px] font-800 uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.badge_color}`}>
                        {plan.display_name ?? plan.plan_name}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-0.5 mb-1">
                      {formatPrice(plan.price_brl)}
                    </div>

                    {plan.price_brl > 0 && (
                      <p className="text-[11px] text-dark-500 mt-0.5">
                        Cobrado mensalmente
                      </p>
                    )}
                  </div>

                  {/* Separador */}
                  <div className={`h-px ${config.is_super ? 'bg-gradient-to-r from-yellow-800/40 via-amber-600/30 to-yellow-800/40' : 'bg-dark-800/40'}`} />

                  {/* Features */}
                  <div className="p-5 flex-1 bg-dark-900/30">
                    <ul className="space-y-2.5">
                      {features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-sm">
                          <Check
                            size={14}
                            className={`mt-0.5 flex-shrink-0 ${
                              config.is_super ? 'text-yellow-400' :
                              config.highlight ? 'text-purple-400' :
                              'text-brand-400'
                            }`}
                          />
                          <span className="text-dark-300 leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Limites técnicos */}
                    <div className="mt-4 pt-4 border-t border-dark-800/30 space-y-1.5">
                      <p className="text-[10px] text-dark-600 font-600 uppercase tracking-wider mb-2">Limites</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-dark-500">Fábricas</span>
                        <span className="text-dark-300 font-600">{formatFactories(plan.max_factories_followed)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-dark-500">Artes/mês</span>
                        <span className="text-dark-300 font-600">
                          {plan.monthly_generations >= 999999 ? '∞' : plan.monthly_generations}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-dark-500">Copys/mês</span>
                        <span className="text-dark-300 font-600">
                          {plan.monthly_copys >= 999999 ? '∞' : (plan.monthly_copys ?? plan.monthly_generations)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-dark-500">Templates</span>
                        <span className="text-dark-300 font-600 capitalize">{plan.template_level ?? 'básico'}</span>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="p-5 pt-0 bg-dark-900/30">
                    {isCurrentPlan ? (
                      <div className="w-full py-3 rounded-xl text-center text-sm font-700 bg-dark-800/60 border border-dark-700/40 text-dark-400 cursor-default">
                        ✓ Plano atual
                      </div>
                    ) : (
                      <Link
                        href={currentPlan ? '/dashboard/conta' : '/login'}
                        className={`block w-full py-3 rounded-xl text-center text-sm font-600 transition-all duration-200 ${config.cta_class}`}
                      >
                        {cta}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ rápido */}
      <section className="pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-2xl font-800 text-center mb-10">
            Perguntas <span className="text-brand-500">frequentes</span>
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Posso cancelar a qualquer momento?',
                a: 'Sim. Não há fidelidade. Você pode cancelar quando quiser e continuar usando até o fim do período pago.',
              },
              {
                q: 'O que são as "fábricas"?',
                a: 'Fábricas são os fabricantes parceiros que disponibilizam seus produtos e templates na plataforma. Cada plano permite seguir um número diferente de fábricas.',
              },
              {
                q: 'O que acontece se eu atingir o limite de artes?',
                a: 'Você pode fazer upgrade para um plano maior a qualquer momento. O limite reseta todo mês.',
              },
              {
                q: 'Posso usar minha própria logo?',
                a: 'Sim! Em todos os planos você pode fazer upload da sua logo e aplicá-la automaticamente em todas as artes.',
              },
            ].map((item) => (
              <div key={item.q} className="bg-dark-900/40 border border-dark-800/40 rounded-2xl p-5">
                <p className="font-600 text-white mb-2">{item.q}</p>
                <p className="text-dark-400 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-800/40 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-dark-500">
          <span>© 2026 Fábrica de Posts. Todos os direitos reservados.</span>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-dark-300 transition-colors">Início</Link>
            <Link href="/#como-funciona" className="hover:text-dark-300 transition-colors">Como funciona</Link>
            <Link href="/login" className="hover:text-dark-300 transition-colors">Entrar</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
