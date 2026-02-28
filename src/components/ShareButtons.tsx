'use client';

import { useState } from 'react';
import { Copy, Check, Download, Share2, MessageCircle } from 'lucide-react';

interface ShareButtonsProps {
  imageUrl: string;
  caption?: string;
  productName?: string;
  whatsapp?: string;
  instagram?: string;
  className?: string;
  compact?: boolean;
}

export default function ShareButtons({
  imageUrl,
  caption,
  productName,
  className = '',
  compact = false,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCaption = () => {
    if (!caption) return;
    navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    const safeName = productName
      ?.replace(/[^a-zA-Z0-9\u00C0-\u00FA]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase() || 'arte';
    link.download = `${safeName}-${Date.now()}.png`;
    link.href = imageUrl;
    link.click();
  };

  const handleWhatsApp = () => {
    const text = caption
      ? encodeURIComponent(caption)
      : encodeURIComponent(`Confira: ${productName || 'Nosso produto'}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    try {
      if (imageUrl.startsWith('http')) {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const file = new File([blob], 'arte.png', { type: 'image/png' });
        await navigator.share({
          title: productName || 'Arte gerada',
          text: caption || '',
          files: [file],
        });
      } else {
        await navigator.share({
          title: productName || 'Arte gerada',
          text: caption || '',
        });
      }
    } catch {
      // Usuário cancelou — silencioso
    }
  };

  const btnBase = compact
    ? 'p-2 rounded-lg text-xs'
    : 'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-500';
  const btnStyle = `${btnBase} transition-all`;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Download */}
      <button
        onClick={handleDownload}
        className={`${btnStyle} bg-brand-600/20 text-brand-400 hover:bg-brand-600/30`}
        title="Baixar PNG"
      >
        <Download size={compact ? 14 : 16} />
        {!compact && 'Baixar'}
      </button>

      {/* Copiar legenda */}
      {caption && (
        <button
          onClick={handleCopyCaption}
          className={`${btnStyle} ${copied ? 'bg-green-600/20 text-green-400' : 'bg-dark-700/50 text-dark-300 hover:bg-dark-700/80 hover:text-white'}`}
          title="Copiar legenda"
        >
          {copied ? <Check size={compact ? 14 : 16} /> : <Copy size={compact ? 14 : 16} />}
          {!compact && (copied ? 'Copiado!' : 'Legenda')}
        </button>
      )}

      {/* WhatsApp */}
      <button
        onClick={handleWhatsApp}
        className={`${btnStyle} bg-green-600/20 text-green-400 hover:bg-green-600/30`}
        title="Compartilhar no WhatsApp"
      >
        <MessageCircle size={compact ? 14 : 16} />
        {!compact && 'WhatsApp'}
      </button>

      {/* Native Share (mobile) */}
      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
        <button
          onClick={handleNativeShare}
          className={`${btnStyle} bg-purple-600/20 text-purple-400 hover:bg-purple-600/30`}
          title="Compartilhar"
        >
          <Share2 size={compact ? 14 : 16} />
          {!compact && 'Compartilhar'}
        </button>
      )}
    </div>
  );
}
