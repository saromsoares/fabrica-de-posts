'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

// ─── DADOS ESTÁTICOS ────────────────────────────────────────────────────────────

const STATS = [
  { number: '3s', label: 'Tempo médio', desc: 'para gerar arte + copy profissional' },
  { number: '85%', label: 'Economia', desc: 'comparado a contratar um designer' },
  { number: '0', label: 'Conhecimento técnico', desc: 'necessário para criar conteúdo' },
  { number: '24/7', label: 'Disponível', desc: 'sua produção de conteúdo nunca para' },
];

const TESTIMONIALS = [
  {
    name: 'Carla Mendes',
    store: 'Ilumina Casa • Fortaleza/CE',
    avatar: 'CM',
    text: 'Antes eu gastava 2 horas por dia tentando fazer posts no Canva. Agora em 10 segundos tenho arte profissional + legenda pronta. Meu perfil nunca teve tanta qualidade.',
    rating: 5,
  },
  {
    name: 'Roberto Alves',
    store: 'Indústria LedMax • São Paulo/SP',
    avatar: 'RA',
    text: 'Cadastrei nosso catálogo e em uma semana 30 lojistas já estavam gerando conteúdo com nossa marca. É marketing gratuito em escala.',
    rating: 5,
  },
  {
    name: 'Ana Beatriz',
    store: 'AB Decorações • Belo Horizonte/MG',
    avatar: 'AB',
    text: 'O melhor é que cada post sai com meu logo, minhas cores e meu WhatsApp. Parece que tenho uma agência de marketing trabalhando pra mim.',
    rating: 5,
  },
  {
    name: 'Marcos Ferreira',
    store: 'TechBrilho Iluminação • Curitiba/PR',
    avatar: 'MF',
    text: 'Reduzimos 85% do custo com material de apoio ao lojista. Os templates garantem que a identidade visual da marca é respeitada em todos os pontos de venda.',
    rating: 5,
  },
];

const PARTNER_LOGOS = [
  'ASX Iluminação', 'LedMax', 'TechBrilho', 'Luminar', 'BrilhaLux',
  'FotoLed', 'MaxLight', 'StarLux', 'NovaBrilho', 'LuzPro',
];

const FEATURES_LOJISTA = [
  { icon: '⚡', title: 'Geração Inteligente', sub: 'ARTE + COPY EM SEGUNDOS', desc: 'Escolha um produto do catálogo e receba arte profissional + texto pronto para publicar. Sem Photoshop, sem Canva, sem esforço.', color: '#ff6b35' },
  { icon: '🎨', title: 'Templates Prontos', sub: 'COMPOSIÇÃO AUTOMÁTICA', desc: 'Seu produto e logo são posicionados automaticamente no template. Resultado profissional que parece feito por uma agência de marketing.', color: '#a855f7' },
  { icon: '🏪', title: 'Sua Marca, Seu Conteúdo', sub: 'BRAND KIT PERSONALIZADO', desc: 'Configure suas cores, logo, Instagram e WhatsApp uma vez. Todo conteúdo gerado sai com a cara da sua loja.', color: '#06b6d4' },
  { icon: '📱', title: 'Direto pra Rede Social', sub: 'PUBLIQUE EM 1 CLIQUE', desc: 'Arte pronta no formato certo (Feed ou Story) + copy com hashtags e call-to-action. É só copiar e postar.', color: '#22c55e' },
];

const PAIN_POINTS = [
  { pain: 'Seus lojistas divulgam seus produtos com fotos ruins e textos amadores?', solution: 'No Criativo Pronto, eles geram conteúdo profissional com templates que VOCÊ controla.' },
  { pain: 'Você gasta com catálogos e material de PDV que o lojista nem usa?', solution: 'Aqui o material é digital, sempre atualizado, e o lojista USA porque é fácil.' },
  { pain: 'Não sabe se seus produtos estão sendo divulgados nos pontos de venda?', solution: 'Acompanhe em tempo real quais produtos e lojistas geram mais conteúdo.' },
];

const FEATURES_FABRICANTE = [
  { icon: '📦', title: 'Cadastre Uma Vez', sub: 'CATÁLOGO DIGITAL', desc: 'Cadastre seus produtos com fotos e descrições. Lojistas parceiros acessam tudo em um só lugar.', color: '#f59e0b' },
  { icon: '🎯', title: 'Controle da Marca', sub: 'TEMPLATES COM SUA IDENTIDADE', desc: 'Crie templates com as cores e estilo da sua marca. Todo conteúdo gerado mantém sua identidade visual.', color: '#ef4444' },
  { icon: '📊', title: 'Métricas de Impacto', sub: 'DADOS EM TEMPO REAL', desc: 'Quais produtos são mais divulgados, quais lojistas mais engajam, e o alcance real da sua marca.', color: '#8b5cf6' },
  { icon: '🚀', title: 'Marketing Multiplicado', sub: 'ESCALA SEM CUSTO', desc: 'Cada lojista é um canal de divulgação. Centenas de posts por mês sem investir em mídia.', color: '#06b6d4' },
];

const PIPELINE_STEPS = [
  { step: '01', label: 'Produto', desc: 'Escolha do catálogo', icon: '📦' },
  { step: '02', label: 'Template', desc: 'Selecione o estilo', icon: '🖼️' },
  { step: '03', label: 'Máquina', desc: 'Gera arte + copy', icon: '⚙️' },
  { step: '04', label: 'Publique', desc: 'Direto pra rede social', icon: '📱' },
];

const FAQS = [
  { q: 'Preciso saber design?', a: 'Não! A plataforma faz tudo por você. Basta escolher o produto, o template e preencher os dados. A arte é gerada automaticamente.' },
  { q: 'Posso usar minha própria logo?', a: 'Sim. No Brand Kit você sobe sua logo, define suas cores e contatos. Toda arte gerada vem com sua identidade visual.' },
  { q: 'Para quais redes sociais servem?', a: 'Geramos artes nos formatos Feed (1080×1080) e Story (1080×1920), perfeitos para Instagram, Facebook, WhatsApp Status e mais.' },
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Sem fidelidade. Você cancela quando quiser e continua usando até o fim do período pago.' },
  { q: 'Como funciona para fabricantes?', a: 'Fabricantes cadastram seus produtos e templates gratuitamente. Lojistas parceiros acessam o catálogo e geram conteúdo com a identidade visual da marca.' },
];

// ─── TIPOS ──────────────────────────────────────────────────────────────────────

type PlanRow = {
  plan_name: string;
  display_name: string | null;
  price_brl: number;
  max_factories_followed: number;
  monthly_copys: number;
  monthly_generations: number;
  template_level: string | null;
};

// ─── HELPERS ────────────────────────────────────────────────────────────────────

function planDisplayName(name: string): string {
  const map: Record<string, string> = {
    gratis: 'Grátis', basico: 'Básico', intermediario: 'Intermediário',
    premium: 'Premium', super_premium: 'Super Premium',
  };
  return map[name] ?? name;
}

function planFeatures(plan: PlanRow): string[] {
  const factories = plan.max_factories_followed >= 999999 ? 'Todas as fábricas' : `${plan.max_factories_followed} fábrica${plan.max_factories_followed !== 1 ? 's' : ''}`;
  const images = plan.monthly_generations >= 999 ? 'Artes ilimitadas' : `${plan.monthly_generations} arte${plan.monthly_generations !== 1 ? 's' : ''}/mês`;
  const copys = plan.monthly_copys >= 999 ? 'Copys ilimitados' : `${plan.monthly_copys} copy${plan.monthly_copys !== 1 ? 's' : ''}/mês`;
  const level = plan.template_level ? `Templates ${plan.template_level}` : 'Templates básicos';
  return [factories, level, images, copys];
}

// ─── COMPONENTES INTERNOS ───────────────────────────────────────────────────────

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="text-yellow-400 text-sm">★</span>
      ))}
    </div>
  );
}

function SectionTag({ text }: { text: string }) {
  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#ff6b35', letterSpacing: '0.15em', marginBottom: 16, textTransform: 'uppercase' }}>
      <span>{'// '}{text}</span>
    </div>
  );
}

function FeatCard({
  f, active, onClick,
}: { f: typeof FEATURES_LOJISTA[0]; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="p-8 rounded-2xl cursor-pointer relative overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        background: active ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
        border: active ? `1px solid ${f.color}33` : '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {active && (
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${f.color}, transparent)` }} />
      )}
      <div className="flex items-start gap-5">
        <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl" style={{ background: `${f.color}20`, border: `1px solid ${f.color}30` }}>
          {f.icon}
        </div>
        <div>
          <div className="text-base font-bold mb-1">{f.title}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.15em', color: f.color, marginBottom: 10 }}>{f.sub}</div>
          <div className="text-sm leading-relaxed" style={{ color: '#777' }}>{f.desc}</div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <button
        className="w-full flex items-center justify-between p-6 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-sm">{q}</span>
        <span className="text-gray-600 ml-4 flex-shrink-0 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>
      {open && (
        <div className="px-6 pb-6 text-sm leading-relaxed" style={{ color: '#777' }}>{a}</div>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ───────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [activeTab, setActiveTab] = useState<'lojista' | 'fabricante'>('lojista');
  const [activeFeatL, setActiveFeatL] = useState(0);
  const [activeFeatF, setActiveFeatF] = useState(0);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const fetchPlans = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('plan_limits')
        .select('plan_name, display_name, price_brl, max_factories_followed, monthly_copys, monthly_generations, template_level')
        .order('price_brl');
      if (data) setPlans(data as PlanRow[]);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', session.user.id)
          .single();
        if (profile) setCurrentPlan((profile as { plan: string }).plan);
      }
    };
    fetchPlans();
  }, []);

  const isHighlight = (name: string) => name === 'intermediario';
  const isSuperPremium = (name: string) => name === 'super_premium';

  return (
    <div
      className="min-h-screen text-white relative overflow-x-hidden"
      style={{ background: '#06060a', fontFamily: "'Outfit', 'Inter', sans-serif" }}
    >
      {/* Fontes + animações globais */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Sora:wght@300;400;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
        .font-sora { font-family: 'Sora', sans-serif; }
        .font-mono-jb { font-family: 'JetBrains Mono', monospace; }
        @keyframes float { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-40px) scale(1.1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(60px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 20px rgba(255,120,50,0.3); } 50% { box-shadow: 0 0 40px rgba(255,120,50,0.6); } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes gearSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .anim-slide-up { animation: slideUp 1s ease-out; }
        .anim-pulse-glow { animation: pulseGlow 3s ease-in-out infinite; }
        .anim-blink { animation: blink 2s infinite; }
        .anim-marquee { animation: marquee 30s linear infinite; }
        .anim-gear { animation: gearSpin 4s linear infinite; display: inline-block; }
        .text-gradient-fire { background: linear-gradient(135deg, #ff6b35, #ff8c42, #ffd700); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .glass { background: rgba(255,255,255,0.025); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); }
        .hover-lift { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #06060a; }
        ::-webkit-scrollbar-thumb { background: #ff6b35; border-radius: 3px; }
      `}</style>

      {/* Grid overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.02]">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Orbs de fundo */}
      <div className="fixed pointer-events-none" style={{ top: '-10%', left: '55%', width: 600, height: 600, borderRadius: '50%', background: '#ff6b35', filter: 'blur(120px)', opacity: 0.12, animation: 'float 8s ease-in-out infinite alternate' }} />
      <div className="fixed pointer-events-none" style={{ top: '60%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: '#7c3aed', filter: 'blur(120px)', opacity: 0.12, animation: 'float 10s ease-in-out infinite alternate', animationDelay: '2s' }} />

      {/* ═══ NAVBAR ═══════════════════════════════════════════════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrollY > 80 ? 'rgba(6,6,10,0.92)' : 'transparent',
          backdropFilter: scrollY > 80 ? 'blur(20px)' : 'none',
          borderBottom: scrollY > 80 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          padding: '14px 0',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8c42)' }}>⚡</div>
            <span className="font-sora font-extrabold text-lg">
              <span style={{ color: '#ff6b35' }}>Criativo</span> Pronto
            </span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium">
            <a href="#lojistas" className="text-gray-500 hover:text-white transition-colors">Para Lojistas</a>
            <a href="#fabricantes" className="text-gray-500 hover:text-white transition-colors">Para Fabricantes</a>
            <a href="#como-funciona" className="text-gray-500 hover:text-white transition-colors">Como funciona</a>
            <a href="#planos" className="text-gray-500 hover:text-white transition-colors">Planos</a>
            <Link href="/login" className="text-gray-300 hover:text-white transition-colors font-semibold">Entrar</Link>
            <Link
              href="/login"
              className="anim-pulse-glow px-5 py-2.5 rounded-lg font-bold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8c42)' }}
            >
              Começar grátis
            </Link>
          </div>
          <Link href="/login" className="md:hidden px-4 py-2 rounded-lg font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8c42)' }}>
            Começar grátis
          </Link>
        </div>
      </nav>

      {/* ═══ HERO ═════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Scanline effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
          <div className="w-full h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #ff6b35, transparent)', animation: 'scanline 5s linear infinite' }} />
        </div>
        <div className="relative z-10 text-center max-w-4xl px-6 anim-slide-up">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 font-mono-jb text-xs tracking-wider"
            style={{ border: '1px solid rgba(255,107,53,0.3)', background: 'rgba(255,107,53,0.08)', color: '#ff8c42' }}
          >
            <span className="w-1.5 h-1.5 rounded-full anim-blink" style={{ background: '#ff6b35' }} />
            MÁQUINA ATIVA • GERANDO CONTEÚDO
          </div>
          <h1
            className="font-sora font-extrabold leading-[1.05] tracking-tight mb-6"
            style={{ fontSize: 'clamp(36px, 6vw, 72px)', letterSpacing: '-2px' }}
          >
            Posts prontos para{' '}
            <span className="text-gradient-fire">redes sociais</span>
            <br />
            <span style={{ color: '#555', fontSize: '0.65em' }}>sem designer, sem esforço.</span>
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed max-w-xl mx-auto mb-10 font-light">
            Uma máquina inteligente que transforma catálogos de fabricantes em artes e textos profissionais. Escolha o produto, personalize com sua marca e publique direto na sua rede social.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="anim-pulse-glow px-10 py-4 rounded-xl font-bold text-base text-white"
              style={{ background: 'linear-gradient(135deg, #ff6b35, #e85d26)' }}
            >
              Sou lojista — quero criar posts →
            </Link>
            <a
              href="#fabricantes"
              className="px-9 py-4 rounded-xl font-semibold text-base text-gray-300 transition-all hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
            >
              Sou fabricante — quero cadastrar
            </a>
          </div>
          <div
            className="mt-12 inline-flex items-center gap-5 px-6 py-2.5 rounded-xl font-mono-jb text-xs"
            style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)', color: '#444' }}
          >
            <span>STATUS: <span style={{ color: '#22c55e' }}>OPERACIONAL</span></span>
            <span style={{ color: '#222' }}>│</span>
            <span>GERAÇÃO: <span style={{ color: '#ff6b35' }}>~3 SEGUNDOS</span></span>
            <span style={{ color: '#222' }}>│</span>
            <span>PLANO GRÁTIS: <span style={{ color: '#06b6d4' }}>R$ 0</span></span>
          </div>
        </div>
      </section>

      {/* ═══ MARQUEE ══════════════════════════════════════════════════════════ */}
      <section
        className="overflow-hidden py-8"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.008)' }}
      >
        <div ref={marqueeRef} className="flex whitespace-nowrap anim-marquee">
          {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((logo, i) => (
            <div key={i} className="inline-flex items-center gap-2 px-10 text-sm font-semibold font-sora" style={{ color: '#333' }}>
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs" style={{ background: 'rgba(255,255,255,0.05)', color: '#555' }}>
                {logo.charAt(0)}
              </div>
              {logo}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ STATS ════════════════════════════════════════════════════════════ */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <div key={i} className="text-center">
              <div className="font-sora font-extrabold text-gradient-fire" style={{ fontSize: 48, lineHeight: 1 }}>{s.number}</div>
              <div className="text-xs font-semibold text-gray-400 mt-2 uppercase tracking-widest">{s.label}</div>
              <div className="text-xs text-gray-600 mt-1">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ AUDIENCE TABS ════════════════════════════════════════════════════ */}
      <section className="relative px-6 pt-20 pb-8 text-center">
        <div className="max-w-7xl mx-auto">
          <SectionTag text="PARA QUEM É" />
          <h2 className="font-sora font-extrabold tracking-tight mb-9" style={{ fontSize: 'clamp(28px, 4vw, 46px)', letterSpacing: -1 }}>
            Dois lados da <span className="text-gradient-fire">mesma máquina</span>
          </h2>
          <div className="flex gap-3 justify-center">
            {(['lojista', 'fabricante'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-8 py-3 rounded-xl border font-semibold text-sm transition-all"
                style={{
                  background: activeTab === tab ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.02)',
                  border: activeTab === tab ? '1px solid rgba(255,107,53,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  color: activeTab === tab ? '#ff6b35' : '#888',
                }}
              >
                {tab === 'lojista' ? '🏪 Para Lojistas' : '🏭 Para Fabricantes'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LOJISTA SECTION ══════════════════════════════════════════════════ */}
      {activeTab === 'lojista' && (
        <section id="lojistas" className="relative px-6 pb-24">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-12">
              <h3 className="font-sora text-3xl font-extrabold">
                O que a máquina faz <span style={{ color: '#555' }}>por você</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FEATURES_LOJISTA.map((f, i) => (
                <FeatCard key={i} f={f} active={activeFeatL === i} onClick={() => setActiveFeatL(i)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ FABRICANTE SECTION ═══════════════════════════════════════════════ */}
      {activeTab === 'fabricante' && (
        <section id="fabricantes" className="relative px-6 pb-24">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-12">
              <h3 className="font-sora text-3xl font-extrabold">
                Reconhece esses <span style={{ color: '#ef4444' }}>problemas</span>?
              </h3>
            </div>
            <div className="flex flex-col gap-4 mb-16">
              {PAIN_POINTS.map((p, i) => (
                <div key={i} className="p-7 rounded-2xl hover-lift" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_40px_1fr] gap-5 items-center">
                    <div>
                      <div className="font-mono-jb text-[11px] text-red-400 tracking-widest mb-2">❌ O PROBLEMA</div>
                      <div className="text-sm text-gray-400 leading-relaxed">{p.pain}</div>
                    </div>
                    <div className="text-center text-xl hidden md:block">→</div>
                    <div>
                      <div className="font-mono-jb text-[11px] text-green-400 tracking-widest mb-2">✅ A SOLUÇÃO</div>
                      <div className="text-sm text-gray-300 leading-relaxed">{p.solution}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mb-12">
              <h3 className="font-sora text-3xl font-extrabold">
                O que você ganha <span style={{ color: '#555' }}>como fabricante</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {FEATURES_FABRICANTE.map((f, i) => (
                <FeatCard key={i} f={f} active={activeFeatF === i} onClick={() => setActiveFeatF(i)} />
              ))}
            </div>
            <div className="text-center p-11 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(239,68,68,0.04))', border: '1px solid rgba(245,158,11,0.12)' }}>
              <div className="font-sora text-2xl font-extrabold mb-3">Cadastre sua fábrica gratuitamente</div>
              <p className="text-gray-500 text-sm mb-7 max-w-lg mx-auto">Monte seu catálogo digital e deixe centenas de lojistas divulgarem seus produtos com a qualidade que sua marca merece.</p>
              <Link href="/login" className="inline-block px-9 py-3.5 rounded-xl font-bold text-base text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                Cadastrar minha fábrica →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ PIPELINE — COMO FUNCIONA ═════════════════════════════════════════ */}
      <section id="como-funciona" className="relative px-6 py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <SectionTag text="LINHA DE PRODUÇÃO" />
            <h2 className="font-sora font-extrabold tracking-tight" style={{ fontSize: 'clamp(28px, 4vw, 46px)', letterSpacing: -1 }}>
              4 etapas. <span style={{ color: '#555' }}>Conteúdo profissional.</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 relative">
            <div className="absolute hidden md:block" style={{ top: 34, left: '12%', right: '12%', height: 2, background: 'linear-gradient(90deg, #ff6b35, #a855f7, #06b6d4, #22c55e)', opacity: 0.2 }} />
            {PIPELINE_STEPS.map((p, i) => (
              <div key={i} className="relative z-10 text-center">
                <div className="w-17 h-17 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl relative" style={{ width: 68, height: 68, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {p.icon}
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-md flex items-center justify-center font-mono-jb font-extrabold text-white" style={{ fontSize: 9, background: 'linear-gradient(135deg, #ff6b35, #ff8c42)' }}>
                    {p.step}
                  </div>
                </div>
                <div className="text-base font-bold mb-1">{p.label}</div>
                <div className="text-xs text-gray-600">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═════════════════════════════════════════════════════ */}
      <section className="relative px-6 py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <SectionTag text="QUEM JÁ USA" />
            <h2 className="font-sora font-extrabold tracking-tight" style={{ fontSize: 'clamp(28px, 4vw, 46px)', letterSpacing: -1 }}>
              Resultados <span className="text-gradient-fire">reais</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="glass hover-lift rounded-2xl p-8">
                <StarRating count={t.rating} />
                <p className="text-sm text-gray-400 leading-relaxed mt-4 mb-5 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8c42)' }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-gray-600">{t.store}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ECOSSISTEMA B2B2C ════════════════════════════════════════════════ */}
      <section className="relative px-6 py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <SectionTag text="ECOSSISTEMA" />
            <h2 className="font-sora font-extrabold" style={{ fontSize: 'clamp(26px, 3.5vw, 42px)' }}>
              Fabricantes fornecem. <span style={{ color: '#555' }}>Lojistas criam. Clientes compram.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_1fr] gap-4 items-center">
            <div className="glass rounded-2xl p-8">
              <div className="text-4xl mb-3">🏭</div>
              <h3 className="text-xl font-bold mb-2">Fabricante</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">Cadastra produtos e templates. Controla a identidade visual. Recebe métricas.</p>
              {['Catálogo digital', 'Templates com sua marca', 'Métricas em tempo real', 'Cadastro gratuito'].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
                  <span style={{ color: '#f59e0b' }}>✓</span> {item}
                </div>
              ))}
            </div>
            <div className="text-center py-4">
              <div className="font-mono-jb text-[11px] text-orange-500 mb-1.5">MÁQUINA</div>
              <span className="text-3xl anim-gear">⚙️</span>
              <div className="font-mono-jb text-[10px] text-gray-700 mt-1.5">PROCESSA</div>
            </div>
            <div className="glass rounded-2xl p-8">
              <div className="text-4xl mb-3">🏪</div>
              <h3 className="text-xl font-bold mb-2">Lojista</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">Escolhe produtos, gera artes personalizadas com sua marca. Publica na rede social.</p>
              {['Artes com sua marca', 'Copys prontos pra postar', 'Personalização automática', 'Publica em 1 clique'].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
                  <span style={{ color: '#22c55e' }}>✓</span> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ══════════════════════════════════════════════════════════ */}
      <section id="planos" className="relative px-6 py-24" style={{ background: 'rgba(255,255,255,0.008)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <SectionTag text="PLANOS" />
            <h2 className="font-sora font-extrabold tracking-tight" style={{ fontSize: 'clamp(28px, 4vw, 46px)', letterSpacing: -1 }}>
              Escale sua <span className="text-gradient-fire">produção de conteúdo</span>
            </h2>
            <p className="text-gray-600 text-sm mt-3">Planos para lojistas. Fabricantes cadastram gratuitamente.</p>
          </div>

          {plans.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">
              {plans.map((plan, i) => {
                const highlight = isHighlight(plan.plan_name);
                const superP = isSuperPremium(plan.plan_name);
                const isCurrent = currentPlan === plan.plan_name;
                const features = planFeatures(plan);
                const displayName = plan.display_name ?? planDisplayName(plan.plan_name);
                const price = plan.price_brl === 0 ? 'R$ 0' : `R$ ${plan.price_brl.toFixed(2).replace('.', ',')}`;
                const cta = plan.price_brl === 0 ? 'Começar grátis' : 'Escolher plano';

                return (
                  <div
                    key={i}
                    className="rounded-2xl p-7 relative overflow-hidden flex flex-col transition-all hover:-translate-y-1"
                    style={{
                      background: highlight ? 'rgba(255,107,53,0.05)' : superP ? 'rgba(255,215,0,0.03)' : 'rgba(255,255,255,0.015)',
                      border: highlight ? '1px solid rgba(255,107,53,0.25)' : superP ? '1px solid rgba(255,215,0,0.2)' : '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    {highlight && (
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded font-mono-jb text-[9px] font-bold uppercase tracking-wider text-white" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8c42)' }}>
                        Mais popular
                      </div>
                    )}
                    {superP && (
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded font-mono-jb text-[9px] font-bold uppercase tracking-wider" style={{ background: 'rgba(255,215,0,0.12)', color: '#ffd700' }}>
                        Ilimitado
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded font-mono-jb text-[9px] font-bold uppercase tracking-wider text-green-300" style={{ background: 'rgba(34,197,94,0.15)' }}>
                        Plano atual
                      </div>
                    )}
                    <div className="text-base font-bold mb-1 mt-4">{displayName}</div>
                    <div className="flex items-baseline gap-1 mb-5">
                      <span className="font-sora font-extrabold text-3xl" style={{ color: highlight ? '#ff6b35' : superP ? '#ffd700' : '#fff' }}>
                        {price}
                      </span>
                      {plan.price_brl > 0 && <span className="text-xs text-gray-600">/mês</span>}
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                      {features.map((f, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs text-gray-500">
                          <span style={{ color: highlight ? '#ff6b35' : '#22c55e', fontSize: 13 }}>✓</span>
                          {f}
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/login"
                      className="mt-5 w-full py-2.5 rounded-xl font-bold text-xs text-center block transition-all"
                      style={{
                        background: highlight ? 'linear-gradient(135deg, #ff6b35, #e85d26)' : superP ? 'linear-gradient(135deg, #ffd700, #f59e0b)' : 'rgba(255,255,255,0.05)',
                        color: highlight || superP ? '#fff' : '#aaa',
                      }}
                    >
                      {cta}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ═══ FAQ ══════════════════════════════════════════════════════════════ */}
      <section id="faq" className="relative px-6 py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <SectionTag text="DÚVIDAS FREQUENTES" />
            <h2 className="font-sora font-extrabold tracking-tight" style={{ fontSize: 'clamp(28px, 4vw, 46px)', letterSpacing: -1 }}>
              Perguntas <span className="text-gradient-fire">frequentes</span>
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQS.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ════════════════════════════════════════════════════════ */}
      <section className="relative px-6 py-24 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="font-sora font-extrabold leading-tight mb-5" style={{ fontSize: 'clamp(26px, 4vw, 44px)' }}>
            Ligue a máquina.<br />
            <span className="text-gradient-fire">Comece a produzir conteúdo.</span>
          </h2>
          <p className="text-gray-500 text-base mb-9 leading-relaxed">
            Cadastre-se grátis e gere seu primeiro post profissional em menos de 1 minuto.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="anim-pulse-glow px-10 py-4 rounded-2xl font-bold text-base text-white"
              style={{ background: 'linear-gradient(135deg, #ff6b35, #e85d26)' }}
            >
              Sou lojista — criar conta grátis
            </Link>
            <Link
              href="/login"
              className="px-9 py-4 rounded-2xl font-semibold text-base transition-all hover:text-yellow-300"
              style={{ border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', background: 'rgba(245,158,11,0.05)' }}
            >
              Sou fabricante — cadastrar grátis
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '36px 24px 24px' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span style={{ color: '#ff6b35', fontWeight: 800 }}>⚡</span>
              <span className="font-sora font-bold text-sm text-gray-500">Criativo Pronto © {new Date().getFullYear()}</span>
            </div>
            <div className="flex gap-6 text-xs">
              <Link href="/termos" className="text-gray-600 hover:text-gray-400 transition-colors">Termos de Serviço</Link>
              <Link href="/privacidade" className="text-gray-600 hover:text-gray-400 transition-colors">Política de Privacidade</Link>
              <a href="mailto:contato@criativopronto.com.br" className="text-gray-600 hover:text-gray-400 transition-colors">Contato</a>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            <div className="font-mono-jb text-[10px] text-gray-800">
              LB SERVIÇOS DIGITAIS E ENTRETENIMENTO LTDA • CNPJ 53.664.749/0001-08
            </div>
            <div className="font-mono-jb text-[10px] text-gray-800">
              TECNOLOGIA PROPRIETÁRIA • FEITO NO BRASIL 🇧🇷
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
