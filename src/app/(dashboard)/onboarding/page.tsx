'use client';

import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Factory, Store, Check, ArrowRight, ArrowLeft,
  Loader2, Globe, Phone, FileText, Sparkles,
  CheckCircle2, Clock, AlertCircle, Target, Users,
  Megaphone, Eye, Palette, MapPin, Instagram,
  MessageSquare, Building2, ShoppingBag, Wrench,
  Package, LayoutGrid,
} from 'lucide-react';
import { FileUpload } from '@/components/ui/FileUpload';
import type { Profile, Factory as FactoryType, Sector } from '@/types/database';

// ─── helpers ──────────────────────────────────────────────────

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const BRAND_VOICE_OPTIONS = [
  { value: 'tecnico', label: 'Técnico e profissional' },
  { value: 'descontraido', label: 'Descontraído e jovem' },
  { value: 'premium', label: 'Premium e sofisticado' },
  { value: 'popular', label: 'Popular e acessível' },
  { value: 'personalizado', label: 'Personalizado' },
];

const STORE_TYPE_OPTIONS = [
  { value: 'loja_fisica', label: 'Loja Física', icon: Building2 },
  { value: 'ecommerce', label: 'E-commerce', icon: ShoppingBag },
  { value: 'oficina', label: 'Oficina / Serviço', icon: Wrench },
  { value: 'revenda', label: 'Revenda / Distribuição', icon: Package },
  { value: 'marketplace', label: 'Marketplace', icon: LayoutGrid },
];

const STORE_VOICE_OPTIONS = [
  { value: 'informal', emoji: '🗣️', label: 'Informal e direto', desc: 'Linguagem simples, próxima do cliente.' },
  { value: 'tecnico', emoji: '🔬', label: 'Técnico e detalhista', desc: 'Foco em especificações e dados.' },
  { value: 'divertido', emoji: '😄', label: 'Divertido e descontraído', desc: 'Tom leve, bem-humorado.' },
  { value: 'sofisticado', emoji: '✨', label: 'Sofisticado e premium', desc: 'Elegante, exclusivo, aspiracional.' },
  { value: 'profissional', emoji: '💼', label: 'Profissional e corporativo', desc: 'Sério, confiável, institucional.' },
];

const VOICE_PREVIEW: Record<string, string> = {
  informal: '🔥 Olha que produto incrível! Aproveita que tá em promoção e garante o seu agora!',
  tecnico: '✅ Especificações: 12V, 6000K, 70W, IP67. Vida útil de 50.000h. Ideal para uso profissional.',
  divertido: '😂 Quem disse que iluminar precisa ser chato? Esse produto vai mudar tudo! 💡',
  sofisticado: '✨ Tecnologia de ponta para quem exige o melhor. Sofisticação em cada detalhe.',
  profissional: '📋 Produto certificado, com garantia e suporte técnico especializado. Confiança total.',
};

// ─── main page ────────────────────────────────────────────────

// Wrapper com Suspense obrigatório para useSearchParams() no Next.js 15
export default function OnboardingPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    }>
      <OnboardingPage />
    </Suspense>
  );
}

function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Query param ?role=fabricante permite forçar o wizard correto
  // Útil para admin/super_admin que clicam em "Criar Fábrica"
  const forceRole = searchParams.get('role') as 'fabricante' | 'lojista' | null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (cancelled) return;

      if (data) {
        const p = data as Profile;
        if (p.onboarding_complete) { router.push('/dashboard'); return; }
        setProfile(p);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div className="animate-fade-in-up max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600/10 border border-brand-500/20 rounded-full mb-4">
          <Sparkles size={14} className="text-brand-400" />
          <span className="text-xs font-700 text-brand-400 uppercase tracking-wider">Bem-vindo</span>
        </div>
        <h1 className="font-display text-3xl font-800 tracking-tight mb-2">
          Vamos configurar sua conta
        </h1>
        <p className="text-dark-400 text-sm">
          {(forceRole === 'fabricante' || profile.role === 'fabricante')
            ? 'Configure sua fábrica para começar a disponibilizar produtos.'
            : 'Configure sua loja e siga fábricas para criar posts.'}
        </p>
      </div>

      {/* Role badge */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2 px-4 py-2 bg-dark-900/80 border border-dark-800/50 rounded-full">
          {(forceRole === 'fabricante' || profile.role === 'fabricante') ? (
            <>
              <Factory size={14} className="text-blue-400" />
              <span className="text-xs font-700 text-blue-400 uppercase tracking-wider">Fabricante</span>
            </>
          ) : (
            <>
              <Store size={14} className="text-brand-400" />
              <span className="text-xs font-700 text-brand-400 uppercase tracking-wider">Lojista</span>
            </>
          )}
        </div>
      </div>

      {/* Usar forceRole se presente (ex: admin testando jornada de fabricante),
           senão usar o role real do perfil */}
      {(forceRole === 'fabricante' || profile.role === 'fabricante') ? (
        <FabricanteWizard supabase={supabase} router={router} userId={profile.id} />
      ) : (
        <LojistaWizard supabase={supabase} router={router} userId={profile.id} />
      )}
    </div>
  );
}

// ─── step indicator ───────────────────────────────────────────

function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-700 transition-all ${
              i < current ? 'bg-brand-600 text-white' :
              i === current ? 'bg-brand-600/20 border-2 border-brand-500 text-brand-400' :
              'bg-dark-800 text-dark-500'
            }`}>
              {i < current ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-[10px] mt-1 font-600 ${i === current ? 'text-brand-400' : 'text-dark-500'}`}>
              {labels[i]}
            </span>
          </div>
          {i < total - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${i < current ? 'bg-brand-600' : 'bg-dark-800'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  FABRICANTE WIZARD (4 steps)
// ═══════════════════════════════════════════════════════════════

interface FabricanteData {
  // Step 1
  name: string;
  logoUrl: string;
  sectorId: string;
  // Step 2
  description: string;
  website: string;
  whatsapp: string;
  // Step 3
  niche: string;
  brandDifferentials: string;
  brandVoice: string;
  brandVoiceCustom: string;
  targetAudience: string;
}

function FabricanteWizard({
  supabase, router, userId,
}: {
  supabase: ReturnType<typeof createClient>;
  router: ReturnType<typeof import('next/navigation').useRouter>;
  userId: string;
}) {
  const [step, setStep] = useState(0);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<FabricanteData>({
    name: '', logoUrl: '', sectorId: '',
    description: '', website: '', whatsapp: '',
    niche: '', brandDifferentials: '', brandVoice: 'tecnico',
    brandVoiceCustom: '', targetAudience: '',
  });

  const set = (k: keyof FabricanteData, v: string) =>
    setData((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    supabase.from('sectors').select('*').order('name').then(({ data: s }) => {
      if (s) setSectors(s as Sector[]);
    });
  }, [supabase]);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Sessão expirada.'); return; }

      const { error: factoryError } = await supabase.from('factories').insert({
        name: data.name.trim(),
        user_id: userId,
        sector_id: data.sectorId || null,
        logo_url: data.logoUrl || null,
        description: data.description.trim() || null,
        website: data.website.trim() || null,
        whatsapp: data.whatsapp.trim() || null,
        niche: data.niche.trim() || null,
        brand_differentials: data.brandDifferentials.trim() || null,
        brand_voice: data.brandVoice === 'personalizado' ? data.brandVoiceCustom.trim() : data.brandVoice,
        target_audience: data.targetAudience.trim() || null,
        active: true,
      });
      if (factoryError) throw factoryError;

      await supabase.from('profiles')
        .update({ onboarding_complete: true, updated_at: new Date().toISOString() })
        .eq('id', userId);

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar fábrica.');
      setSaving(false);
    }
  };

  const STEP_LABELS = ['Identidade', 'Sobre', 'Marca', 'Revisão'];

  const canNext = [
    () => data.name.trim().length > 0,
    () => true,
    () => data.niche.trim().length > 0,
    () => true,
  ];

  return (
    <div className="bg-dark-900/60 border border-dark-800/40 rounded-3xl p-6 sm:p-8">
      <StepIndicator current={step} total={4} labels={STEP_LABELS} />

      {/* ── STEP 0: Identidade ── */}
      {step === 0 && (
        <div className="space-y-5">
          <h2 className="font-display text-lg font-800 flex items-center gap-2">
            <Factory size={20} className="text-blue-400" />
            Identidade da Fábrica
          </h2>

          <div>
            <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">Nome da Fábrica *</label>
            <input
              type="text"
              required
              value={data.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ex: ASX Iluminação"
              className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
            />
          </div>

          <FileUpload
            type="logo"
            currentUrl={data.logoUrl || null}
            onUploadComplete={(url) => set('logoUrl', url)}
            onError={(msg) => setError(msg)}
          />

          <div>
            <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">Setor</label>
            <select
              value={data.sectorId}
              onChange={(e) => set('sectorId', e.target.value)}
              className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white focus:outline-none focus:border-brand-500/50 transition-all text-sm"
            >
              <option value="">Selecione um setor...</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── STEP 1: Sobre ── */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="font-display text-lg font-800 flex items-center gap-2">
            <FileText size={20} className="text-blue-400" />
            Sobre a Empresa
          </h2>

          <div>
            <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">Descrição</label>
            <textarea
              value={data.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Breve descrição da sua fábrica e produtos..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm resize-none"
            />
            <p className="text-xs text-dark-500 mt-1 text-right">{data.description.length}/500</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">
                <Globe size={12} className="inline mr-1" />Website
              </label>
              <input
                type="url"
                value={data.website}
                onChange={(e) => set('website', e.target.value)}
                placeholder="https://suafabrica.com"
                className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">
                <Phone size={12} className="inline mr-1" />WhatsApp
              </label>
              <input
                type="tel"
                value={data.whatsapp}
                onChange={(e) => set('whatsapp', e.target.value)}
                placeholder="+55 11 99999-9999"
                className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Marca ── */}
      {step === 2 && (
        <div className="space-y-5">
          <h2 className="font-display text-lg font-800 flex items-center gap-2">
            <Target size={20} className="text-blue-400" />
            Marca e Posicionamento
            <span className="text-xs text-brand-400 font-600 bg-brand-600/10 px-2 py-0.5 rounded-full">Crítico para a IA</span>
          </h2>

          <div>
            <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">Nicho de Mercado *</label>
            <input
              type="text"
              value={data.niche}
              onChange={(e) => set('niche', e.target.value)}
              placeholder="Ex: Iluminação automotiva LED"
              className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">Diferenciais da Marca</label>
            <textarea
              value={data.brandDifferentials}
              onChange={(e) => set('brandDifferentials', e.target.value)}
              placeholder="Ex: Alta durabilidade, tecnologia alemã, 3 anos de garantia"
              rows={3}
              className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">
              <Megaphone size={12} className="inline mr-1" />Tom da Comunicação (Brand Voice)
            </label>
            <select
              value={data.brandVoice}
              onChange={(e) => set('brandVoice', e.target.value)}
              className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white focus:outline-none focus:border-brand-500/50 transition-all text-sm"
            >
              {BRAND_VOICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {data.brandVoice === 'personalizado' && (
              <input
                type="text"
                value={data.brandVoiceCustom}
                onChange={(e) => set('brandVoiceCustom', e.target.value)}
                placeholder="Descreva o tom da sua marca..."
                className="mt-2 w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">
              <Users size={12} className="inline mr-1" />Público-Alvo
            </label>
            <textarea
              value={data.targetAudience}
              onChange={(e) => set('targetAudience', e.target.value)}
              placeholder="Ex: Lojistas de autopeças, oficinas mecânicas, revendedores"
              rows={2}
              className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm resize-none"
            />
          </div>
        </div>
      )}

      {/* ── STEP 3: Revisão ── */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-800 flex items-center gap-2">
            <Eye size={20} className="text-blue-400" />
            Revisão Final
          </h2>

          <div className="space-y-3">
            {[
              { title: 'Identidade', step: 0, items: [
                ['Nome', data.name],
                ['Setor', sectors.find((s) => s.id === data.sectorId)?.name || '—'],
                ['Logo', data.logoUrl ? '✅ Enviado' : '—'],
              ]},
              { title: 'Sobre', step: 1, items: [
                ['Descrição', data.description || '—'],
                ['Website', data.website || '—'],
                ['WhatsApp', data.whatsapp || '—'],
              ]},
              { title: 'Marca', step: 2, items: [
                ['Nicho', data.niche || '—'],
                ['Diferenciais', data.brandDifferentials || '—'],
                ['Brand Voice', data.brandVoice === 'personalizado' ? data.brandVoiceCustom : (BRAND_VOICE_OPTIONS.find((o) => o.value === data.brandVoice)?.label || '—')],
                ['Público-Alvo', data.targetAudience || '—'],
              ]},
            ].map((section) => (
              <div key={section.title} className="bg-dark-950/50 border border-dark-800/40 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-700 text-dark-400 uppercase tracking-wider">{section.title}</h3>
                  <button
                    type="button"
                    onClick={() => setStep(section.step)}
                    className="text-xs text-brand-400 hover:text-brand-300 font-600"
                  >
                    Editar
                  </button>
                </div>
                <div className="space-y-1.5">
                  {section.items.map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-sm">
                      <span className="text-dark-500 min-w-[100px]">{k}:</span>
                      <span className="text-white break-all">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-2 px-5 py-2.5 bg-dark-800 hover:bg-dark-700 text-white font-600 rounded-xl transition-all text-sm"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        ) : <div />}

        {step < 3 ? (
          <button
            type="button"
            onClick={() => { if (canNext[step]()) setStep((s) => s + 1); else setError('Preencha os campos obrigatórios.'); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-700 rounded-xl transition-all text-sm"
          >
            Próximo
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-700 rounded-xl transition-all disabled:opacity-50 text-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Criar Fábrica
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  LOJISTA WIZARD (4 steps)
// ═══════════════════════════════════════════════════════════════

interface LojistaData {
  // Step 1
  storeName: string;
  storeType: string;
  locationCity: string;
  locationState: string;
  // Step 2
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  instagram: string;
  whatsapp: string;
  // Step 3
  storeVoice: string;
}

interface FactoryWithFollowInfo extends FactoryType {
  follow_status: 'pending' | 'approved' | 'rejected' | null;
}

function LojistaWizard({
  supabase, router, userId,
}: {
  supabase: ReturnType<typeof createClient>;
  router: ReturnType<typeof import('next/navigation').useRouter>;
  userId: string;
}) {
  const [step, setStep] = useState(0);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [factories, setFactories] = useState<FactoryWithFollowInfo[]>([]);
  const [expandedSector, setExpandedSector] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<LojistaData>({
    storeName: '', storeType: '', locationCity: '', locationState: '',
    logoUrl: '', primaryColor: '#e85d75', secondaryColor: '#ffffff',
    instagram: '', whatsapp: '',
    storeVoice: 'informal',
  });

  const set = (k: keyof LojistaData, v: string) =>
    setData((prev) => ({ ...prev, [k]: v }));

  const hasFollowed = factories.some((f) => f.follow_status === 'pending' || f.follow_status === 'approved');

  // Load sectors + factories
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      const [{ data: sec }, { data: fac }, { data: follows }] = await Promise.all([
        supabase.from('sectors').select('*').order('name'),
        supabase.from('factories').select('*, sectors(id, name, slug, icon_svg)').eq('active', true).order('name'),
        supabase.from('factory_followers').select('factory_id, status').eq('lojista_id', userId),
      ]);

      if (cancelled) return;
      if (sec) setSectors(sec as Sector[]);

      const followMap = new Map<string, 'pending' | 'approved' | 'rejected'>();
      if (follows) follows.forEach((f: { factory_id: string; status: string }) => followMap.set(f.factory_id, f.status as 'pending' | 'approved' | 'rejected'));

      if (fac) setFactories((fac as FactoryType[]).map((f) => ({ ...f, follow_status: followMap.get(f.id) || null })));
    })();
    return () => { cancelled = true; };
  }, [supabase, userId]);

  const handleFollow = async (factoryId: string) => {
    setActionLoading(factoryId);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Sessão expirada.'); return; }

      const { error: fnErr } = await supabase.functions.invoke('manage-followers', {
        body: { action: 'follow', factory_id: factoryId },
      });
      if (fnErr) throw fnErr;

      setFactories((prev) => prev.map((f) => f.id === factoryId ? { ...f, follow_status: 'pending' } : f));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar acesso.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Sessão expirada.'); return; }

      // Update profile
      await supabase.from('profiles').update({
        store_type: data.storeType || null,
        location_city: data.locationCity.trim() || null,
        location_state: data.locationState || null,
        store_voice: data.storeVoice,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);

      // Upsert brand kit
      const { data: existing } = await supabase.from('brand_kits').select('id').eq('user_id', userId).single();
      if (existing?.id) {
        await supabase.from('brand_kits').update({
          store_name: data.storeName.trim() || null,
          logo_url: data.logoUrl || null,
          primary_color: data.primaryColor,
          secondary_color: data.secondaryColor,
          instagram_handle: data.instagram.replace('@', '').trim() || null,
          whatsapp: data.whatsapp.trim() || null,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await supabase.from('brand_kits').insert({
          user_id: userId,
          store_name: data.storeName.trim() || null,
          logo_url: data.logoUrl || null,
          primary_color: data.primaryColor,
          secondary_color: data.secondaryColor,
          instagram_handle: data.instagram.replace('@', '').trim() || null,
          whatsapp: data.whatsapp.trim() || null,
        });
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao concluir onboarding.');
      setSaving(false);
    }
  };

  const STEP_LABELS = ['Sua Loja', 'Brand Kit', 'Estilo', 'Fábricas'];

  const canNext = [
    () => data.storeName.trim().length > 0,
    () => true,
    () => true,
    () => hasFollowed,
  ];

  return (
    <div className="bg-dark-900/60 border border-dark-800/40 rounded-3xl p-6 sm:p-8">
      <StepIndicator current={step} total={4} labels={STEP_LABELS} />

      {/* ── STEP 0: Sua Loja ── */}
      {step === 0 && (
        <div className="space-y-5">
          <h2 className="font-display text-lg font-800 flex items-center gap-2">
            <Store size={20} className="text-brand-400" />
            Sua Loja
          </h2>

          <div>
            <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">Nome da Loja *</label>
            <input
              type="text"
              value={data.storeName}
              onChange={(e) => set('storeName', e.target.value)}
              placeholder="Ex: JLEDS Autopeças"
              className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">Tipo de Loja</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STORE_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('storeType', opt.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-600 transition-all ${
                      data.storeType === opt.value
                        ? 'bg-brand-600/20 border-brand-500/50 text-brand-400'
                        : 'bg-dark-950/50 border-dark-800/50 text-dark-400 hover:border-dark-700'
                    }`}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">
                <MapPin size={12} className="inline mr-1" />Cidade
              </label>
              <input
                type="text"
                value={data.locationCity}
                onChange={(e) => set('locationCity', e.target.value)}
                placeholder="Ex: Fortaleza"
                className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">Estado (UF)</label>
              <select
                value={data.locationState}
                onChange={(e) => set('locationState', e.target.value)}
                className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white focus:outline-none focus:border-brand-500/50 transition-all text-sm"
              >
                <option value="">Selecione...</option>
                {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 1: Brand Kit ── */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="font-display text-lg font-800 flex items-center gap-2">
            <Palette size={20} className="text-brand-400" />
            Brand Kit
          </h2>

          <FileUpload
            type="brand-logo"
            currentUrl={data.logoUrl || null}
            onUploadComplete={(url) => set('logoUrl', url)}
            onError={(msg) => setError(msg)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">Cor Primária</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={data.primaryColor}
                  onChange={(e) => set('primaryColor', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-dark-800/50 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={data.primaryColor}
                  onChange={(e) => set('primaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">Cor Secundária</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={data.secondaryColor}
                  onChange={(e) => set('secondaryColor', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-dark-800/50 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={data.secondaryColor}
                  onChange={(e) => set('secondaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">
                <Instagram size={12} className="inline mr-1" />Instagram
              </label>
              <input
                type="text"
                value={data.instagram}
                onChange={(e) => set('instagram', e.target.value)}
                placeholder="@sujaloja"
                className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">
                <Phone size={12} className="inline mr-1" />WhatsApp
              </label>
              <input
                type="tel"
                value={data.whatsapp}
                onChange={(e) => set('whatsapp', e.target.value)}
                placeholder="+55 11 99999-9999"
                className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
              />
            </div>
          </div>

          {/* Preview mini */}
          <div className="bg-dark-950/50 border border-dark-800/40 rounded-2xl p-4">
            <p className="text-xs text-dark-400 font-700 uppercase tracking-wider mb-3">Preview das Cores</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl" style={{ backgroundColor: data.primaryColor }} />
              <div className="w-12 h-12 rounded-xl border border-dark-700" style={{ backgroundColor: data.secondaryColor }} />
              <div className="text-sm">
                <p className="font-700" style={{ color: data.primaryColor }}>{data.storeName || 'Sua Loja'}</p>
                <p className="text-dark-400 text-xs">Cores da marca</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Estilo ── */}
      {step === 2 && (
        <div className="space-y-5">
          <h2 className="font-display text-lg font-800 flex items-center gap-2">
            <MessageSquare size={20} className="text-brand-400" />
            Seu Estilo de Comunicação
          </h2>
          <p className="text-dark-400 text-sm">Como você fala com seus clientes?</p>

          <div className="space-y-2">
            {STORE_VOICE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('storeVoice', opt.value)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                  data.storeVoice === opt.value
                    ? 'bg-brand-600/20 border-brand-500/50'
                    : 'bg-dark-950/50 border-dark-800/50 hover:border-dark-700'
                }`}
              >
                <span className="text-xl mt-0.5">{opt.emoji}</span>
                <div>
                  <p className={`text-sm font-700 ${data.storeVoice === opt.value ? 'text-brand-400' : 'text-white'}`}>{opt.label}</p>
                  <p className="text-xs text-dark-400">{opt.desc}</p>
                </div>
                {data.storeVoice === opt.value && <Check size={16} className="ml-auto text-brand-400 mt-1 shrink-0" />}
              </button>
            ))}
          </div>

          {/* Preview */}
          {data.storeVoice && (
            <div className="bg-brand-600/5 border border-brand-500/20 rounded-2xl p-4">
              <p className="text-xs text-brand-400 font-700 uppercase tracking-wider mb-2">Preview de Legenda</p>
              <p className="text-sm text-white">{VOICE_PREVIEW[data.storeVoice]}</p>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Fábricas ── */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-800 flex items-center gap-2">
            <Factory size={20} className="text-brand-400" />
            Escolher Fábricas
          </h2>
          <p className="text-dark-400 text-sm">Solicite acesso a pelo menos 1 fábrica para começar.</p>

          {!hasFollowed && (
            <div className="flex items-center gap-2 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm">
              <AlertCircle size={16} />
              Solicite acesso a pelo menos 1 fábrica para continuar.
            </div>
          )}

          <div className="space-y-2">
            {sectors.map((sector) => {
              const sectorFactories = factories.filter((f) => (f as FactoryType & { sectors?: { id: string } }).sectors?.id === sector.id || (f as FactoryType).sector_id === sector.id);
              if (sectorFactories.length === 0) return null;

              return (
                <div key={sector.id} className="bg-dark-950/50 border border-dark-800/40 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedSector(expandedSector === sector.id ? null : sector.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-800/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {sector.icon_svg ? (
                        <span className="text-lg" dangerouslySetInnerHTML={{ __html: sector.icon_svg }} />
                      ) : (
                        <Factory size={16} className="text-dark-400" />
                      )}
                      <span className="text-sm font-700 text-white">{sector.name}</span>
                      <span className="text-xs text-dark-500">{sectorFactories.length} fábrica{sectorFactories.length !== 1 ? 's' : ''}</span>
                    </div>
                    <ArrowRight size={14} className={`text-dark-500 transition-transform ${expandedSector === sector.id ? 'rotate-90' : ''}`} />
                  </button>

                  {expandedSector === sector.id && (
                    <div className="border-t border-dark-800/40 p-3 space-y-2">
                      {sectorFactories.map((factory) => (
                        <div key={factory.id} className="flex items-center gap-3 p-3 bg-dark-900/60 rounded-xl">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 p-1">
                            {factory.logo_url ? (
                              <img src={factory.logo_url} alt={factory.name} className="w-full h-full object-contain rounded-full" />
                            ) : (
                              <Factory size={16} className="text-dark-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-700 text-white truncate">{factory.name}</p>
                          </div>
                          {factory.follow_status === null && (
                            <button
                              type="button"
                              onClick={() => handleFollow(factory.id)}
                              disabled={actionLoading === factory.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-700 rounded-lg transition-all disabled:opacity-50 shrink-0"
                            >
                              {actionLoading === factory.id ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                              Solicitar
                            </button>
                          )}
                          {factory.follow_status === 'pending' && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-700 rounded-lg shrink-0">
                              <Clock size={12} />
                              Pendente
                            </span>
                          )}
                          {factory.follow_status === 'approved' && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-700 rounded-lg shrink-0">
                              <CheckCircle2 size={12} />
                              Aprovado
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-2 px-5 py-2.5 bg-dark-800 hover:bg-dark-700 text-white font-600 rounded-xl transition-all text-sm"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        ) : <div />}

        {step < 3 ? (
          <button
            type="button"
            onClick={() => {
              if (canNext[step]()) { setError(null); setStep((s) => s + 1); }
              else setError('Preencha os campos obrigatórios.');
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-700 rounded-xl transition-all text-sm"
          >
            Próximo
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleComplete}
            disabled={saving || !hasFollowed}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-700 rounded-xl transition-all disabled:opacity-50 text-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Concluir
          </button>
        )}
      </div>
    </div>
  );
}
