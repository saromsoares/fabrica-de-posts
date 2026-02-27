'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { toPng } from 'html-to-image';
import { Download, Copy, Check, Zap, ChevronRight, AlertTriangle, ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import { generateCaption, CAPTION_STYLES } from '@/lib/captions';
import { DEFAULT_TEMPLATES, DESIGN_STYLES, type DesignStyle } from '@/lib/default-templates';
import { useToast } from '@/components/Toast';
import Link from 'next/link';
import type { Product, Template, BrandKit, Category, Factory, CaptionStyle, UsageInfo, GenerationFields } from '@/types/database';

export default function EstudioPage() {
  const { productId } = useParams<{ productId: string }>();
  const supabase = createClient();
  const artRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  // Data
  const [product, setProduct] = useState<Product | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  // Selections
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [designStyle, setDesignStyle] = useState<DesignStyle>('oferta-varejo');
  const [fields, setFields] = useState<GenerationFields>({ price: '', condition: '', cta: 'Garanta o seu!' });
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('oferta');

  // States
  const [step, setStep] = useState(1); // 1=estilo, 2=dados, 3=preview, 4=download
  const [generating, setGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState<{ short: string; medium: string } | null>(null);
  const [aiCaption, setAiCaption] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load data com try/catch
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const [prodResult, tplsResult, bkResult, usageResult] = await Promise.allSettled([
          supabase.from('products').select('*, category:categories(*), factory:factories(*)').eq('id', productId).single(),
          supabase.from('templates').select('*').eq('active', true).order('name'),
          supabase.from('brand_kits').select('*').eq('user_id', user.id).single(),
          supabase.rpc('get_usage', { p_user_id: user.id }),
        ]);

        // Produto
        if (prodResult.status === 'fulfilled' && prodResult.value.data) {
          setProduct(prodResult.value.data as Product);
        } else {
          setLoadError('Produto não encontrado.');
        }

        // Templates: usar do banco ou fallback hardcoded
        if (tplsResult.status === 'fulfilled' && tplsResult.value.data && tplsResult.value.data.length > 0) {
          setTemplates(tplsResult.value.data as Template[]);
        } else {
          // Fallback: usar templates padrão hardcoded
          setTemplates(DEFAULT_TEMPLATES);
        }

        // Brand Kit
        if (bkResult.status === 'fulfilled' && bkResult.value.data) {
          setBrandKit(bkResult.value.data as BrandKit);
        }

        // Usage
        if (usageResult.status === 'fulfilled' && usageResult.value.data) {
          setUsage(usageResult.value.data as UsageInfo);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do estúdio:', err);
        setLoadError('Erro ao carregar dados. Tente recarregar a página.');
        addToast('Erro ao carregar dados do estúdio.', 'error');
      } finally {
        setLoadingData(false);
      }
    })();
  }, [supabase, productId]);

  // Selecionar template automaticamente baseado no estilo
  useEffect(() => {
    const styleToTemplateMap: Record<DesignStyle, string> = {
      'oferta-varejo': 'default-oferta',
      'minimalista': 'default-minimalista',
      'lancamento-moderno': 'default-lancamento',
    };
    const templateId = styleToTemplateMap[designStyle];
    const found = templates.find(t => t.id === templateId);
    if (found) {
      setSelectedTemplate(found);
    } else if (templates.length > 0) {
      // Se não encontrou o default, usa o primeiro
      setSelectedTemplate(templates[0]);
    }
  }, [designStyle, templates]);

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
      const { data: usageResult, error: usageErr } = await supabase.rpc('increment_usage', { p_user_id: userId });
      if (usageErr) {
        addToast('Erro ao verificar limite de uso.', 'error');
        setGenerating(false);
        return;
      }
      if (usageResult && !usageResult.allowed) {
        setUsage(usageResult as UsageInfo);
        addToast('Limite de artes atingido. Faça upgrade para continuar.', 'error');
        setGenerating(false);
        return;
      }

      // Render to PNG via html-to-image
      const dataUrl = await toPng(artRef.current, {
        width: 1080,
        height: 1080,
        pixelRatio: 1,
      });

      // Upload pro Supabase Storage
      let imageUrl = dataUrl;
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const filename = `${userId}/${Date.now()}.png`;
        const { error: uploadErr } = await supabase.storage.from('generated-arts').upload(filename, blob, { contentType: 'image/png' });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('generated-arts').getPublicUrl(filename);
          imageUrl = urlData.publicUrl;
        }
      } catch (uploadErr) {
        console.warn('Upload falhou, usando data URL local:', uploadErr);
      }

      setGeneratedImageUrl(imageUrl);

      // Salvar no histórico (generations)
      try {
        await supabase.from('generations').insert({
          user_id: userId,
          product_id: product?.id,
          template_id: selectedTemplate?.id?.startsWith('default-') ? null : selectedTemplate?.id,
          image_url: imageUrl,
          caption: aiCaption || caption?.medium || '',
          fields_data: fields,
          format: 'feed',
        });
      } catch (histErr) {
        console.warn('Erro ao salvar histórico:', histErr);
      }

      // Atualizar display de usage
      if (usageResult) setUsage({ ...usageResult, count: usageResult.count, remaining: usageResult.limit - usageResult.count } as UsageInfo);

      setStep(4);
      addToast('Arte gerada com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao gerar:', err);
      addToast('Erro ao gerar a arte. Tente novamente.', 'error');
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

  // Gerar legenda com IA (OpenAI)
  const handleGenerateAiCaption = async () => {
    if (!product || !brandKit) return;
    setAiLoading(true);
    setAiError(null);
    setAiCaption(null);

    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: product.name,
          price: fields.price || undefined,
          condition: fields.condition || undefined,
          whatsapp: brandKit.whatsapp || undefined,
          instagram: brandKit.instagram_handle || undefined,
          storeName: brandKit.store_name || undefined,
          factoryName: (product.factory as Factory)?.name || undefined,
          objective: captionStyle,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar legenda.');
      }

      setAiCaption(data.caption);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erro inesperado ao gerar legenda.');
    } finally {
      setAiLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm';

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={48} className="mx-auto text-orange-400 mb-4" />
        <p className="text-dark-400 mb-4">{loadError || 'Produto não encontrado.'}</p>
        <Link href="/dashboard/produtos" className="text-brand-400 hover:text-brand-300 text-sm">← Voltar ao catálogo</Link>
      </div>
    );
  }

  const stepLabels = ['Estilo', 'Dados', 'Preview', 'Download'];

  // ===== RENDER FUNCTIONS PARA OS 3 ESTILOS DE PREVIEW =====

  const renderOfertaVarejo = () => (
    <div
      ref={artRef}
      className="relative overflow-hidden"
      style={{ width: 320, height: 320 }}
    >
      {/* Background: gradiente agressivo com cor primária */}
      <div className="absolute inset-0" style={{
        background: `linear-gradient(135deg, ${brandKit?.primary_color || '#e0604e'} 0%, ${adjustColor(brandKit?.primary_color || '#e0604e', -40)} 100%)`,
      }} />

      {/* Faixa diagonal decorativa */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rotate-12 opacity-20" style={{
        background: brandKit?.secondary_color || '#FFD700',
      }} />

      {/* Badge "OFERTA" no topo */}
      <div className="absolute top-0 left-0 right-0 flex justify-center">
        <div className="px-6 py-1.5 text-[10px] font-800 uppercase tracking-widest text-white" style={{
          background: `linear-gradient(90deg, transparent, ${brandKit?.secondary_color || '#FFD700'}40, transparent)`,
        }}>
          OFERTA ESPECIAL
        </div>
      </div>

      {/* Logo do Lojista */}
      {brandKit?.logo_url && (
        <div className="absolute top-3 left-3 z-10">
          <img src={brandKit.logo_url} alt="Logo" className="h-7 object-contain drop-shadow-lg" />
        </div>
      )}

      {/* Logo da Fábrica */}
      {(product.factory as Factory)?.logo_url && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-white/15 backdrop-blur-sm rounded-lg p-1">
            <img src={(product.factory as Factory).logo_url!} alt="" className="h-4 object-contain" />
          </div>
        </div>
      )}

      {/* Imagem do produto */}
      {product.image_url && (
        <div className="absolute inset-0 flex items-center justify-center pt-4">
          <img src={product.image_url} alt="" className="max-w-[65%] max-h-[45%] object-contain drop-shadow-2xl" style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))' }} />
        </div>
      )}

      {/* Faixa inferior com preço gigante */}
      <div className="absolute bottom-0 left-0 right-0" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}>
        {/* Nome do produto */}
        <div className="px-4 pt-6">
          <p className="text-white font-800 text-sm leading-tight drop-shadow-lg uppercase">{product.name}</p>
        </div>

        {/* Preço em destaque GIGANTE */}
        {fields.price && (
          <div className="px-4 py-1">
            <p className="font-900 text-3xl drop-shadow-lg tracking-tight" style={{ color: brandKit?.secondary_color || '#FFD700' }}>
              {fields.price}
            </p>
          </div>
        )}

        {/* Condição */}
        {fields.condition && (
          <div className="px-4">
            <span className="inline-block px-2 py-0.5 rounded text-[9px] font-600 text-white" style={{ backgroundColor: `${brandKit?.secondary_color || '#FFD700'}50` }}>
              {fields.condition}
            </span>
          </div>
        )}

        {/* CTA */}
        {fields.cta && (
          <div className="px-4 pb-3 pt-2">
            <div className="inline-block px-4 py-1.5 rounded-full text-[10px] font-700 text-white uppercase tracking-wide animate-pulse" style={{
              backgroundColor: brandKit?.secondary_color || '#FFD700',
              color: '#000',
            }}>
              {fields.cta}
            </div>
          </div>
        )}

        {/* Contato */}
        <div className="px-4 pb-2 flex items-center gap-3">
          {brandKit?.instagram_handle && <p className="text-white/60 text-[8px]">{brandKit.instagram_handle}</p>}
          {brandKit?.whatsapp && <p className="text-white/60 text-[8px]">{brandKit.whatsapp}</p>}
        </div>
      </div>
    </div>
  );

  const renderMinimalista = () => (
    <div
      ref={artRef}
      className="relative overflow-hidden"
      style={{ width: 320, height: 320, backgroundColor: '#f8f9fa' }}
    >
      {/* Background clean */}
      <div className="absolute inset-0" style={{ backgroundColor: '#f8f9fa' }} />

      {/* Linha decorativa sutil no topo */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: brandKit?.primary_color || '#1a1b2e' }} />

      {/* Logo do Lojista */}
      {brandKit?.logo_url && (
        <div className="absolute top-4 left-4 z-10">
          <img src={brandKit.logo_url} alt="Logo" className="h-6 object-contain" style={{ filter: 'brightness(0.3)' }} />
        </div>
      )}

      {/* Logo da Fábrica */}
      {(product.factory as Factory)?.logo_url && (
        <div className="absolute top-4 right-4 z-10 opacity-40">
          <img src={(product.factory as Factory).logo_url!} alt="" className="h-4 object-contain" style={{ filter: 'grayscale(1)' }} />
        </div>
      )}

      {/* Imagem do produto - DESTAQUE TOTAL */}
      {product.image_url && (
        <div className="absolute inset-0 flex items-center justify-center">
          <img src={product.image_url} alt="" className="max-w-[70%] max-h-[55%] object-contain" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))' }} />
        </div>
      )}

      {/* Info inferior - tipografia fina e elegante */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-[#1a1b2e] font-500 text-sm leading-tight tracking-tight">{product.name}</p>
        {fields.price && (
          <p className="font-600 text-xl mt-1 tracking-tight" style={{ color: brandKit?.primary_color || '#1a1b2e' }}>
            {fields.price}
          </p>
        )}
        {fields.condition && <p className="text-[#8b8da5] text-[10px] mt-0.5 font-400">{fields.condition}</p>}
        {fields.cta && (
          <div className="mt-2">
            <span className="text-[10px] font-500 tracking-wide uppercase border-b pb-0.5" style={{ color: brandKit?.primary_color || '#1a1b2e', borderColor: brandKit?.primary_color || '#1a1b2e' }}>
              {fields.cta}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 mt-2">
          {brandKit?.instagram_handle && <p className="text-[#b4b5c5] text-[8px]">{brandKit.instagram_handle}</p>}
          {brandKit?.whatsapp && <p className="text-[#b4b5c5] text-[8px]">{brandKit.whatsapp}</p>}
        </div>
      </div>
    </div>
  );

  const renderLancamentoModerno = () => (
    <div
      ref={artRef}
      className="relative overflow-hidden"
      style={{ width: 320, height: 320 }}
    >
      {/* Background escuro com gradiente */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1040 50%, #0a0a1a 100%)',
      }} />

      {/* Efeito de brilho/glow sutil */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10" style={{
        background: `radial-gradient(circle, ${brandKit?.primary_color || '#a78bfa'} 0%, transparent 70%)`,
      }} />

      {/* Grid pattern sutil */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Logo do Lojista */}
      {brandKit?.logo_url && (
        <div className="absolute top-3 left-3 z-10">
          <img src={brandKit.logo_url} alt="Logo" className="h-6 object-contain drop-shadow" />
        </div>
      )}

      {/* Badge "NOVO" glassmorphism */}
      <div className="absolute top-3 right-3 z-10">
        <div className="px-3 py-1 rounded-full text-[9px] font-700 uppercase tracking-widest" style={{
          background: 'rgba(167, 139, 250, 0.15)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(167, 139, 250, 0.2)',
          color: '#a78bfa',
        }}>
          Novo
        </div>
      </div>

      {/* Logo da Fábrica */}
      {(product.factory as Factory)?.logo_url && (
        <div className="absolute top-10 right-3 z-10">
          <div className="rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(4px)' }}>
            <img src={(product.factory as Factory).logo_url!} alt="" className="h-3.5 object-contain opacity-60" />
          </div>
        </div>
      )}

      {/* Imagem do produto com glow */}
      {product.image_url && (
        <div className="absolute inset-0 flex items-center justify-center pt-2">
          <div className="relative">
            <div className="absolute inset-0 blur-2xl opacity-20" style={{ background: brandKit?.primary_color || '#a78bfa' }} />
            <img src={product.image_url} alt="" className="relative max-w-[200px] max-h-[150px] object-contain" style={{ filter: 'drop-shadow(0 8px 32px rgba(167, 139, 250, 0.3))' }} />
          </div>
        </div>
      )}

      {/* Info inferior - glassmorphism card */}
      <div className="absolute bottom-3 left-3 right-3 z-10">
        <div className="rounded-xl p-3" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <p className="text-white/90 font-600 text-sm leading-tight">{product.name}</p>
          {fields.price && (
            <p className="font-700 text-2xl mt-1" style={{ color: '#a78bfa' }}>
              {fields.price}
            </p>
          )}
          {fields.condition && <p className="text-white/40 text-[10px] mt-0.5">{fields.condition}</p>}
          {fields.cta && (
            <div className="mt-2 inline-block px-3 py-1 rounded-full text-[9px] font-600" style={{
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              color: '#fff',
            }}>
              {fields.cta}
            </div>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            {brandKit?.instagram_handle && <p className="text-white/30 text-[7px]">{brandKit.instagram_handle}</p>}
            {brandKit?.whatsapp && <p className="text-white/30 text-[7px]">{brandKit.whatsapp}</p>}
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizar preview baseado no estilo selecionado
  const renderPreview = () => {
    switch (designStyle) {
      case 'oferta-varejo': return renderOfertaVarejo();
      case 'minimalista': return renderMinimalista();
      case 'lancamento-moderno': return renderLancamentoModerno();
      default: return renderOfertaVarejo();
    }
  };

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

          {/* Step 1: Escolher Estilo de Design */}
          {step === 1 && (
            <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6">
              <h2 className="font-display font-700 mb-2">Escolha o estilo do post</h2>
              <p className="text-sm text-dark-400 mb-4">Selecione um dos 3 estilos de design. O preview muda em tempo real.</p>

              <div className="space-y-3">
                {DESIGN_STYLES.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => setDesignStyle(style.value)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      designStyle === style.value
                        ? 'border-brand-500/50 bg-brand-600/10'
                        : 'border-dark-800/40 hover:border-dark-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{style.icon}</span>
                      <div className="flex-1">
                        <p className="font-600 text-sm">{style.label}</p>
                        <p className="text-[11px] text-dark-400 mt-0.5">{style.description}</p>
                      </div>
                      {designStyle === style.value && (
                        <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <button onClick={() => setStep(2)}
                className="w-full mt-4 py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-xl transition-all">
                Continuar →
              </button>
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
                <p>🎨 <span className="text-white">{DESIGN_STYLES.find(s => s.value === designStyle)?.label}</span></p>
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
                <h2 className="font-display font-700 mb-4 text-brand-400">Arte gerada!</h2>
                <button onClick={handleDownload}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-xl transition-all flex items-center justify-center gap-2">
                  <Download size={18} /> Baixar PNG
                </button>
              </div>

              {caption && (
                <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-4">
                  <h3 className="font-display font-600">Legendas prontas</h3>

                  {/* Botão Gerar com IA */}
                  <div className="bg-gradient-to-r from-purple-500/10 to-brand-500/10 border border-purple-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={16} className="text-purple-400" />
                      <span className="text-sm font-600 text-purple-300">Legenda com IA</span>
                    </div>
                    <p className="text-xs text-dark-400 mb-3">Gere uma legenda persuasiva criada por inteligência artificial.</p>
                    <button
                      onClick={handleGenerateAiCaption}
                      disabled={aiLoading}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-600 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      {aiLoading ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Escrevendo com IA...</>
                      ) : aiCaption ? (
                        <><RefreshCw size={14} /> Gerar outra legenda</>
                      ) : (
                        <><Sparkles size={14} /> Gerar Legenda com IA</>
                      )}
                    </button>
                  </div>

                  {/* Erro da IA */}
                  {aiError && (
                    <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                      {aiError}
                    </div>
                  )}

                  {/* Resultado da IA */}
                  {aiCaption && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-purple-400 flex items-center gap-1"><Sparkles size={10} /> Legenda IA</span>
                        <button onClick={() => handleCopyCaption(aiCaption)}
                          className="text-xs text-dark-400 hover:text-white flex items-center gap-1 transition-colors">
                          {copiedCaption ? <Check size={12} /> : <Copy size={12} />} Copiar
                        </button>
                      </div>
                      <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl text-sm text-dark-200 whitespace-pre-wrap">{aiCaption}</div>
                    </div>
                  )}

                  {/* Legendas automáticas */}
                  <div className="pt-2 border-t border-dark-800/30">
                    <p className="text-[11px] text-dark-500 mb-3">Ou use uma legenda automática:</p>

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

                    <div className="mt-3">
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
                </div>
              )}

              <div className="flex gap-3">
                <Link href={product.factory_id ? `/dashboard/produtos/${product.factory_id}` : '/dashboard/produtos'}
                  className="flex-1 py-3 bg-dark-800 hover:bg-dark-700 text-white font-600 rounded-xl transition-all text-center text-sm">
                  ← Voltar aos produtos
                </Link>
                <button onClick={() => { setStep(1); setGeneratedImageUrl(null); setCaption(null); setAiCaption(null); setAiError(null); setFields({ price: '', condition: '', cta: 'Garanta o seu!' }); }}
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-500 text-dark-400">Preview</h3>
              <span className="text-[10px] text-dark-500 px-2 py-0.5 bg-dark-800 rounded-full">
                {DESIGN_STYLES.find(s => s.value === designStyle)?.icon} {DESIGN_STYLES.find(s => s.value === designStyle)?.label}
              </span>
            </div>
            <div className="flex justify-center">
              {renderPreview()}
            </div>

            {generatedImageUrl && step === 4 && (
              <div className="mt-4 text-center">
                <p className="text-xs text-brand-400">Arte final gerada com sucesso</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility: ajustar cor (escurecer/clarear)
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}
