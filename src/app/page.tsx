import Link from 'next/link';
import { Sparkles, Palette, Download, Zap, Check, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { getFallbackLimits, formatLimit, formatPlanPrice } from '@/lib/plan-limits';
import type { PlanLimits } from '@/lib/plan-limits';

const steps = [
  { icon: Palette, title: 'Configure sua marca', desc: 'Suba sua logo, defina cores e contatos. Uma vez só.' },
  { icon: Sparkles, title: 'Escolha produto + template', desc: 'Selecione o produto e o layout ideal para sua rede.' },
  { icon: Zap, title: 'Preencha e gere', desc: 'Preço, CTA e pronto: arte + legenda em segundos.' },
  { icon: Download, title: 'Baixe e poste', desc: 'Download da imagem + copie a legenda. Pronto para publicar.' },
];

const faqs = [
  { q: 'Preciso saber design?', a: 'Não! A plataforma faz tudo por você. Basta escolher o produto, o template e preencher os dados. A arte é gerada automaticamente.' },
  { q: 'Posso usar minha própria logo?', a: 'Sim. No Brand Kit você sobe sua logo, define suas cores e contatos. Toda arte gerada vem com sua identidade visual.' },
  { q: 'Para quais redes sociais servem?', a: 'Geramos artes nos formatos Feed (1080x1080) e Story (1080x1920), perfeitos para Instagram, Facebook, WhatsApp Status e mais.' },
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Sem fidelidade. Você cancela quando quiser e continua usando até o fim do período pago.' },
];

// Mapeamento de features por plano (não é limite — é lista de funcionalidades)
const PLAN_FEATURES: Record<string, string[]> = {
  free: ['1 marca', 'Templates básicos', 'Download PNG'],
  loja: ['1 marca', 'Todos os templates', 'Download PNG/JPG', 'Legendas automáticas', 'Histórico completo'],
  pro: ['1 marca', 'Todos os templates', 'Download PNG/JPG', 'Legendas automáticas', 'Histórico completo', 'Suporte prioritário'],
};

const PLAN_CTA: Record<string, string> = {
  free: 'Começar grátis',
  loja: 'Assinar Loja',
  pro: 'Assinar Pro',
};

const PLAN_POPULAR: Record<string, boolean> = {
  free: false,
  loja: true,
  pro: false,
};

async function getPlanLimitsForLanding(): Promise<PlanLimits[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('plan_limits')
      .select('*')
      .order('monthly_generations');

    if (error || !data || data.length === 0) {
      return getFallbackLimits();
    }
    return data as PlanLimits[];
  } catch {
    return getFallbackLimits();
  }
}

export default async function LandingPage() {
  const planLimits = await getPlanLimitsForLanding();

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-display font-700 text-lg">Fábrica de <span className="text-brand-400">Posts</span></span>
          <div className="hidden md:flex items-center gap-8 text-sm text-dark-300">
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#precos" className="hover:text-white transition-colors">Preços</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <Link href="/login" className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-600 rounded-xl transition-all">
            Entrar
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[100px]" />
        <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dark-800/60 border border-dark-700/50 mb-8 text-sm text-dark-300">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            Para revendedores e lojas
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-800 tracking-tight mb-6 leading-[1.1]">
            Artes profissionais<br />em <span className="text-brand-500 glow-text">minutos</span>
          </h1>
          <p className="text-lg md:text-xl text-dark-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Marketing pronto sem designer. Escolha o produto, aplique sua marca e baixe artes prontas para Feed e Story.
          </p>
          <Link href="/login" className="inline-flex items-center gap-3 px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-display font-600 text-lg rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(224,96,78,0.3)]">
            Começar grátis
          </Link>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-20 relative">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl font-800 text-center mb-16">Como <span className="text-brand-500">funciona</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 text-center group hover:border-brand-500/30 transition-all">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-600/10 flex items-center justify-center group-hover:bg-brand-600/20 transition-all">
                  <step.icon size={24} className="text-brand-400" />
                </div>
                <div className="text-xs text-brand-400 font-600 mb-2">PASSO {i + 1}</div>
                <h3 className="font-display font-700 mb-2">{step.title}</h3>
                <p className="text-sm text-dark-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preços — dados dinâmicos da tabela plan_limits */}
      <section id="precos" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl font-800 text-center mb-4">Planos e <span className="text-brand-500">preços</span></h2>
          <p className="text-dark-400 text-center mb-16 max-w-xl mx-auto">Escolha o plano ideal para o volume da sua loja. Comece grátis e evolua conforme cresce.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planLimits.map((plan) => {
              const isPopular = PLAN_POPULAR[plan.plan_name] ?? false;
              const features = PLAN_FEATURES[plan.plan_name] ?? [];
              const cta = PLAN_CTA[plan.plan_name] ?? 'Assinar';
              const limitLabel = formatLimit(plan.monthly_generations);
              const priceLabel = formatPlanPrice(plan.price_brl);

              return (
                <div
                  key={plan.plan_name}
                  className={`relative rounded-2xl p-8 border transition-all ${
                    isPopular
                      ? 'bg-dark-900/80 border-brand-500/40 shadow-[0_0_40px_rgba(224,96,78,0.1)]'
                      : 'bg-dark-900/40 border-dark-800/40'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-600 text-white text-xs font-600 rounded-full">
                      Popular
                    </div>
                  )}
                  <h3 className="font-display font-700 text-xl mb-1 capitalize">{plan.plan_name}</h3>
                  <p className="text-dark-400 text-sm mb-4">
                    {limitLabel === '∞' ? 'Gerações ilimitadas' : `${limitLabel} artes/mês`}
                  </p>
                  <div className="font-display text-4xl font-800 mb-6">
                    {plan.price_brl === 0 ? 'Grátis' : `R$ ${Math.floor(plan.price_brl)}`}
                    {plan.price_brl > 0 && <span className="text-lg text-dark-400 font-400">/mês</span>}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-dark-300">
                        <Check size={16} className="text-brand-400 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={`block w-full py-3 rounded-xl text-center font-600 transition-all ${
                      isPopular
                        ? 'bg-brand-600 hover:bg-brand-700 text-white'
                        : 'bg-dark-800 hover:bg-dark-700 text-dark-200'
                    }`}
                  >
                    {cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl font-800 text-center mb-16">Perguntas <span className="text-brand-500">frequentes</span></h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="group bg-dark-900/60 border border-dark-800/40 rounded-2xl">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-display font-600">{faq.q}</span>
                  <ChevronDown size={20} className="text-dark-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6 text-dark-300 text-sm leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-dark-800/40">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-dark-500">
          © {new Date().getFullYear()} Fábrica de Posts. Todos os direitos reservados.
        </div>
      </footer>
    </main>
  );
}
