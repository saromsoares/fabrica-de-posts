'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { toPng } from 'html-to-image';
import { Download, Copy, Check, Zap, ChevronRight, AlertTriangle } from 'lucide-react';
import { generateCaption, CAPTION_STYLES } from '@/lib/captions';
import type { Product, Template, BrandKit, Category, CaptionStyle, UsageInfo, GenerationFields } from '@/types/database';

function GenerateContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const artRef = useRef<HTMLDivElement>(null);

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  // Selections
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [fields, setFields] = useState<GenerationFields>({ price: '', condition: '', cta: 'Garanta o seu!' });
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('oferta');

  // States
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState<{ short: string; medium: string } | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: prods }, { data: tpls }, { data: bk }, { data: usageData }] = await Promise.all([
        supabase.from('products').select('*, category:categories(*)').eq('active', true).order('name'),
        supabase.from('templates').select('*').eq('active', true).order('name'),
        supabase.from('brand_kits').select('*').eq('user_id', user.id).single(),
        supabase.rpc('get_usage', { p_user_id: user.id }),
      ]);

      if (prods) setProducts(prods as Product[]);
      if (tpls) setTemplates(tpls as Template[]);
      if (bk) setBrandKit(bk as BrandKit);
      if (usageData) setUsage(usageData as UsageInfo);

      // Pre-select from URL params
      const prodId = searchParams.get('product');
      const tplId = searchParams.get('template');
      if (prodId && prods) {
        const p = prods.find((x: Product) => x.id === prodId);
        if (p) { setSelectedProduct(p as Product); setStep(2); }
      }
      if (tplId && tpls) {
        const t = tpls.find((x: Template) => x.id === tplId);
        if (t) { setSelectedTemplate(t as Template); if (prodId) setStep(3); }
      }
    })();
  }, [supabase, searchParams]);

  const isOverLimit = usage ? usage.remaining <= 0 : false;

  // Generate caption
  const generateCaptions = useCallback(() => {
    if (!selectedProduct || !brandKit) return;
    const result = generateCaption(captionStyle, {
      productName: selectedProduct.name,
      price: fields.price,
      condition: fields.condition,
      cta: fields.cta,
      whatsapp: brandKit.whatsapp || undefined,
      instagram: brandKit.instagram_handle || undefined,
      storeName: brandKit.store_name || undefined,
      category: (selectedProduct.category as Category)?.slug,
    });
    setCaption(result);
  }, [selectedProduct, brandKit, fields, captionStyle]);

  useEffect(() => { generateCaptions(); }, [generateCaptions]);

  // Generate image
  const handleGenerate = async () => {
    if (!artRef.current || !userId || isOverLimit) return;
    setGenerating(true);

    try {
      // Check usage
      const { data: usageResult } = await supabase.rpc('increment_usage', { p_user_id: userId });
      if (usageResult && !usageResult.allowed) {
        setUsage(usageResult as UsageInfo);
        setGenerating(false);
        return;
      }

      // Render to PNG
      const dataUrl = await toPng(artRef.current, {
        width: selectedTemplate?.format === 'story' ? 1080 : 1080,
        height: selectedTemplate?.format === 'story' ? 1920 : 1080,
        pixelRatio: 1,
      });

      // Convert to blob and upload
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const filename = `${userId}/${Date.now()}.png`;
      const { error: uploadErr } = await supabase.storage.from('generated-arts').upload(filename, blob, { contentType: 'image/png' });

      let imageUrl = dataUrl; // fallback to data URL
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('generated-arts').getPublicUrl(filename);
        imageUrl = urlData.publicUrl;
      }

      setGeneratedImageUrl(imageUrl);

      // Save generation record
      await supabase.from('generations').insert({
        user_id: userId,
        product_id: selectedProduct?.id,
        template_id: selectedTemplate?.id,
        image_url: imageUrl,
        caption: caption?.medium || '',
        fields_data: fields,
        format: selectedTemplate?.format || 'feed',
      });

      // Update usage display
      if (usageResult) setUsage({ ...usageResult, count: usageResult.count, remaining: usageResult.limit - usageResult.count } as UsageInfo);

      setStep(5);
    } catch (err) {
      console.error('Erro ao gerar:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.download = `arte-${Date.now()}.png`;
    link.href = generatedImageUrl;
    link.click();
  };

  const handleCopyCaption = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const inputClass = 'w-full px-4 py-3 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm';

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-800 tracking-tight">Gerar <span className="text-brand-500">Arte</span></h1>
        <p className="text-dark-400 mt-1">Siga os passos para criar sua arte profissional.</p>
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
        {['Produto', 'Template', 'Dados', 'Preview', 'Download'].map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <button onClick={() => { if (i + 1 < step) setStep(i + 1); }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-600 transition-all ${step > i + 1 ? 'bg-brand-600 text-white' : step === i + 1 ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' : 'bg-dark-800 text-dark-500'}`}>
              {step > i + 1 ? <Check size={14} /> : i + 1}
            </button>
            <span className={`hidden sm:inline ${step === i + 1 ? 'text-white' : 'text-dark-500'}`}>{s}</span>
            {i < 4 && <ChevronRight size={14} className="text-dark-700" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Step 1: Select Product */}
          {step === 1 && (
            <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6">
              <h2 className="font-display font-700 mb-4">Escolha o produto</h2>
              <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                {products.map((p) => (
                  <button key={p.id} onClick={() => { setSelectedProduct(p); setStep(2); }}
                    className={`text-left rounded-xl border p-3 transition-all ${selectedProduct?.id === p.id ? 'border-brand-500/50 bg-brand-600/10' : 'border-dark-800/40 hover:border-dark-700'}`}>
                    <div className="aspect-square rounded-lg bg-dark-800 mb-2 overflow-hidden">
                      {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                    </div>
                    <p className="text-sm font-500 truncate">{p.name}</p>
                  </button>
                ))}
              </div>
              {products.length === 0 && <p className="text-dark-400 text-sm text-center py-8">Nenhum produto cadastrado ainda.</p>}
            </div>
          )}

          {/* Step 2: Select Template */}
          {step === 2 && (
            <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6">
              <h2 className="font-display font-700 mb-4">Escolha o template</h2>
              <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                {templates.map((t) => (
                  <button key={t.id} onClick={() => { setSelectedTemplate(t); setStep(3); }}
                    className={`text-left rounded-xl border p-3 transition-all ${selectedTemplate?.id === t.id ? 'border-brand-500/50 bg-brand-600/10' : 'border-dark-800/40 hover:border-dark-700'}`}>
                    <div className={`${t.format === 'story' ? 'aspect-[9/16]' : 'aspect-square'} rounded-lg bg-dark-800 mb-2 overflow-hidden`}>
                      {t.preview_url && <img src={t.preview_url} alt={t.name} className="w-full h-full object-cover" />}
                    </div>
                    <p className="text-sm font-500 truncate">{t.name}</p>
                    <p className="text-[10px] text-dark-500 uppercase">{t.format}</p>
                  </button>
                ))}
              </div>
              {templates.length === 0 && <p className="text-dark-400 text-sm text-center py-8">Nenhum template cadastrado ainda.</p>}
            </div>
          )}

          {/* Step 3: Fill fields */}
          {step === 3 && (
            <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-4">
              <h2 className="font-display font-700 mb-4">Preencha os dados</h2>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Preço</label>
                <input type="text" value={fields.price || ''} onChange={(e) => setFields({ ...fields, price: e.target.value })} className={inputClass} placeholder="R$ 199,90" />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Condição / Destaque</label>
                <input type="text" value={fields.condition || ''} onChange={(e) => setFields({ ...fields, condition: e.target.value })} className={inputClass} placeholder="Frete grátis, 12x sem juros..." />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">CTA (chamada para ação)</label>
                <input type="text" value={fields.cta || ''} onChange={(e) => setFields({ ...fields, cta: e.target.value })} className={inputClass} placeholder="Garanta o seu!" />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Estilo da legenda</label>
                <div className="flex flex-wrap gap-2">
                  {CAPTION_STYLES.map((s) => (
                    <button key={s.value} onClick={() => setCaptionStyle(s.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-500 transition-all ${captionStyle === s.value ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' : 'bg-dark-800/50 text-dark-400 border border-transparent hover:bg-dark-800'}`}>
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setStep(4)} className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-xl transition-all">
                Ver preview →
              </button>
            </div>
          )}

          {/* Step 4: Confirm & Generate */}
          {step === 4 && (
            <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-4">
              <h2 className="font-display font-700 mb-2">Confirme e gere</h2>
              <div className="text-sm space-y-2 text-dark-300">
                <p>📦 <span className="text-white">{selectedProduct?.name}</span></p>
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

          {/* Step 5: Download + Caption */}
          {step === 5 && (
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
                      <button onClick={() => handleCopyCaption(caption.short)} className="text-xs text-dark-400 hover:text-white flex items-center gap-1">
                        {copiedCaption ? <Check size={12} /> : <Copy size={12} />} Copiar
                      </button>
                    </div>
                    <div className="p-3 bg-dark-950 rounded-xl text-sm text-dark-200 whitespace-pre-wrap">{caption.short}</div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-dark-400">Legenda média</span>
                      <button onClick={() => handleCopyCaption(caption.medium)} className="text-xs text-dark-400 hover:text-white flex items-center gap-1">
                        <Copy size={12} /> Copiar
                      </button>
                    </div>
                    <div className="p-3 bg-dark-950 rounded-xl text-sm text-dark-200 whitespace-pre-wrap">{caption.medium}</div>
                  </div>
                </div>
              )}

              <button onClick={() => { setStep(1); setSelectedProduct(null); setSelectedTemplate(null); setGeneratedImageUrl(null); setCaption(null); setFields({ price: '', condition: '', cta: 'Garanta o seu!' }); }}
                className="w-full py-3 bg-dark-800 hover:bg-dark-700 text-white font-600 rounded-xl transition-all">
                Criar outra arte
              </button>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-4">
            <h3 className="text-sm font-500 text-dark-400 mb-3">Preview</h3>
            <div className="flex justify-center">
              <div
                ref={artRef}
                className="relative overflow-hidden bg-white"
                style={{
                  width: selectedTemplate?.format === 'story' ? 270 : 320,
                  height: selectedTemplate?.format === 'story' ? 480 : 320,
                  backgroundColor: brandKit?.primary_color || '#1a1b2e',
                }}
              >
                {/* Background */}
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${brandKit?.primary_color || '#1a1b2e'} 0%, ${brandKit?.secondary_color || '#0f1020'} 100%)` }} />

                {/* Product Image */}
                {selectedProduct?.image_url && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img src={selectedProduct.image_url} alt="" className="max-w-[70%] max-h-[50%] object-contain drop-shadow-2xl" />
                  </div>
                )}

                {/* Overlay bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                  {/* Product name */}
                  <p className="text-white font-bold text-sm leading-tight mb-1 drop-shadow">{selectedProduct?.name || 'Nome do Produto'}</p>

                  {/* Price */}
                  {fields.price && (
                    <p className="text-lg font-800 drop-shadow" style={{ color: brandKit?.secondary_color || '#FFD700' }}>
                      {fields.price}
                    </p>
                  )}

                  {/* Condition */}
                  {fields.condition && <p className="text-white/80 text-[10px] mt-0.5">{fields.condition}</p>}

                  {/* CTA */}
                  {fields.cta && (
                    <div className="mt-2 inline-block px-3 py-1 rounded-full text-[10px] font-600 text-white" style={{ backgroundColor: brandKit?.primary_color || '#e0604e' }}>
                      {fields.cta}
                    </div>
                  )}
                </div>

                {/* Logo top-left */}
                {brandKit?.logo_url && (
                  <div className="absolute top-3 left-3">
                    <img src={brandKit.logo_url} alt="Logo" className="h-8 object-contain drop-shadow" />
                  </div>
                )}

                {/* Contact top-right */}
                <div className="absolute top-3 right-3 text-right">
                  {brandKit?.instagram_handle && <p className="text-white/70 text-[8px] drop-shadow">{brandKit.instagram_handle}</p>}
                  {brandKit?.whatsapp && <p className="text-white/70 text-[8px] drop-shadow">{brandKit.whatsapp}</p>}
                </div>
              </div>
            </div>

            {/* Generated image result */}
            {generatedImageUrl && step === 5 && (
              <div className="mt-4 text-center">
                <p className="text-xs text-brand-400 mb-2">✅ Arte final gerada</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>}>
      <GenerateContent />
    </Suspense>
  );
}
