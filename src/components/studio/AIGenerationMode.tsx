'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import {
  Sparkles, ChevronRight, Check, Download, Copy,
  RefreshCw, AlertTriangle, ArrowLeft, Loader2,
  ImageIcon, Wand2,
} from 'lucide-react';
import ShareButtons from '@/components/ShareButtons';
import type { Template, BrandKit, UsageInfo } from '@/types/database';

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type DbTemplate = Pick<Template, 'id' | 'name' | 'format' | 'preview_url' | 'config_json'>;

interface ApprovedProduct {
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  factory_name: string | null;
  factory_logo: string | null;
}

interface AIResult {
  generation_id: string;
  image_url: string;
  caption: string;
  template_name: string;
  format: 'feed' | 'story';
}

/* ═══════════════════════════════════════════════════════
   LAYOUT ICONS MAP
   ═══════════════════════════════════════════════════════ */

const LAYOUT_ICONS: Record<string, string> = {
  promo_highlight: '🔥',
  launch_elegant: '✨',
  before_after: '↔️',
  info_carousel: '📊',
  testimonial: '⭐',
  flash_sale_story: '⚡',
  new_arrival_story: '🆕',
  poll_story: '📊',
  behind_scenes_story: '📸',
  quick_tip_story: '💡',
};

const TONE_OPTIONS = [
  { value: 'descontraído', label: '😄 Descontraído', hint: 'Leve, próximo, informal' },
  { value: 'profissional', label: '💼 Profissional', hint: 'Sério, confiável, corporativo' },
  { value: 'urgente', label: '⚡ Urgente', hint: 'Escassez, FOMO, ação imediata' },
  { value: 'elegante', label: '✨ Elegante', hint: 'Premium, sofisticado, aspiracional' },
  { value: 'educativo', label: '📚 Educativo', hint: 'Informativo, dica, benefício' },
];

/* ═══════════════════════════════════════════════════════
   PROPS
   ═══════════════════════════════════════════════════════ */

interface AIGenerationModeProps {
  /** product_id pré-selecionado (vindo da URL do estúdio) */
  preselectedProductId?: string;
  brandKit: BrandKit | null;
  usage: UsageInfo | null;
  onUsageUpdate: (u: UsageInfo) => void;
}

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function AIGenerationMode({
  preselectedProductId,
  brandKit,
  usage,
  onUsageUpdate,
}: AIGenerationModeProps) {
  const supabase = createClient();

  // ── Data ──
  const [templates, setTemplates] = useState<DbTemplate[]>([]);
  const [products, setProducts] = useState<ApprovedProduct[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // ── Selections ──
  const [format, setFormat] = useState<'feed' | 'story'>('feed');
  const [selectedTemplate, setSelectedTemplate] = useState<DbTemplate | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>(preselectedProductId || '');
  const [tone, setTone] = useState('descontraído');
  const [customPrompt, setCustomPrompt] = useState('');

  // ── Generation state ──
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [captionSaved, setCaptionSaved] = useState(false);

  const isOverLimit = usage ? usage.remaining <= 0 : false;

  /* ── Load templates + products ── */
  const loadData = useCallback(async () => {
    setLoadingData(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: tpls }, { data: prods }] = await Promise.all([
      supabase
        .from('templates')
        .select('id, name, format, preview_url, config_json')
        .eq('active', true)
        .order('name'),
      supabase
        .from('products')
        .select(`
          id, name, image_url, description,
          factory:factories!inner(id, name, logo_url, active),
          follower:factory_followers!inner(lojista_id, status)
        `)
        .eq('active', true)
        .eq('factory_followers.lojista_id', user.id)
        .eq('factory_followers.status', 'approved'),
    ]);

    if (tpls) setTemplates(tpls as DbTemplate[]);

    if (prods) {
      const mapped: ApprovedProduct[] = prods.map((p: {
        id: string;
        name: string;
        image_url: string | null;
        description: string | null;
        factory: { name: string; logo_url: string | null } | null;
      }) => ({
        id: p.id,
        name: p.name,
        image_url: p.image_url,
        description: p.description,
        factory_name: p.factory?.name || null,
        factory_logo: p.factory?.logo_url || null,
      }));
      setProducts(mapped);
    }

    setLoadingData(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Auto-select preselected product ── */
  useEffect(() => {
    if (preselectedProductId) setSelectedProductId(preselectedProductId);
  }, [preselectedProductId]);

  /* ── Filter templates by format ── */
  const filteredTemplates = templates.filter(t => t.format === format);

  /* ── Get layout icon from config_json ── */
  const getLayoutIcon = (tpl: DbTemplate): string => {
    const cfg = tpl.config_json as Record<string, string>;
    return LAYOUT_ICONS[cfg?.layout] || '🎨';
  };

  const getDescription = (tpl: DbTemplate): string => {
    const cfg = tpl.config_json as Record<string, string>;
    return cfg?.description || '';
  };

  /* ── Generate ── */
  const handleGenerate = async () => {
    if (!selectedTemplate || !selectedProductId || isOverLimit) return;
    setGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-post', {
        body: {
          product_id: selectedProductId,
          format,
          template_id: selectedTemplate.id,
          tone,
          custom_prompt: customPrompt.trim() || undefined,
        },
      });

      if (fnError) throw new Error(fnError.message || 'Erro na Edge Function');
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar post');

      const gen = data.generation;
      const aiResult: AIResult = {
        generation_id: gen.id,
        image_url: gen.image_url,
        caption: gen.caption,
        template_name: gen.template_name || selectedTemplate.name,
        format: gen.format || format,
      };

      setResult(aiResult);
      setEditedCaption(gen.caption);
      setCaptionSaved(false);

      if (data.usage) onUsageUpdate(data.usage as UsageInfo);

      setStep(4);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  /* ── Save edited caption ── */
  const handleSaveCaption = async () => {
    if (!result?.generation_id || !editedCaption) return;
    await supabase
      .from('generations')
      .update({ caption: editedCaption })
      .eq('id', result.generation_id);
    setCaptionSaved(true);
  };

  /* ── Copy caption ── */
  const handleCopyCaption = () => {
    navigator.clipboard.writeText(editedCaption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  /* ── Download image ── */
  const handleDownload = async () => {
    if (!result?.image_url) return;
    const res = await fetch(result.image_url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `post-ia-${format}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Reset ── */
  const handleReset = () => {
    setStep(1);
    setSelectedTemplate(null);
    setSelectedProductId(preselectedProductId || '');
    setTone('descontraído');
    setCustomPrompt('');
    setResult(null);
    setError(null);
    setEditedCaption('');
    setCaptionSaved(false);
  };

  /* ── Step navigation helpers ── */
  const canGoToStep2 = !!selectedTemplate;
  const canGoToStep3 = canGoToStep2 && !!selectedProductId;
  const canGenerate = canGoToStep3 && !isOverLimit;

  const stepLabels = ['Formato + Template', 'Produto', 'Opcionais', 'Resultado'];

  const inputClass =
    'w-full px-4 py-3 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm';

  /* ═══════════════════════════════════════════════════════
     LOADING STATE
     ═══════════════════════════════════════════════════════ */
  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={24} className="text-brand-400 animate-spin" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ── Usage warning ── */}
      {isOverLimit && (
        <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={18} className="text-orange-400 flex-shrink-0" />
          <p className="text-sm text-orange-300">
            Limite atingido! Você usou {usage?.count}/{usage?.limit} gerações do plano {usage?.plan}.
          </p>
        </div>
      )}

      {/* ── Step indicator ── */}
      {step < 4 && (
        <div className="flex items-center gap-2 text-sm">
          {stepLabels.map((label, i) => {
            const stepNum = (i + 1) as 1 | 2 | 3 | 4;
            const done = step > stepNum;
            const active = step === stepNum;
            return (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => { if (done) setStep(stepNum); }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-600 transition-all ${
                    done
                      ? 'bg-brand-600 text-white cursor-pointer'
                      : active
                      ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                      : 'bg-dark-800 text-dark-500 cursor-default'
                  }`}
                >
                  {done ? <Check size={14} /> : stepNum}
                </button>
                <span className={`hidden sm:inline text-xs ${active ? 'text-white' : 'text-dark-500'}`}>
                  {label}
                </span>
                {i < 3 && <ChevronRight size={12} className="text-dark-700" />}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          STEP 1 — Formato + Template
          ══════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="font-display font-700 mb-1">Escolha o formato</h2>
            <p className="text-dark-500 text-sm">Depois selecione o template que a IA vai usar como guia.</p>
          </div>

          {/* Format toggle */}
          <div className="flex gap-3">
            {(['feed', 'story'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFormat(f); setSelectedTemplate(null); }}
                className={`flex-1 py-3 rounded-xl font-600 text-sm transition-all ${
                  format === f
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/40'
                    : 'bg-dark-800/50 text-dark-400 border border-dark-700/30 hover:border-dark-600 hover:text-white'
                }`}
              >
                {f === 'feed' ? '📷 Feed (1:1)' : '📱 Story (9:16)'}
              </button>
            ))}
          </div>

          {/* Template grid */}
          <div>
            <p className="text-xs text-dark-500 mb-3">
              {filteredTemplates.length} templates disponíveis para {format}
            </p>

            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-dark-500 text-sm">
                Nenhum template ativo para este formato.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredTemplates.map((tpl) => {
                  const icon = getLayoutIcon(tpl);
                  const desc = getDescription(tpl);
                  const isSelected = selectedTemplate?.id === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-brand-500/50 bg-brand-600/10 ring-1 ring-brand-500/20'
                          : 'border-dark-800/40 hover:border-dark-700 hover:bg-dark-800/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon / preview */}
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 ${
                          isSelected ? 'bg-brand-600/20' : 'bg-dark-800/60'
                        }`}>
                          {tpl.preview_url ? (
                            <img
                              src={tpl.preview_url}
                              alt={tpl.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            icon
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-600 text-sm ${isSelected ? 'text-brand-300' : 'text-white'}`}>
                            {tpl.name}
                          </p>
                          {desc && (
                            <p className="text-xs text-dark-500 mt-0.5 line-clamp-2">{desc}</p>
                          )}
                        </div>
                        {isSelected && (
                          <Check size={16} className="text-brand-400 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next button */}
          <button
            onClick={() => setStep(2)}
            disabled={!canGoToStep2}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-600 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Próximo: Escolher Produto <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          STEP 2 — Produto
          ══════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep(1)} className="text-dark-400 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="font-display font-700">Escolha o produto</h2>
              <p className="text-dark-500 text-xs">Produtos das fábricas que você segue (aprovadas)</p>
            </div>
          </div>

          {/* Selected template summary */}
          {selectedTemplate && (
            <div className="flex items-center gap-2 px-3 py-2 bg-brand-600/10 border border-brand-500/20 rounded-lg">
              <span className="text-lg">{getLayoutIcon(selectedTemplate)}</span>
              <span className="text-sm text-brand-300 font-500">{selectedTemplate.name}</span>
              <span className="text-xs text-dark-500 ml-auto">{format}</span>
            </div>
          )}

          {products.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <ImageIcon size={32} className="text-dark-600 mx-auto" />
              <p className="text-dark-400 text-sm">Nenhum produto disponível.</p>
              <p className="text-dark-600 text-xs">
                Você precisa seguir e ter acesso aprovado a pelo menos uma fábrica.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {products.map((prod) => {
                const isSelected = selectedProductId === prod.id;
                return (
                  <button
                    key={prod.id}
                    onClick={() => setSelectedProductId(prod.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'border-brand-500/50 bg-brand-600/10'
                        : 'border-dark-800/40 hover:border-dark-700 hover:bg-dark-800/30'
                    }`}
                  >
                    {/* Product image */}
                    <div className="w-12 h-12 rounded-lg bg-dark-800 overflow-hidden flex-shrink-0">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-dark-600">
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-600 text-sm truncate ${isSelected ? 'text-brand-300' : 'text-white'}`}>
                        {prod.name}
                      </p>
                      {prod.factory_name && (
                        <p className="text-xs text-dark-500 truncate">{prod.factory_name}</p>
                      )}
                    </div>
                    {isSelected && <Check size={16} className="text-brand-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setStep(3)}
            disabled={!canGoToStep3}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-600 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Próximo: Opcionais <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          STEP 3 — Opcionais + Gerar
          ══════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep(2)} className="text-dark-400 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="font-display font-700">Opcionais</h2>
              <p className="text-dark-500 text-xs">Tom de voz e instrução extra para a IA</p>
            </div>
          </div>

          {/* Summary */}
          <div className="p-3 bg-dark-950/60 rounded-xl space-y-1 text-xs text-dark-400">
            {selectedTemplate && (
              <p>🎨 Template: <span className="text-white">{selectedTemplate.name}</span> ({format})</p>
            )}
            {selectedProductId && (() => {
              const prod = products.find(p => p.id === selectedProductId);
              return prod ? (
                <p>📦 Produto: <span className="text-white">{prod.name}</span>
                  {prod.factory_name && <span className="text-dark-500"> — {prod.factory_name}</span>}
                </p>
              ) : null;
            })()}
          </div>

          {/* Tone */}
          <div>
            <label className="block text-sm text-dark-300 mb-2">Tom de Voz</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    tone === t.value
                      ? 'border-brand-500/50 bg-brand-600/10 text-brand-300'
                      : 'border-dark-800/40 text-dark-400 hover:border-dark-700 hover:text-white'
                  }`}
                >
                  <span className="font-500">{t.label}</span>
                  <span className="block text-xs text-dark-600 mt-0.5">{t.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt */}
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">
              Instrução Extra <span className="text-dark-600">(opcional)</span>
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ex: foque no benefício de economia de energia, mencione que é resistente à água..."
              className={`${inputClass} resize-y min-h-[80px]`}
              rows={3}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              <strong>Erro:</strong> {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-brand-600 hover:from-purple-700 hover:to-brand-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-display font-600 text-lg rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-600/20"
          >
            {generating ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Gerando com IA... (pode levar até 30s)
              </>
            ) : (
              <>
                <Wand2 size={20} />
                Gerar com IA
              </>
            )}
          </button>

          {generating && (
            <p className="text-center text-xs text-dark-500">
              A IA está criando a imagem e a legenda com base no template selecionado.
            </p>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          STEP 4 — Resultado
          ══════════════════════════════════════════════════ */}
      {step === 4 && result && (
        <div className="space-y-4">
          {/* Result header */}
          <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-purple-400" />
              <h2 className="font-display font-700 text-brand-400">Post gerado pela IA! 🎉</h2>
            </div>

            <div className="flex items-center gap-2 text-xs text-dark-500 mb-4">
              <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
                {result.template_name}
              </span>
              <span className="px-2 py-1 bg-dark-800 rounded-lg">
                {result.format === 'feed' ? '📷 Feed' : '📱 Story'}
              </span>
            </div>

            {/* Generated image */}
            <div className="rounded-xl overflow-hidden mb-4 bg-dark-950">
              <img
                src={result.image_url}
                alt="Post gerado"
                className={`w-full object-contain ${result.format === 'story' ? 'max-h-[500px]' : 'max-h-[400px]'}`}
              />
            </div>

            {/* Share + Download */}
            <ShareButtons
              imageUrl={result.image_url}
              caption={editedCaption}
              productName={products.find(p => p.id === selectedProductId)?.name || ''}
              whatsapp={brandKit?.whatsapp || undefined}
              instagram={brandKit?.instagram_handle || undefined}
              className="mb-3"
            />

            <button
              onClick={handleDownload}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Download size={18} /> Baixar Imagem PNG
            </button>
          </div>

          {/* Caption editor */}
          <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              <h3 className="font-display font-600">Legenda gerada pela IA</h3>
            </div>

            <textarea
              value={editedCaption}
              onChange={(e) => { setEditedCaption(e.target.value); setCaptionSaved(false); }}
              className="w-full p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl text-sm text-dark-200 resize-y min-h-[120px] focus:outline-none focus:border-purple-500/30"
              rows={6}
            />

            <div className="flex gap-2">
              <button
                onClick={handleCopyCaption}
                className="flex-1 py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 text-xs font-500 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                {copiedCaption ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar</>}
              </button>
              {!captionSaved ? (
                <button
                  onClick={handleSaveCaption}
                  className="flex-1 py-2 bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 text-xs font-600 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Check size={12} /> Salvar legenda
                </button>
              ) : (
                <span className="flex-1 py-2 text-green-400 text-xs font-500 flex items-center justify-center gap-1.5">
                  <Check size={12} /> Salvo ✓
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-3 bg-dark-800 hover:bg-dark-700 text-white font-600 rounded-xl transition-all text-sm"
            >
              Gerar outro post
            </button>
            <a
              href="/dashboard/historico"
              className="flex-1 py-3 bg-dark-800 hover:bg-dark-700 text-white font-600 rounded-xl transition-all text-sm text-center"
            >
              Ver histórico →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
