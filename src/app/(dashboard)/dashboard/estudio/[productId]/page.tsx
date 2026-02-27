'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { toPng } from 'html-to-image';
import { Download, Copy, Check, Zap, ChevronRight, AlertTriangle, ArrowLeft } from 'lucide-react';
import { generateCaption, CAPTION_STYLES } from '@/lib/captions';
import Link from 'next/link';
import type { Product, Template, BrandKit, Category, Factory, CaptionStyle, UsageInfo, GenerationFields } from '@/types/database';

export default function EstudioPage() {
  const { productId } = useParams<{ productId: string }>();
  const supabase = createClient();
  const artRef = useRef<HTMLDivElement>(null);

  // Data
  const [product, setProduct] = useState<Product | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  // Selections
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [fields, setFields] = useState<GenerationFields>({ price: '', condition: '', cta: 'Garanta o seu!' });
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('oferta');

  // States
  const [step, setStep] = useState(1); // 1=template, 2=dados, 3=preview, 4=download
  const [generating, setGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState<{ short: string; medium: string } | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Load data
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: prod }, { data: tpls }, { data: bk }, { data: usageData }] = await Promise.all([
        supabase.from('products').select('*, category:categories(*), factory:factories(*)').eq('id', productId).single(),
        supabase.from('templates').select('*').eq('active', true).order('name'),
        supabase.from('brand_kits').select('*').eq('user_id', user.id).single(),
        supabase.rpc('get_usage', { p_user_id: user.id }),
      ]);

      if (prod) setProduct(prod as Product);
      if (tpls) setTemplates(tpls as Template[]);
      if (bk) setBrandKit(bk as BrandKit);
      if (usageData) setUsage(usageData as UsageInfo);
      setLoadingData(false);
    })();
  }, [supabase, productId]);

  const isOverLimit = usage ? usage.remaining <= 0 : false;

  // Generate caption automaticamente
  const generateCaptions = useCallback(() => {
    if (!product || !brandKit) return;
    const result = generateCaption(captionStyle, {
      productName: product.name,
      price: fields.price,
      condition: fields.condition,
      cta: fields.cta,
      whatsapp: brandKit.whatsapp || undefined,
      instagram: brandKit.instagram_handle || undefined,
      storeName: brandKit.store_name || undefined,
      category: (product.category as Category)?.slug,
    });
    setCaption(result);
  }, [product, brandKit, fields, captionStyle]);

  useEffect(() => { generateCaptions(); }, [generateCaptions]);

  // Gerar imagem com html-to-image
  const handleGenerate = async () => {
    if (!artRef.current || !userId || isOverLimit) return;
    setGenerating(true);

    try {
      // Verificar e incrementar usage
      const { data: usageResult } = await supabase.rpc('increment_usage', { p_user_id: userId });
      if (usageResult && !usageResult.allowed) {
        setUsage(usageResult as UsageInfo);
        setGenerating(false);
        return;
      }

      // Render to PNG via html-to-image
      const dataUrl = await toPng(artRef.current, {
        width: selectedTemplate?.format === 'story' ? 1080 : 1080,
        height: selectedTemplate?.format === 'story' ? 1920 : 1080,
        pixelRatio: 1,
      });

      // Upload pro Supabase Storage
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const filename = `${userId}/${Date.now()}.png`;
      const { error: uploadErr } = await supabase.storage.from('generated-arts').upload(filename, blob, { contentType: 'image/png' });

      let imageUrl = dataUrl;
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('generated-arts').getPublicUrl(filename);
        imageUrl = urlData.publicUrl;
      }

      setGeneratedImageUrl(imageUrl);

      // Salvar no histórico (generations)
      await supabase.from('generations').insert({
        user_id: userId,
        product_id: product?.id,
        template_id: selectedTemplate?.id,
        image_url: imageUrl,
        caption: caption?.medium || '',
        fields_data: fields,
        format: selectedTemplate?.format || 'feed',
      });

      // Atualizar display de usage
      if (usageResult) setUsage({ ...usageResult, count: usageResult.count, remaining: usageResult.limit - usageResult.count } as UsageInfo);

      setStep(4);
    } catch (err) {
      console.error('Erro ao gerar:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Download da arte
  const handleDownload = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.download = `arte-${product?.name?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
    link.href = generatedImageUrl;
    link.click();
  };

  const handleCopyCaption = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const inputClass = 'w-full px-4 py-3 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm';

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-dark-400 mb-4">Produto não encontrado.</p>
        <Link href="/dashboard/produtos" className="text-brand-400 hover:text-brand-300 text-sm">← Voltar ao catálogo</Link>
      </div>
    );
  }

  const stepLabels = ['Template', 'Dados', 'Preview', 'Download'];

  return (
    <div className="animate-fade-in-up">
      {/* Header com nome do produto */}
      <div className="mb-6">
        <Link href={product.factory_id ? `/dashboard/produtos/${product.factory_id}` : '/dashboard/produtos'} className="inline-flex items-center gap-1.5 text-sm text-dark-400 hover:text-white transition-colors mb-3">
          <ArrowLeft size={16} /> Voltar aos produtos
        </Link>
        <div className="flex items-center gap-4">
          {product.image_url && (
            <div className="w-14 h-14 rounded-xl bg-dark-800 overflow-hidden flex-shrink-0">
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl font-800 tracking-tight">
              Criar post: <span className="text-brand-500">{product.name}</span>
            </h1>
            {product.category && (
              <p className="text-sm text-dark-400">{(product.category as Category).name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Usage warning */}
      {isOverLimit && (
        <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={20} className="text-orange-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-orange-300 font-600">Limite atingido!</p>
            <p className="text-xs text-orange-400/70">Você usou {usage?.count}/{usage?.limit} artes do plano {usage?.plan}. Faça upgrade para continuar.</p>
          </div>
        </div>
      )}

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        {stepLabels.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => { if (i + 1 < step) setStep(i + 1); }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-600 transition-all ${
                step > i + 1 ? 'bg-brand-600 text-white' :
                step === i + 1 ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' :
                'bg-dark-800 text-dark-500'
              }`}
            >
              {step > i + 1 ? <Check size={14} /> : i + 1}
            </button>
            <span className={`hidden sm:inline ${step === i + 1 ? 'text-white' : 'text-dark-500'}`}>{s}</span>
            {i < 3 && <ChevronRight size={14} className="text-dark-700" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lado esquerdo: Steps */}
        <div className="space-y-6">

          {/* Step 1: Escolher Template */}
          {step === 1 && (
            <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6">
              <h2 className="font-display font-700 mb-4">Escolha o template</h2>
              {templates.length === 0 ? (
                <p className="text-dark-400 text-sm text-center py-8">Nenhum template cadastrado ainda.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTemplate(t); setStep(2); }}
                      className={`text-left rounded-xl border p-3 transition-all ${
                        selectedTemplate?.id === t.id
                          ? 'border-brand-500/50 bg-brand-600/10'
                          : 'border-dark-800/40 hover:border-dark-700'
                      }`}
                    >
                      <div className={`${t.format === 'story' ? 'aspect-[9/16]' : 'aspect-square'} rounded-lg bg-dark-800 mb-2 overflow-hidden`}>
                        {t.preview_url && <img src={t.preview_url} alt={t.name} className="w-full h-full object-cover" />}
                      </div>
                      <p className="text-sm font-500 truncate">{t.name}</p>
                      <p className="text-[10px] text-dark-500 uppercase">{t.format} · {t.format === 'feed' ? '1080×1080' : '1080×1920'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preencher dados */}
          {step === 2 && (
            <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-4">
              <h2 className="font-display font-700 mb-2">Preencha os dados</h2>

              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Preço</label>
                <input type="text" value={fields.price || ''} onChange={(e) => setFields({ ...fields, price: e.target.value })}
                  className={inputClass} placeholder="R$ 199,90" />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Condição / Destaque</label>
                <input type="text" value={fields.condition || ''} onChange={(e) => setFields({ ...fields, condition: e.target.value })}
                  className={inputClass} placeholder="Frete grátis, 12x sem juros..." />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">CTA (chamada para ação)</label>
                <input type="text" value={fields.cta || ''} onChange={(e) => setFields({ ...fields, cta: e.target.value })}
                  className={inputClass} placeholder="Garanta o seu!" />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">Estilo da legenda</label>
                <div className="flex flex-wrap gap-2">
                  {CAPTION_STYLES.map((s) => (
                    <button key={s.value} onClick={() => setCaptionStyle(s.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-500 transition-all ${
                        captionStyle === s.value
                          ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                          : 'bg-dark-800/50 text-dark-400 border border-transparent hover:bg-dark-800'
                      }`}>
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setStep(3)}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-xl transition-all">
                Ver preview →
              </button>
            </div>
          )}

          {/* Step 3: Confirmar e Gerar */}
          {step === 3 && (
            <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-4">
              <h2 className="font-display font-700 mb-2">Confirme e gere</h2>
              <div className="text-sm space-y-2 text-dark-300">
                <p>📦 <span className="text-white">{product.name}</span></p>
                {(product.factory as Factory)?.name && <p>🏭 <span className="text-white">{(product.factory as Factory).name}</span></p>}
                <p>🎨 <span className="text-white">{selectedTemplate?.name}</span> ({selectedTemplate?.format})</p>
                {fields.price && <p>💰 {fields.price}</p>}
                {fields.condition && <p>📌 {fields.condition}</p>}
                {fields.cta && <p>🎯 {fields.cta}</p>}
              </div>

              <button onClick={handleGenerate} disabled={generating || isOverLimit}
                className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-display font-600 text-lg rounded-xl transition-all flex items-center justify-center gap-3">
                {generating ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Gerando...</>
                ) : (
                  <><Zap size={20} /> Gerar Arte</>
                )}
              </button>
            </div>
          )}

          {/* Step 4: Download + Legendas */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6">
                <h2 className="font-display font-700 mb-4 text-brand-400">Arte gerada! 🎉</h2>
                <button onClick={handleDownload}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-xl transition-all flex items-center justify-center gap-2">
                  <Download size={18} /> Baixar PNG
                </button>
              </div>

              {caption && (
                <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-4">
                  <h3 className="font-display font-600">Legendas prontas</h3>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-dark-400">Legenda curta</span>
                      <button onClick={() => handleCopyCaption(caption.short)}
                        className="text-xs text-dark-400 hover:text-white flex items-center gap-1 transition-colors">
                        {copiedCaption ? <Check size={12} /> : <Copy size={12} />} Copiar
                      </button>
                    </div>
                    <div className="p-3 bg-dark-950 rounded-xl text-sm text-dark-200 whitespace-pre-wrap">{caption.short}</div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-dark-400">Legenda média</span>
                      <button onClick={() => handleCopyCaption(caption.medium)}
                        className="text-xs text-dark-400 hover:text-white flex items-center gap-1 transition-colors">
                        <Copy size={12} /> Copiar
                      </button>
                    </div>
                    <div className="p-3 bg-dark-950 rounded-xl text-sm text-dark-200 whitespace-pre-wrap">{caption.medium}</div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Link href={product.factory_id ? `/dashboard/produtos/${product.factory_id}` : '/dashboard/produtos'}
                  className="flex-1 py-3 bg-dark-800 hover:bg-dark-700 text-white font-600 rounded-xl transition-all text-center text-sm">
                  ← Voltar aos produtos
                </Link>
                <button onClick={() => { setStep(1); setSelectedTemplate(null); setGeneratedImageUrl(null); setCaption(null); setFields({ price: '', condition: '', cta: 'Garanta o seu!' }); }}
                  className="flex-1 py-3 bg-dark-800 hover:bg-dark-700 text-white font-600 rounded-xl transition-all text-sm">
                  Criar outra arte
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lado direito: Preview em tempo real */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-4">
            <h3 className="text-sm font-500 text-dark-400 mb-3">Preview</h3>
            <div className="flex justify-center">
              <div
                ref={artRef}
                className="relative overflow-hidden"
                style={{
                  width: selectedTemplate?.format === 'story' ? 270 : 320,
                  height: selectedTemplate?.format === 'story' ? 480 : 320,
                  backgroundColor: brandKit?.primary_color || '#1a1b2e',
                }}
              >
                {/* Background gradient */}
                <div className="absolute inset-0" style={{
                  background: `linear-gradient(135deg, ${brandKit?.primary_color || '#1a1b2e'} 0%, ${brandKit?.secondary_color || '#0f1020'} 100%)`
                }} />

                {/* Imagem do produto */}
                {product.image_url && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img src={product.image_url} alt="" className="max-w-[70%] max-h-[50%] object-contain drop-shadow-2xl" />
                  </div>
                )}

                {/* Overlay inferior com dados */}
                <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                  <p className="text-white font-bold text-sm leading-tight mb-1 drop-shadow">{product.name}</p>
                  {fields.price && (
                    <p className="text-lg font-800 drop-shadow" style={{ color: brandKit?.secondary_color || '#FFD700' }}>
                      {fields.price}
                    </p>
                  )}
                  {fields.condition && <p className="text-white/80 text-[10px] mt-0.5">{fields.condition}</p>}
                  {fields.cta && (
                    <div className="mt-2 inline-block px-3 py-1 rounded-full text-[10px] font-600 text-white"
                      style={{ backgroundColor: brandKit?.primary_color || '#e0604e' }}>
                      {fields.cta}
                    </div>
                  )}
                </div>

                {/* Logo do Lojista no topo esquerdo (destaque principal) */}
                {brandKit?.logo_url && (
                  <div className="absolute top-3 left-3">
                    <img src={brandKit.logo_url} alt="Logo" className="h-8 object-contain drop-shadow" />
                  </div>
                )}

                {/* Logo da Fábrica no topo direito (chancela oficial) */}
                {(product.factory as Factory)?.logo_url && (
                  <div className="absolute top-2 right-2 flex flex-col items-center">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1.5">
                      <img src={(product.factory as Factory).logo_url!} alt={(product.factory as Factory).name} className="h-5 object-contain" />
                    </div>
                    <span className="text-white/50 text-[5px] mt-0.5 font-500">Produto oficial</span>
                  </div>
                )}

                {/* Contato embaixo da logo do lojista */}
                <div className="absolute bottom-2 right-3 text-right">
                  {brandKit?.instagram_handle && <p className="text-white/70 text-[8px] drop-shadow">{brandKit.instagram_handle}</p>}
                  {brandKit?.whatsapp && <p className="text-white/70 text-[8px] drop-shadow">{brandKit.whatsapp}</p>}
                </div>
              </div>
            </div>

            {generatedImageUrl && step === 4 && (
              <div className="mt-4 text-center">
                <p className="text-xs text-brand-400">✅ Arte final gerada com sucesso</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
