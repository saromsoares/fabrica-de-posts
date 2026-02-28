'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { toPng } from 'html-to-image';
import { Download, Copy, Check, Zap, ChevronRight, AlertTriangle, ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import { generateCaption } from '@/lib/captions';
import { extractError } from '@/lib/utils';
import Link from 'next/link';
import type { Product, BrandKit, Category, Factory, CaptionStyle, UsageInfo, GenerationFields } from '@/types/database';
import { extractDominantColor, getSmartLogoStyle, extractBgColorFromStyle, type LogoStyle } from '@/lib/image-processing';
import { uploadImage } from '@/lib/upload';

/* ═══════════════════════════════════════════════════════
   10 TEMPLATES VISUAIS PRÉ-PROGRAMADOS
   ═══════════════════════════════════════════════════════ */

type VisualTemplate = {
  id: string;
  name: string;
  description: string;
  format: 'feed' | 'story';
  emoji: string;
  bgStyle: (primary: string, secondary: string) => React.CSSProperties;
  overlayStyle: () => React.CSSProperties;
  productImgClass: string;
  priceStyle: (secondary: string) => React.CSSProperties;
  priceClass: string;
  nameClass: string;
  ctaBg: (primary: string) => string;
  ctaClass: string;
  accentElement?: (primary: string, secondary: string) => React.ReactNode;
  badgeColor: string;
};

const VISUAL_TEMPLATES: VisualTemplate[] = [
  {
    id: 'varejo-agressivo',
    name: 'Varejo Agressivo',
    description: 'Preço gigante, cores fortes, urgência',
    format: 'feed',
    emoji: '🔥',
    bgStyle: (p, s) => ({ background: `linear-gradient(135deg, ${p} 0%, #1a1a2e 50%, ${s} 100%)` }),
    overlayStyle: () => ({ background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.85))' }),
    productImgClass: 'max-w-[65%] max-h-[55%] object-contain drop-shadow-2xl',
    priceStyle: () => ({ color: '#FFD700', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }),
    priceClass: 'text-3xl font-900 tracking-tight',
    nameClass: 'text-white font-800 text-base leading-tight drop-shadow-lg',
    ctaBg: () => '#e53e3e',
    ctaClass: 'text-xs font-700 uppercase tracking-wider px-4 py-1.5 rounded-full',
    accentElement: () => (
      <div className="absolute top-0 right-0 w-24 h-24 bg-red-600 rounded-bl-full flex items-center justify-center">
        <span className="text-white font-900 text-xs -rotate-12 translate-x-2 -translate-y-1">OFERTA!</span>
      </div>
    ),
    badgeColor: 'bg-red-500',
  },
  {
    id: 'minimalista-premium',
    name: 'Minimalista Premium',
    description: 'Fundo limpo, tipografia elegante',
    format: 'feed',
    emoji: '✨',
    bgStyle: () => ({ background: '#fafafa' }),
    overlayStyle: () => ({}),
    productImgClass: 'max-w-[60%] max-h-[55%] object-contain',
    priceStyle: () => ({ color: '#1a1a1a' }),
    priceClass: 'text-2xl font-300 tracking-wider',
    nameClass: 'text-gray-900 font-300 text-sm tracking-widest uppercase',
    ctaBg: () => '#1a1a1a',
    ctaClass: 'text-[10px] font-400 uppercase tracking-[0.2em] px-5 py-2 rounded-none border border-gray-900',
    badgeColor: 'bg-gray-800',
  },
  {
    id: 'lancamento-dark',
    name: 'Lançamento Dark',
    description: 'Fundo escuro, glassmorphism, moderno',
    format: 'feed',
    emoji: '🚀',
    bgStyle: () => ({ background: 'linear-gradient(160deg, #18181b 0%, #0f0f23 50%, #1e1b4b 100%)' }),
    overlayStyle: () => ({ background: 'linear-gradient(transparent, rgba(15,15,35,0.9))' }),
    productImgClass: 'max-w-[60%] max-h-[50%] object-contain drop-shadow-[0_0_30px_rgba(139,92,246,0.3)]',
    priceStyle: () => ({ color: '#a78bfa' }),
    priceClass: 'text-2xl font-700',
    nameClass: 'text-white/90 font-500 text-sm',
    ctaBg: () => 'rgba(139,92,246,0.3)',
    ctaClass: 'text-[10px] font-500 px-4 py-1.5 rounded-full border border-purple-500/30 backdrop-blur-sm',
    accentElement: () => (
      <>
        <div className="absolute top-4 left-4 px-3 py-1 bg-purple-500/20 backdrop-blur-md rounded-full border border-purple-500/30">
          <span className="text-purple-300 text-[10px] font-600 uppercase tracking-wider">Novo</span>
        </div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl" />
      </>
    ),
    badgeColor: 'bg-purple-500',
  },
  {
    id: 'queima-estoque',
    name: 'Queima de Estoque',
    description: 'Fita de perigo, urgência máxima',
    format: 'feed',
    emoji: '⚡',
    bgStyle: () => ({ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1f00 100%)' }),
    overlayStyle: () => ({ background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.8))' }),
    productImgClass: 'max-w-[65%] max-h-[50%] object-contain drop-shadow-xl',
    priceStyle: () => ({ color: '#facc15' }),
    priceClass: 'text-3xl font-900',
    nameClass: 'text-white font-700 text-sm leading-tight',
    ctaBg: () => '#f59e0b',
    ctaClass: 'text-[10px] font-800 uppercase tracking-wider px-4 py-1.5 rounded-sm text-black',
    accentElement: () => (
      <>
        <div className="absolute top-0 left-0 right-0 h-6 bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_10px,#1a1a1a_10px,#1a1a1a_20px)] opacity-80" />
        <div className="absolute left-0 right-0 h-6 bg-[repeating-linear-gradient(-45deg,#f59e0b,#f59e0b_10px,#1a1a1a_10px,#1a1a1a_20px)] opacity-80" style={{ bottom: 60 }} />
      </>
    ),
    badgeColor: 'bg-amber-500',
  },
  {
    id: 'institucional-clean',
    name: 'Institucional Clean',
    description: 'Bordas arredondadas, corporativo',
    format: 'feed',
    emoji: '🏢',
    bgStyle: (p) => ({ background: `linear-gradient(180deg, ${p}15 0%, #ffffff 100%)` }),
    overlayStyle: () => ({}),
    productImgClass: 'max-w-[55%] max-h-[50%] object-contain',
    priceStyle: (s) => ({ color: s || '#2563eb' }),
    priceClass: 'text-xl font-600',
    nameClass: 'text-gray-800 font-600 text-sm',
    ctaBg: (p) => p,
    ctaClass: 'text-[10px] font-500 px-4 py-1.5 rounded-full',
    accentElement: (p) => (
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: p }} />
    ),
    badgeColor: 'bg-blue-500',
  },
  {
    id: 'oferta-relampago',
    name: 'Oferta Relâmpago',
    description: 'Gradientes vibrantes, energia',
    format: 'feed',
    emoji: '⚡',
    bgStyle: () => ({ background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f97316 100%)' }),
    overlayStyle: () => ({ background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.6))' }),
    productImgClass: 'max-w-[60%] max-h-[50%] object-contain drop-shadow-2xl',
    priceStyle: () => ({ color: '#ffffff', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }),
    priceClass: 'text-3xl font-900',
    nameClass: 'text-white font-700 text-sm drop-shadow',
    ctaBg: () => 'rgba(255,255,255,0.25)',
    ctaClass: 'text-[10px] font-700 uppercase px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/30',
    accentElement: () => (
      <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1">
        <span className="text-white text-[10px] font-700">⚡ RELÂMPAGO</span>
      </div>
    ),
    badgeColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
  },
  {
    id: 'foco-produto',
    name: 'Foco no Produto',
    description: 'Foto ocupa 80% do espaço',
    format: 'feed',
    emoji: '📸',
    bgStyle: (p) => ({ background: `linear-gradient(180deg, ${p}22 0%, ${p}44 100%)` }),
    overlayStyle: () => ({ background: 'linear-gradient(transparent 65%, rgba(0,0,0,0.7))' }),
    productImgClass: 'max-w-[85%] max-h-[75%] object-contain drop-shadow-xl',
    priceStyle: () => ({ color: '#ffffff' }),
    priceClass: 'text-xl font-700',
    nameClass: 'text-white/90 font-500 text-xs',
    ctaBg: (p) => p,
    ctaClass: 'text-[9px] font-600 px-3 py-1 rounded-full',
    badgeColor: 'bg-emerald-500',
  },
  {
    id: 'tech-automotivo',
    name: 'Tech / Automotivo',
    description: 'Fundo escuro texturizado, tech',
    format: 'feed',
    emoji: '🏎️',
    bgStyle: () => ({
      background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #0c0c0c 100%)',
      backgroundImage: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #0c0c0c 100%), repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(255,255,255,0.03) 50px)',
    }),
    overlayStyle: () => ({ background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.8))' }),
    productImgClass: 'max-w-[70%] max-h-[55%] object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.2)]',
    priceStyle: () => ({ color: '#3b82f6' }),
    priceClass: 'text-2xl font-800 font-mono',
    nameClass: 'text-white font-600 text-sm uppercase tracking-wider',
    ctaBg: () => '#3b82f6',
    ctaClass: 'text-[10px] font-600 uppercase tracking-wider px-4 py-1.5 rounded-sm',
    accentElement: () => (
      <>
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
        <div className="absolute bottom-16 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      </>
    ),
    badgeColor: 'bg-blue-600',
  },
  {
    id: 'elegancia-degrade',
    name: 'Elegância em Degradê',
    description: 'Gradiente suave com cor primária',
    format: 'feed',
    emoji: '🎨',
    bgStyle: (p) => ({ background: `linear-gradient(160deg, ${p} 0%, ${p}88 40%, ${p}33 100%)` }),
    overlayStyle: () => ({ background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.5))' }),
    productImgClass: 'max-w-[60%] max-h-[55%] object-contain drop-shadow-xl',
    priceStyle: () => ({ color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }),
    priceClass: 'text-2xl font-700',
    nameClass: 'text-white/95 font-500 text-sm',
    ctaBg: () => 'rgba(255,255,255,0.2)',
    ctaClass: 'text-[10px] font-500 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/20',
    badgeColor: 'bg-pink-500',
  },
  {
    id: 'story-interativo',
    name: 'Story Interativo',
    description: 'Layout vertical para stories',
    format: 'story',
    emoji: '📱',
    bgStyle: (p) => ({ background: `linear-gradient(180deg, ${p} 0%, #0a0a0a 100%)` }),
    overlayStyle: () => ({ background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.8))' }),
    productImgClass: 'max-w-[75%] max-h-[45%] object-contain drop-shadow-2xl',
    priceStyle: () => ({ color: '#ffffff' }),
    priceClass: 'text-3xl font-900',
    nameClass: 'text-white font-700 text-base text-center',
    ctaBg: (p) => p,
    ctaClass: 'text-xs font-700 uppercase px-6 py-2 rounded-full tracking-wider',
    accentElement: () => (
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <span className="text-white/50 text-[10px] tracking-[0.3em] uppercase">Arraste para cima</span>
      </div>
    ),
    badgeColor: 'bg-teal-500',
  },
];

const OBJECTIVE_OPTIONS = [
  { value: 'oferta', label: '🔥 Venda Direta / Oferta', hint: 'Foco em preço e conversão' },
  { value: 'estoque_limitado', label: '⚡ Criar Urgência', hint: 'Escassez e FOMO' },
  { value: 'lancamento', label: '🚀 Lançamento / Novidade', hint: 'Curiosidade e empolgação' },
  { value: 'institucional', label: '🏢 Institucional', hint: 'Confiança e profissionalismo' },
  { value: 'beneficio', label: '💡 Benefícios / Educação', hint: 'Vantagens do produto' },
];

/* ═══════════════════════════════════════════════════════
   EXPORT CANVAS CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════════ */

const CANVAS = { feed: { w: 1080, h: 1080 }, story: { w: 1080, h: 1920 } };
const PREVIEW = { feed: { w: 320, h: 320 }, story: { w: 270, h: 480 } };
const SAFE_PAD = 48; // 48px safe zone em canvas 1080

/** Porcentagens de zona RÍGIDAS (somam ~100% do espaço interno) */
const ZONES = {
  feed:  { header: 13, body: 55, footer: 28, gap: 4 },
  story: { header: 8,  body: 54, footer: 34, gap: 4 },
};

function twFs(cls: string): number {
  if (cls.includes('text-3xl')) return 30;
  if (cls.includes('text-2xl')) return 24;
  if (cls.includes('text-xl')) return 20;
  if (cls.includes('text-base')) return 16;
  if (cls.includes('text-sm')) return 14;
  if (cls.includes('text-xs')) return 12;
  const m = cls.match(/text-\[(\d+)px\]/);
  if (m) return parseInt(m[1]);
  return 14;
}

function twFw(cls: string): number {
  const m = cls.match(/font-(\d{3})/);
  return m ? parseInt(m[1]) : 600;
}

function twColor(cls: string): string {
  if (cls.includes('text-white/95')) return 'rgba(255,255,255,0.95)';
  if (cls.includes('text-white/90')) return 'rgba(255,255,255,0.9)';
  if (cls.includes('text-white/80')) return 'rgba(255,255,255,0.8)';
  if (cls.includes('text-white')) return '#ffffff';
  if (cls.includes('text-gray-900')) return '#111827';
  if (cls.includes('text-gray-800')) return '#1f2937';
  if (cls.includes('text-black')) return '#000000';
  return '#ffffff';
}

function twTracking(cls: string): string | undefined {
  if (cls.includes('tracking-tight')) return '-0.025em';
  if (cls.includes('tracking-wider')) return '0.05em';
  if (cls.includes('tracking-widest')) return '0.1em';
  const m = cls.match(/tracking-\[([^\]]+)\]/);
  return m ? m[1] : undefined;
}

function twRadius(cls: string): string {
  if (cls.includes('rounded-full')) return '9999px';
  if (cls.includes('rounded-none')) return '0';
  if (cls.includes('rounded-sm')) return '4px';
  return '8px';
}


/* ═══════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL DO ESTÚDIO
   ═══════════════════════════════════════════════════════ */

export default function EstudioPage() {
  const { productId } = useParams<{ productId: string }>();
  const supabase = createClient();
  const exportRef = useRef<HTMLDivElement>(null);

  // Data
  const [product, setProduct] = useState<Product | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  // Selections
  const [selectedTemplate, setSelectedTemplate] = useState<VisualTemplate | null>(null);
  const [fields, setFields] = useState<GenerationFields>({ price: '', condition: '', cta: 'Garanta o seu!' });
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('oferta');

  // States
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState<{ short: string; medium: string } | null>(null);
  const [aiCaption, setAiCaption] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [logoDominantColor, setLogoDominantColor] = useState<string | null>(null);
  const [logoStyle, setLogoStyle] = useState<LogoStyle | null>(null);

  // Load data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (!cancelled) setUserId(user.id);
      const [{ data: prod }, { data: bk }, { data: usageData }] = await Promise.all([
        supabase.from('products').select('id, name, description, category_id, factory_id, image_url, tags, active, created_at, updated_at, category:categories(id, name, slug, created_at), factory:factories(id, name, logo_url, active, created_at)').eq('id', productId).single(),
        supabase.from('brand_kits').select('id, user_id, logo_url, primary_color, secondary_color, store_name, instagram_handle, whatsapp').eq('user_id', user.id).single(),
        supabase.rpc('get_usage', { p_user_id: user.id }),
      ]);
      if (!cancelled) {
        if (prod) setProduct(prod as Product);
        if (bk) setBrandKit(bk as BrandKit);
        if (usageData) setUsage(usageData as UsageInfo);
        setLoadingData(false);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase, productId]);

  const primary = brandKit?.primary_color || '#e0604e';
  const secondary = brandKit?.secondary_color || '#1a1b2e';

  // Extrair cor dominante da logo quando brandKit carrega
  useEffect(() => {
    if (!brandKit?.logo_url) return;
    let cancelled = false;
    extractDominantColor(brandKit.logo_url)
      .then(color => { if (!cancelled) setLogoDominantColor(color); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [brandKit?.logo_url]);

  // Recalcular estilo da logo quando template ou cor mudam
  useEffect(() => {
    if (!logoDominantColor || !selectedTemplate) {
      setLogoStyle(null);
      return;
    }
    const bgColor = extractBgColorFromStyle(
      selectedTemplate.bgStyle(primary, secondary)
    );
    const style = getSmartLogoStyle(logoDominantColor, bgColor);
    setLogoStyle(style);
  }, [logoDominantColor, selectedTemplate, primary, secondary]);

  const isOverLimit = usage ? usage.remaining <= 0 : false;

  // Generate local caption
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

  // Gerar IA copy
  const handleGenerateAiCaption = async () => {
    if (!product || !brandKit) return;
    setAiLoading(true);
    setAiError(null);
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
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar legenda.');
      setAiCaption(data.caption);
    } catch (err) {
      setAiError(extractError(err));
    } finally {
      setAiLoading(false);
    }
  };

  // Gerar arte + legenda (usa exportRef — nó offscreen em 1080px)
  const handleGenerateAll = async () => {
    if (!exportRef.current || !userId || isOverLimit) return;
    setGenerating(true);
    try {
      const { data: usageResult } = await supabase.rpc('increment_usage', { p_user_id: userId });
      if (usageResult && !usageResult.allowed) {
        setUsage(usageResult as UsageInfo);
        setGenerating(false);
        return;
      }

      const isStory = selectedTemplate?.format === 'story';
      const exportW = isStory ? CANVAS.story.w : CANVAS.feed.w;
      const exportH = isStory ? CANVAS.story.h : CANVAS.feed.h;

      // html-to-image: captura APENAS o nó de export offscreen
      // backgroundColor: null → sem fundo artificial, usa bgStyle do template
      const dataUrl = await toPng(exportRef.current, {
        width: exportW,
        height: exportH,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: null as unknown as string,
      });

      // Upload (Cloudinary com fallback Supabase)
      const fetchRes = await fetch(dataUrl);
      const blob = await fetchRes.blob();
      const filename = `${userId}/${Date.now()}.png`;
      let imageUrl = dataUrl;
      try {
        const result = await uploadImage(blob, 'fabrica/generated-arts', filename, { contentType: 'image/png' });
        imageUrl = result.url;
      } catch (err) {
        console.error('Upload fallback para dataUrl:', err);
      }
      setGeneratedImageUrl(imageUrl);

      // Gerar IA copy em paralelo (não bloqueia)
      handleGenerateAiCaption();

      // Salvar no histórico
      await supabase.from('generations').insert({
        user_id: userId,
        product_id: product?.id,
        template_id: null,
        image_url: imageUrl,
        caption: caption?.medium || '',
        fields_data: fields,
        format: selectedTemplate?.format || 'feed',
      });

      if (usageResult) setUsage({ ...usageResult, count: usageResult.count, remaining: usageResult.limit - usageResult.count } as UsageInfo);
      setStep(4);
    } catch (err) {
      console.error('Erro ao gerar:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Download
  const handleDownload = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    const safeName = product?.name?.replace(/[^a-zA-Z0-9\u00C0-\u00FA]/g, '-').replace(/-+/g, '-').toLowerCase() || 'arte';
    link.download = `${safeName}-${selectedTemplate?.format || 'feed'}-${Date.now()}.png`;
    link.href = generatedImageUrl;
    link.click();
  };

  const handleCopyCaption = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleReset = () => {
    setStep(1);
    setSelectedTemplate(null);
    setGeneratedImageUrl(null);
    setCaption(null);
    setAiCaption(null);
    setAiError(null);
    setFields({ price: '', condition: '', cta: 'Garanta o seu!' });
  };

  const inputClass = 'w-full px-4 py-3 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm';
  const tpl = selectedTemplate || VISUAL_TEMPLATES[0];
  const fmt = tpl.format;
  const canvasW = CANVAS[fmt].w;
  const canvasH = CANVAS[fmt].h;
  const previewW = PREVIEW[fmt].w;
  const previewH = PREVIEW[fmt].h;
  const previewScale = previewW / canvasW;
  const S = canvasW / 320; // fator de escala preview → canvas (~3.375)


  /* ─── Art content render (shared by preview + export) ─── */
  const renderArtContent = () => {
    const nameFs = Math.round(twFs(tpl.nameClass) * S);
    const nameFw = twFw(tpl.nameClass);
    const nameColor = twColor(tpl.nameClass);
    const nameTracking = twTracking(tpl.nameClass);
    const nameUpper = tpl.nameClass.includes('uppercase');
    const nameCenter = tpl.nameClass.includes('text-center');
    const nameShadow = tpl.nameClass.includes('drop-shadow') ? '0 2px 4px rgba(0,0,0,0.5)' : undefined;

    const priceFs = Math.round(twFs(tpl.priceClass) * S);
    const priceFw = twFw(tpl.priceClass);
    const priceTracking = twTracking(tpl.priceClass);
    const priceMono = tpl.priceClass.includes('font-mono');

    const ctaFs = Math.round(twFs(tpl.ctaClass) * S);
    const ctaFw = twFw(tpl.ctaClass);
    const ctaUpper = tpl.ctaClass.includes('uppercase');
    const ctaTracking = twTracking(tpl.ctaClass);
    const ctaRadius = twRadius(tpl.ctaClass);
    const ctaBorder = tpl.ctaClass.includes('border') ? '2px solid' : undefined;
    const ctaBorderColor = tpl.ctaClass.includes('border-white/30') ? 'rgba(255,255,255,0.3)'
      : tpl.ctaClass.includes('border-white/20') ? 'rgba(255,255,255,0.2)'
      : tpl.ctaClass.includes('border-purple-500/30') ? 'rgba(139,92,246,0.3)'
      : tpl.ctaClass.includes('border-gray-900') ? '#111827'
      : undefined;
    const ctaTextColor = tpl.ctaClass.includes('text-black') ? '#000000' : '#ffffff';
    const ctaBackdrop = tpl.ctaClass.includes('backdrop-blur') ? 'blur(8px)' : undefined;

    const isLight = tpl.id === 'minimalista-premium' || tpl.id === 'institucional-clean';
    const condColor = isLight ? '#4b5563' : 'rgba(255,255,255,0.8)';
    const contactFs = Math.round(8 * S);
    const condFs = Math.round(10 * S);
    const accentRefW = 320;
    const accentRefH = fmt === 'story' ? Math.round(480 * (320 / 270)) : 320;

    const zone = ZONES[fmt];
    const innerH = canvasH - SAFE_PAD * 2;
    const gapPx = Math.round(innerH * zone.gap / 100);

    return (
      <>
        {/* Layer 0: Accent elements (decorativos — fora do safe zone, com overflow clipping) */}
        {tpl.accentElement && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            overflow: 'hidden',
            transformOrigin: 'top left',
            transform: `scale(${S})`,
            width: accentRefW, height: accentRefH,
          }}>
            {tpl.accentElement(primary, secondary)}
          </div>
        )}

        {/* Layer 1: Overlay gradient */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, ...tpl.overlayStyle() }} />

        {/* Layer 2: Zone layout rígido com safe zones */}
        <div style={{
          position: 'absolute', inset: 0,
          padding: SAFE_PAD,
          display: 'flex', flexDirection: 'column',
          gap: gapPx,
          zIndex: 3,
          overflow: 'hidden',
        }}>

          {/* ══════ HEADER ZONE — Logos ══════ */}
          <div style={{
            flex: `0 0 ${zone.header}%`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            zIndex: 30,
            overflow: 'hidden',
            minHeight: 0,
          }}>
            {/* Logo da loja (brand kit) */}
            {brandKit?.logo_url && (
              <div style={{
                maxWidth: '45%',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                <img
                  src={brandKit.logo_url}
                  alt="Logo"
                  crossOrigin="anonymous"
                  style={{
                    height: Math.round(24 * S),
                    maxWidth: '100%',
                    objectFit: 'contain',
                    filter: logoStyle?.filter || 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                    display: 'block',
                  }}
                />
              </div>
            )}
            {/* Logo da fábrica */}
            {(product?.factory as Factory)?.logo_url && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                maxWidth: '40%',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: Math.round(4 * S),
                  padding: Math.round(4 * S),
                  maxWidth: '100%',
                }}>
                  <img
                    src={(product!.factory as Factory).logo_url!}
                    alt=""
                    crossOrigin="anonymous"
                    style={{
                      height: Math.round(16 * S),
                      maxWidth: Math.round(100 * S),
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </div>
                <span style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: Math.round(5 * S),
                  marginTop: Math.round(2 * S),
                  fontWeight: 500,
                }}>Produto oficial</span>
              </div>
            )}
          </div>

          {/* ══════ BODY ZONE — Imagem do produto ══════ */}
          <div style={{
            flex: `0 0 ${zone.body}%`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            zIndex: 10,
            minHeight: 0,
          }}>
            {product?.image_url && (
              <img
                src={product.image_url}
                alt=""
                crossOrigin="anonymous"
                style={{
                  maxWidth: '85%',
                  maxHeight: '95%',
                  objectFit: 'contain',
                  filter: tpl.productImgClass.includes('drop-shadow') ? 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))' : undefined,
                  display: 'block',
                }}
              />
            )}
          </div>

          {/* ══════ FOOTER ZONE — Texto + CTA + Contato ══════ */}
          <div style={{
            flex: `0 0 ${zone.footer}%`,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'flex-end',
            zIndex: 20,
            textAlign: nameCenter ? 'center' : 'left',
            overflow: 'hidden',
            minHeight: 0,
          }}>
            {/* Product name — line-clamp 2 com word break */}
            <p style={{
              fontSize: nameFs, fontWeight: nameFw, color: nameColor,
              letterSpacing: nameTracking,
              textTransform: nameUpper ? 'uppercase' : undefined,
              textShadow: nameShadow, lineHeight: 1.2,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              margin: 0,
            }}>
              {product?.name}
            </p>

            {/* Preço */}
            {fields.price && (
              <p style={{
                fontSize: priceFs, fontWeight: priceFw,
                letterSpacing: priceTracking,
                fontFamily: priceMono ? 'ui-monospace, monospace' : undefined,
                lineHeight: 1.1, marginTop: Math.round(4 * S),
                whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
                ...tpl.priceStyle(secondary),
              }}>
                {fields.price}
              </p>
            )}

            {/* Condição */}
            {fields.condition && (
              <p style={{
                fontSize: condFs, color: condColor,
                marginTop: Math.round(2 * S), lineHeight: 1.3,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word',
              }}>
                {fields.condition}
              </p>
            )}

            {/* CTA */}
            {fields.cta && (
              <div style={{
                marginTop: Math.round(6 * S),
                display: 'inline-block',
                alignSelf: nameCenter ? 'center' : 'flex-start',
                backgroundColor: tpl.ctaBg(primary),
                color: ctaTextColor,
                fontSize: ctaFs, fontWeight: ctaFw,
                textTransform: ctaUpper ? 'uppercase' : undefined,
                letterSpacing: ctaTracking, borderRadius: ctaRadius,
                border: ctaBorder, borderColor: ctaBorderColor,
                backdropFilter: ctaBackdrop,
                padding: `${Math.round(5 * S)}px ${Math.round(14 * S)}px`,
                whiteSpace: 'nowrap',
                maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {fields.cta}
              </div>
            )}

            {/* Contato */}
            {(brandKit?.instagram_handle || brandKit?.whatsapp) && (
              <div style={{
                marginTop: Math.round(6 * S),
                textAlign: 'right', alignSelf: 'flex-end',
                maxWidth: '60%',
                overflow: 'hidden',
              }}>
                {brandKit?.instagram_handle && (
                  <p style={{
                    fontSize: contactFs, color: isLight ? '#6b7280' : 'rgba(255,255,255,0.7)',
                    lineHeight: 1.4, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    margin: 0,
                  }}>
                    {brandKit.instagram_handle}
                  </p>
                )}
                {brandKit?.whatsapp && (
                  <p style={{
                    fontSize: contactFs, color: isLight ? '#6b7280' : 'rgba(255,255,255,0.7)',
                    lineHeight: 1.4, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    margin: 0,
                  }}>
                    {brandKit.whatsapp}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

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
      {/* ══════ OFFSCREEN EXPORT NODE ══════
          Nó dedicado em tamanho EXATO (1080×1080 ou 1080×1920).
          position: absolute + clip wrapper (NÃO fixed — Safari bug)
          overflow: hidden garante que nada vaza do canvas. */}
      <div aria-hidden="true" style={{
        position: 'absolute', left: -9999, top: -9999,
        width: 0, height: 0, overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        <div
          ref={exportRef}
          style={{
            width: canvasW, height: canvasH,
            position: 'relative', overflow: 'hidden',
            ...tpl.bgStyle(primary, secondary),
          }}
        >
          {renderArtContent()}
        </div>
      </div>

      {/* Header */}
      <div className="mb-6">
        <Link href={product.factory_id ? `/dashboard/produtos/${product.factory_id}` : '/dashboard/produtos'}
          className="inline-flex items-center gap-1.5 text-sm text-dark-400 hover:text-white transition-colors mb-3">
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
            {product.category && <p className="text-sm text-dark-400">{(product.category as Category).name}</p>}
          </div>
        </div>
      </div>

      {/* Usage warning */}
      {isOverLimit && (
        <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={20} className="text-orange-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-orange-300 font-600">Limite atingido!</p>
            <p className="text-xs text-orange-400/70">Você usou {usage?.count}/{usage?.limit} artes do plano {usage?.plan}.</p>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        {stepLabels.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <button onClick={() => { if (i + 1 < step) setStep(i + 1); }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-600 transition-all ${
                step > i + 1 ? 'bg-brand-600 text-white' :
                step === i + 1 ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' :
                'bg-dark-800 text-dark-500'
              }`}>
              {step > i + 1 ? <Check size={14} /> : i + 1}
            </button>
            <span className={`hidden sm:inline ${step === i + 1 ? 'text-white' : 'text-dark-500'}`}>{s}</span>
            {i < 3 && <ChevronRight size={14} className="text-dark-700" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═════ LADO ESQUERDO: Steps ═════ */}
        <div className="space-y-6">

          {/* STEP 1: Escolher Template */}
          {step === 1 && (
            <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6">
              <h2 className="font-display font-700 mb-1">Escolha o template</h2>
              <p className="text-dark-500 text-sm mb-4">10 estilos visuais. Clique para selecionar.</p>
              <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {VISUAL_TEMPLATES.map((t) => (
                  <button key={t.id}
                    onClick={() => { setSelectedTemplate(t); setStep(2); }}
                    className={`text-left rounded-xl border p-3 transition-all ${
                      selectedTemplate?.id === t.id
                        ? 'border-brand-500/50 bg-brand-600/10 ring-1 ring-brand-500/20'
                        : 'border-dark-800/40 hover:border-dark-700 hover:bg-dark-800/30'
                    }`}>
                    <div className={`${t.format === 'story' ? 'aspect-[9/16]' : 'aspect-square'} rounded-lg overflow-hidden mb-2 relative`}
                      style={t.bgStyle(primary, secondary)}>
                      <div className="absolute inset-0 flex items-center justify-center text-2xl">{t.emoji}</div>
                      <div className={`absolute bottom-1 left-1 w-2 h-2 rounded-full ${t.badgeColor}`} />
                    </div>
                    <p className="text-sm font-500 truncate">{t.name}</p>
                    <p className="text-[10px] text-dark-500">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Dados + Objetivo */}
          {step === 2 && (
            <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-4">
              <h2 className="font-display font-700 mb-2">Dados do post</h2>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Preço Promocional</label>
                <input type="text" value={fields.price || ''} onChange={(e) => setFields({ ...fields, price: e.target.value })}
                  className={inputClass} placeholder="R$ 199,90" />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Condições de Pagamento</label>
                <input type="text" value={fields.condition || ''} onChange={(e) => setFields({ ...fields, condition: e.target.value })}
                  className={inputClass} placeholder="12x sem juros, Frete grátis..." />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">CTA (chamada para ação)</label>
                <input type="text" value={fields.cta || ''} onChange={(e) => setFields({ ...fields, cta: e.target.value })}
                  className={inputClass} placeholder="Garanta o seu!" />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Objetivo do Post (para a legenda IA)</label>
                <select value={captionStyle} onChange={e => setCaptionStyle(e.target.value as CaptionStyle)}
                  className={`${inputClass} bg-dark-950`}>
                  {OBJECTIVE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-dark-500 mt-1">
                  {OBJECTIVE_OPTIONS.find(o => o.value === captionStyle)?.hint}
                </p>
              </div>
              <button onClick={() => setStep(3)}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-xl transition-all">
                Ver preview →
              </button>
            </div>
          )}

          {/* STEP 3: Preview + Gerar */}
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
                <p>📝 Objetivo: {OBJECTIVE_OPTIONS.find(o => o.value === captionStyle)?.label}</p>
              </div>
              <button onClick={handleGenerateAll} disabled={generating || isOverLimit}
                className="w-full py-4 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 disabled:opacity-40 text-white font-display font-600 text-lg rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand-600/20">
                {generating ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Gerando Arte + Legenda...</>
                ) : (
                  <><Zap size={20} /> Gerar Arte e Legenda</>
                )}
              </button>
            </div>
          )}

          {/* STEP 4: Download + Legenda */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6">
                <h2 className="font-display font-700 mb-4 text-brand-400">Arte gerada! 🎉</h2>
                <button onClick={handleDownload}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-xl transition-all flex items-center justify-center gap-2">
                  <Download size={18} /> Baixar Imagem PNG
                </button>
              </div>

              <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-400" />
                  <h3 className="font-display font-600">Legenda para Instagram</h3>
                </div>

                {aiLoading && (
                  <div className="flex items-center gap-3 p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                    <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                    <span className="text-sm text-purple-300">Escrevendo legenda com IA...</span>
                  </div>
                )}

                {aiError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                    {aiError}
                  </div>
                )}

                {aiCaption && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-purple-400 flex items-center gap-1"><Sparkles size={10} /> Gerada por IA</span>
                      <button onClick={() => handleCopyCaption(aiCaption)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-500 rounded-lg transition-all">
                        {copiedCaption ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar Texto</>}
                      </button>
                    </div>
                    <textarea
                      value={aiCaption}
                      onChange={e => setAiCaption(e.target.value)}
                      className="w-full p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl text-sm text-dark-200 resize-y min-h-[120px] focus:outline-none focus:border-purple-500/30"
                      rows={6}
                    />
                    <button onClick={handleGenerateAiCaption} disabled={aiLoading}
                      className="mt-2 w-full py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 text-xs font-500 rounded-xl transition-all flex items-center justify-center gap-1.5">
                      <RefreshCw size={12} /> Gerar outra legenda
                    </button>
                  </div>
                )}

                {caption && !aiCaption && !aiLoading && (
                  <div className="pt-2 border-t border-dark-800/30">
                    <p className="text-[11px] text-dark-500 mb-3">Legendas automáticas (enquanto a IA carrega):</p>
                    <div className="p-3 bg-dark-950 rounded-xl text-sm text-dark-200 whitespace-pre-wrap">{caption.medium}</div>
                    <button onClick={() => handleCopyCaption(caption.medium)}
                      className="mt-2 text-xs text-dark-400 hover:text-white flex items-center gap-1 transition-colors">
                      <Copy size={12} /> Copiar
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Link href={product.factory_id ? `/dashboard/produtos/${product.factory_id}` : '/dashboard/produtos'}
                  className="flex-1 py-3 bg-dark-800 hover:bg-dark-700 text-white font-600 rounded-xl transition-all text-center text-sm">
                  ← Voltar
                </Link>
                <button onClick={handleReset}
                  className="flex-1 py-3 bg-dark-800 hover:bg-dark-700 text-white font-600 rounded-xl transition-all text-sm">
                  Criar outra arte
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═════ LADO DIREITO: Preview (CSS transform scale do canvas 1080) ═════ */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-500 text-dark-400">Preview</h3>
              {selectedTemplate && <span className="text-[10px] text-dark-500">{selectedTemplate.name} • {canvasW}×{canvasH}</span>}
            </div>
            <div className="flex justify-center">
              <div style={{ width: previewW, height: previewH, overflow: 'hidden', borderRadius: 8 }}>
                <div style={{
                  width: canvasW, height: canvasH,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                  position: 'relative', overflow: 'hidden',
                  ...tpl.bgStyle(primary, secondary),
                }}>
                  {renderArtContent()}
                </div>
              </div>
            </div>
            {generatedImageUrl && step === 4 && (
              <div className="mt-4 text-center">
                <p className="text-xs text-brand-400">✅ Arte final gerada ({canvasW}×{canvasH} @2x)</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
