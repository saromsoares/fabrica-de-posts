'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import {
  Plus, Pencil, Trash2, X, AlertCircle, Factory,
  ChevronRight, ChevronLeft, Check, Globe, Phone, Sparkles,
  Users, Target, Megaphone, Building2
} from 'lucide-react';
import { FileUpload } from '@/components/ui/FileUpload';
import { extractError } from '@/lib/utils';

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */

interface Sector {
  id: string;
  name: string;
  slug: string;
  icon_svg: string | null;
}

interface FactoryRow {
  id: string;
  name: string;
  logo_url: string | null;
  active: boolean;
  sector_id: string | null;
  description: string | null;
  website: string | null;
  whatsapp: string | null;
  niche: string | null;
  brand_differentials: string | null;
  brand_voice: string | null;
  target_audience: string | null;
  created_at: string;
  sectors?: { id: string; name: string } | null;
}

interface FactoryForm {
  // Step 1
  name: string;
  sector_id: string;
  active: boolean;
  // Step 2
  description: string;
  website: string;
  whatsapp: string;
  // Step 3
  niche: string;
  brand_differentials: string;
  brand_voice: string;
  brand_voice_custom: string;
  target_audience: string;
}

const emptyForm: FactoryForm = {
  name: '', sector_id: '', active: true,
  description: '', website: '', whatsapp: '',
  niche: '', brand_differentials: '', brand_voice: '', brand_voice_custom: '', target_audience: '',
};

const BRAND_VOICE_OPTIONS = [
  { value: 'tecnico', label: 'Técnico e profissional' },
  { value: 'descontraido', label: 'Descontraído e jovem' },
  { value: 'premium', label: 'Premium e sofisticado' },
  { value: 'popular', label: 'Popular e acessível' },
  { value: 'outro', label: 'Outro' },
];

/* ═══════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════ */

export default function AdminFabricasPage() {
  const supabase = createClient();

  const [factories, setFactories] = useState<FactoryRow[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FactoryForm>(emptyForm);
  const [logoUploadedUrl, setLogoUploadedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  /* ─── Fetch ─── */
  const fetchData = useCallback(async () => {
    try {
      const [{ data: facs }, { data: secs }] = await Promise.all([
        supabase
          .from('factories')
          .select('id, name, logo_url, active, sector_id, description, website, whatsapp, niche, brand_differentials, brand_voice, target_audience, created_at, sectors(id, name)')
          .order('name'),
        supabase.from('sectors').select('id, name, slug, icon_svg').order('name'),
      ]);
      setFactories((facs || []) as FactoryRow[]);
      setSectors((secs || []) as Sector[]);
    } catch (err) {
      setError(`Erro ao carregar: ${extractError(err)}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      await fetchData();
    }
    run();
    return () => { cancelled = true; };
  }, [fetchData, supabase]);

  /* ─── Helpers ─── */
  const clearMessages = () => { setError(null); setSuccess(null); };

  // handleLogoChange removido — substituído por FileUpload component

  const handleEdit = (factory: FactoryRow) => {
    clearMessages();
    setEditingId(factory.id);
    setForm({
      name: factory.name,
      sector_id: factory.sector_id || '',
      active: !!factory.active,
      description: factory.description || '',
      website: factory.website || '',
      whatsapp: factory.whatsapp || '',
      niche: factory.niche || '',
      brand_differentials: factory.brand_differentials || '',
      brand_voice: BRAND_VOICE_OPTIONS.find(o => o.value === factory.brand_voice) ? factory.brand_voice || '' : factory.brand_voice ? 'outro' : '',
      brand_voice_custom: BRAND_VOICE_OPTIONS.find(o => o.value === factory.brand_voice) ? '' : factory.brand_voice || '',
      target_audience: factory.target_audience || '',
    });
    setLogoUploadedUrl(factory.logo_url || null);
    setStep(1);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setLogoUploadedUrl(null);
    setStep(1);
    clearMessages();
  };

  /* ─── Validação por step ─── */
  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!form.name.trim()) return 'O nome da fábrica é obrigatório.';
      if (!form.sector_id) return 'Selecione o setor da fábrica.';
    }
    if (s === 3) {
      // Opcional — sem obrigatórios
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    clearMessages();
    setStep(s => s + 1);
  };

  // uploadLogo removido — FileUpload component faz o upload diretamente

  /* ─── Save ─── */
  const handleSave = async () => {
    clearMessages();
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Sessão expirada. Faça login novamente.'); setSaving(false); return; }

      const logoUrl = logoUploadedUrl;
      const brandVoiceFinal = form.brand_voice === 'outro' ? form.brand_voice_custom : form.brand_voice;

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        active: form.active,
        sector_id: form.sector_id || null,
        description: form.description.trim() || null,
        website: form.website.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        niche: form.niche.trim() || null,
        brand_differentials: form.brand_differentials.trim() || null,
        brand_voice: brandVoiceFinal || null,
        target_audience: form.target_audience.trim() || null,
        ...(logoUrl && { logo_url: logoUrl }),
      };

      if (editingId) {
        const { error: updateErr } = await supabase.from('factories').update(payload).eq('id', editingId);
        if (updateErr) throw new Error(updateErr.message);
        setSuccess('Fábrica atualizada com sucesso!');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error: insertErr } = await supabase.from('factories').insert({ ...payload, user_id: user?.id });
        if (insertErr) throw new Error(insertErr.message);
        setSuccess('Fábrica criada com sucesso!');
      }

      handleCloseForm();
      fetchData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    clearMessages();
    if (!confirm(`Excluir a fábrica "${name}"? Produtos vinculados ficarão sem fábrica.`)) return;
    try {
      const { error: delErr } = await supabase.from('factories').delete().eq('id', id);
      if (delErr) throw new Error(delErr.message);
      setSuccess('Fábrica excluída.');
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err) {
      setError(`Erro ao excluir: ${extractError(err)}`);
    }
  };

  /* ─── Styles ─── */
  const inputClass = 'w-full px-4 py-2.5 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/15 transition-all text-sm';
  const textareaClass = `${inputClass} resize-none`;

  /* ─── Step labels ─── */
  const STEPS = ['Identidade', 'Sobre', 'Marca & IA', 'Revisão'];

  /* ─── Render ─── */
  return (
    <div className="animate-fade-in-up">
      {/* Toast */}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-emerald-600 text-white text-sm font-500 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in-up">
          ✅ {success}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-800">Fábricas</h1>
        <button
          onClick={() => { clearMessages(); setForm(emptyForm); setEditingId(null); setLogoUploadedUrl(null); setStep(1); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-600 rounded-xl transition-all"
        >
          <Plus size={16} /> Nova fábrica
        </button>
      </div>

      {error && !showForm && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400">
          <AlertCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* ═══ MODAL WIZARD ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={handleCloseForm}>
          <div
            className="bg-dark-950 border border-dark-800/50 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-dark-800/50">
              <div>
                <h2 className="font-display font-700 text-lg">{editingId ? 'Editar fábrica' : 'Nova fábrica'}</h2>
                <p className="text-white/40 text-xs mt-0.5">Passo {step} de {STEPS.length} — {STEPS[step - 1]}</p>
              </div>
              <button onClick={handleCloseForm} className="p-1.5 rounded-lg hover:bg-dark-800/60 transition-colors" aria-label="Fechar">
                <X size={20} className="text-dark-400" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1 px-6 pt-4">
              {STEPS.map((label, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`h-1.5 w-full rounded-full transition-all ${i + 1 <= step ? 'bg-brand-500' : 'bg-dark-700/40'}`} />
                  <span className={`text-[10px] font-500 ${i + 1 === step ? 'text-brand-400' : 'text-dark-500'}`}>{label}</span>
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="mx-6 mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400">
                <AlertCircle size={16} className="flex-shrink-0" /> {error}
              </div>
            )}

            {/* ─── STEP 1: Identidade ─── */}
            {step === 1 && (
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-500 text-white/70 mb-1.5">Nome da Fábrica *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass}
                    placeholder="Ex: ASX, Philips, Osram..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-500 text-white/70 mb-1.5">Setor *</label>
                  <select
                    value={form.sector_id}
                    onChange={(e) => setForm({ ...form, sector_id: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Selecione o setor...</option>
                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-500 text-white/70 mb-1.5">Logo da Fábrica</label>
                  <FileUpload
                    type="logo"
                    currentUrl={logoUploadedUrl}
                    onUploadComplete={(url) => { setLogoUploadedUrl(url); }}
                    onError={(msg) => setError(msg)}
                  />
                </div>

                <label className="flex items-center gap-2.5 text-sm text-white/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-4 h-4 rounded border-dark-600/40 bg-dark-950 text-brand-500 focus:ring-brand-500/20"
                  />
                  Fábrica ativa (visível para lojistas)
                </label>
              </div>
            )}

            {/* ─── STEP 2: Sobre a Empresa ─── */}
            {step === 2 && (
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-500 text-white/70 mb-1.5">Descrição</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className={textareaClass}
                    rows={4}
                    maxLength={500}
                    placeholder="Descreva brevemente a empresa, seus produtos e diferenciais..."
                  />
                  <p className="text-[11px] text-white/30 mt-1">{form.description.length}/500 caracteres</p>
                </div>

                <div>
                  <label className="block text-sm font-500 text-white/70 mb-1.5 flex items-center gap-1.5">
                    <Globe size={14} /> Website
                  </label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className={inputClass}
                    placeholder="https://www.suaempresa.com.br"
                  />
                </div>

                <div>
                  <label className="block text-sm font-500 text-white/70 mb-1.5 flex items-center gap-1.5">
                    <Phone size={14} /> WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    className={inputClass}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            )}

            {/* ─── STEP 3: Marca & IA ─── */}
            {step === 3 && (
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-2 p-3 bg-brand-600/10 border border-brand-500/20 rounded-xl">
                  <Sparkles size={16} className="text-brand-400 flex-shrink-0" />
                  <p className="text-xs text-white/60">Estes dados são usados pela IA para gerar posts personalizados para os lojistas.</p>
                </div>

                <div>
                  <label className="block text-sm font-500 text-white/70 mb-1.5 flex items-center gap-1.5">
                    <Target size={14} /> Nicho de mercado
                  </label>
                  <input
                    type="text"
                    value={form.niche}
                    onChange={(e) => setForm({ ...form, niche: e.target.value })}
                    className={inputClass}
                    placeholder="Ex: Iluminação automotiva LED"
                  />
                </div>

                <div>
                  <label className="block text-sm font-500 text-white/70 mb-1.5 flex items-center gap-1.5">
                    <Building2 size={14} /> Diferenciais da marca
                  </label>
                  <textarea
                    value={form.brand_differentials}
                    onChange={(e) => setForm({ ...form, brand_differentials: e.target.value })}
                    className={textareaClass}
                    rows={3}
                    placeholder="Ex: Alta durabilidade, tecnologia alemã, 3 anos de garantia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-500 text-white/70 mb-1.5 flex items-center gap-1.5">
                    <Megaphone size={14} /> Tom da comunicação
                  </label>
                  <select
                    value={form.brand_voice}
                    onChange={(e) => setForm({ ...form, brand_voice: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Selecione o tom...</option>
                    {BRAND_VOICE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {form.brand_voice === 'outro' && (
                    <input
                      type="text"
                      value={form.brand_voice_custom}
                      onChange={(e) => setForm({ ...form, brand_voice_custom: e.target.value })}
                      className={`${inputClass} mt-2`}
                      placeholder="Descreva o tom de comunicação..."
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-500 text-white/70 mb-1.5 flex items-center gap-1.5">
                    <Users size={14} /> Público-alvo
                  </label>
                  <textarea
                    value={form.target_audience}
                    onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                    className={textareaClass}
                    rows={3}
                    placeholder="Ex: Lojistas de autopeças, oficinas mecânicas, distribuidores"
                  />
                </div>
              </div>
            )}

            {/* ─── STEP 4: Revisão ─── */}
            {step === 4 && (
              <div className="p-6 space-y-4">
                <p className="text-white/50 text-sm">Revise os dados antes de {editingId ? 'atualizar' : 'criar'} a fábrica.</p>

                {/* Card resumo */}
                <div className="bg-dark-900/40 border border-dark-800/40 rounded-2xl p-5 space-y-4">
                  {/* Logo + nome */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 p-1.5">
                      {logoUploadedUrl ? (
                        <img src={logoUploadedUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Factory size={24} className="text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-700 text-white">{form.name}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {sectors.find(s => s.id === form.sector_id)?.name || 'Setor não selecionado'}
                        {' · '}
                        <span className={form.active ? 'text-emerald-400' : 'text-white/30'}>
                          {form.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {form.description && (
                      <div className="col-span-2">
                        <p className="text-white/40 text-xs mb-0.5">Descrição</p>
                        <p className="text-white/80">{form.description}</p>
                      </div>
                    )}
                    {form.website && (
                      <div>
                        <p className="text-white/40 text-xs mb-0.5">Website</p>
                        <p className="text-white/80 truncate">{form.website}</p>
                      </div>
                    )}
                    {form.whatsapp && (
                      <div>
                        <p className="text-white/40 text-xs mb-0.5">WhatsApp</p>
                        <p className="text-white/80">{form.whatsapp}</p>
                      </div>
                    )}
                    {form.niche && (
                      <div>
                        <p className="text-white/40 text-xs mb-0.5">Nicho</p>
                        <p className="text-white/80">{form.niche}</p>
                      </div>
                    )}
                    {form.brand_voice && (
                      <div>
                        <p className="text-white/40 text-xs mb-0.5">Tom de comunicação</p>
                        <p className="text-white/80">
                          {form.brand_voice === 'outro' ? form.brand_voice_custom : BRAND_VOICE_OPTIONS.find(o => o.value === form.brand_voice)?.label}
                        </p>
                      </div>
                    )}
                    {form.brand_differentials && (
                      <div className="col-span-2">
                        <p className="text-white/40 text-xs mb-0.5">Diferenciais</p>
                        <p className="text-white/80">{form.brand_differentials}</p>
                      </div>
                    )}
                    {form.target_audience && (
                      <div className="col-span-2">
                        <p className="text-white/40 text-xs mb-0.5">Público-alvo</p>
                        <p className="text-white/80">{form.target_audience}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Footer navigation ─── */}
            <div className="flex items-center justify-between p-6 border-t border-dark-800/50">
              <button
                onClick={() => { clearMessages(); setStep(s => s - 1); }}
                disabled={step === 1}
                className="flex items-center gap-2 px-4 py-2.5 bg-dark-800/60 hover:bg-dark-700/60 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-500 rounded-xl transition-all"
              >
                <ChevronLeft size={16} /> Voltar
              </button>

              {step < 4 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-600 rounded-xl transition-all"
                >
                  Próximo <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-700 rounded-xl transition-all"
                >
                  {saving ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
                  ) : (
                    <><Check size={16} /> {editingId ? 'Atualizar fábrica' : 'Criar fábrica'}</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ LISTA ═══ */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl skeleton-shimmer" />)}</div>
      ) : factories.length === 0 ? (
        <div className="text-center py-20 bg-dark-900/40 border border-dark-800/30 rounded-2xl">
          <Factory size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/40 mb-2">Nenhuma fábrica cadastrada.</p>
          <p className="text-white/25 text-sm">Clique em "Nova fábrica" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {factories.map((f) => (
            <div key={f.id} className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-5 hover:border-dark-700/60 transition-all">
              <div className="flex items-center gap-4 mb-4">
                {/* Logo com fundo branco */}
                <div className="w-14 h-14 rounded-xl bg-dark-800/60 border border-dark-700/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {f.logo_url ? (
                    <img src={f.logo_url} alt={f.name} className="w-full h-full object-contain" />
                  ) : (
                    <Factory size={22} className="text-dark-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-700 truncate text-white">{f.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-500 ${f.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-700/60 text-dark-400'}`}>
                      {f.active ? 'Ativa' : 'Inativa'}
                    </span>
                    {f.sectors && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-500 bg-dark-700/40 text-dark-400">
                        {f.sectors.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {f.niche && (
                <p className="text-xs text-white/40 mb-3 truncate">{f.niche}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(f)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-dark-800/60 hover:bg-dark-700/60 rounded-xl text-xs text-dark-300 hover:text-white transition-colors"
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  onClick={() => handleDelete(f.id, f.name)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-dark-800/60 hover:bg-red-500/10 rounded-xl text-xs text-dark-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
