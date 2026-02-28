/**
 * Image Processing Utilities
 * - Extrai cor dominante de imagens via canvas
 * - Calcula contraste WCAG para smart logo styling
 */

export type LogoStyle = {
  filter?: string;
  background?: string;
  padding?: string;
  borderRadius?: string;
};

/**
 * Extrai a cor dominante de uma imagem via canvas sampling.
 * Retorna hex string (ex: "#e0604e").
 */
export async function extractDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve('#888888'); return; }

        // Sample em tamanho reduzido para performance
        const size = 50;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0, g = 0, b = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          // Ignorar pixels transparentes
          if (alpha < 128) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }

        if (count === 0) { resolve('#888888'); return; }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
        resolve(hex);
      } catch {
        resolve('#888888');
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Calcula luminância relativa de uma cor hex (WCAG 2.0).
 */
function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Calcula o contrast ratio entre duas cores hex (WCAG 2.0).
 */
function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Extrai a cor de fundo de um React.CSSProperties (bgStyle).
 * Retorna hex ou fallback '#ffffff'.
 */
export function extractBgColorFromStyle(style: React.CSSProperties): string {
  const bg = (style.background || style.backgroundColor || '') as string;

  // Hex direto
  const hexMatch = bg.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  if (hexMatch) return hexMatch[0];

  // rgb/rgba
  const rgbMatch = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return '#' + [r, g, b].map(c => parseInt(c).toString(16).padStart(2, '0')).join('');
  }

  // Gradient — pegar a primeira cor
  const gradMatch = bg.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
  if (gradMatch) return gradMatch[0];

  return '#ffffff';
}

/**
 * Determina o estilo ideal para a logo com base no contraste
 * entre a cor dominante da logo e o fundo do template.
 *
 * - Se contraste >= 3:1 → logo sem alteração (boa visibilidade)
 * - Se contraste < 3:1 → adiciona pill branco/escuro atrás da logo
 */
export function getSmartLogoStyle(logoDominantColor: string, bgColor: string): LogoStyle {
  const contrast = getContrastRatio(logoDominantColor, bgColor);

  // Contraste suficiente — logo fica como está
  if (contrast >= 3) {
    return {};
  }

  // Contraste insuficiente — adicionar pill de fundo
  const bgLuminance = getLuminance(bgColor);
  const isLightBg = bgLuminance > 0.5;

  return {
    background: isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)',
    padding: '6px 12px',
    borderRadius: '8px',
  };
}
