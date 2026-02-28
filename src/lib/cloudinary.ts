/**
 * cloudinary.ts
 *
 * Integração com Cloudinary:
 * - uploadToCloudinary(): wrapper client-side que chama /api/upload
 * - cldUrl(): transformações de URL (auto-format, auto-quality, resize, crop)
 * - cldThumb(): thumbnail quadrada com smart crop
 * - cldOptimized(): auto-format + auto-quality sem resize
 * - isCloudinaryUrl(): detect Cloudinary URLs
 *
 * Credenciais ficam APENAS no server (/api/upload/route.ts).
 * Client usa apenas o cloud_name público para montar URLs.
 */

/* ══════════════════════════════════════════════
   CLOUD NAME (público — usado em URLs)
   ══════════════════════════════════════════════ */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';

/* ══════════════════════════════════════════════
   CLIENT: Upload wrapper
   ══════════════════════════════════════════════ */

/**
 * Upload seguro via /api/upload (credenciais no server).
 * Retorna a URL pública otimizada do Cloudinary.
 * Se Cloudinary não configurado, faz fallback para Supabase Storage via API.
 */
export async function uploadToCloudinary(
  file: File | Blob,
  folder: string
): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Erro ao fazer upload');
  }

  return { url: data.url, publicId: data.public_id };
}

/* ══════════════════════════════════════════════
   URL TRANSFORMS (client-safe, zero dependências)
   ══════════════════════════════════════════════ */

export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com');
}

/**
 * Constrói URL Cloudinary com transformações.
 * Se a URL não é do Cloudinary, retorna sem alteração.
 *
 * Exemplo:
 *   cldUrl(url, 'w_400,h_400,c_fill,f_auto,q_auto')
 *   → https://res.cloudinary.com/xxx/image/upload/w_400,h_400,c_fill,f_auto,q_auto/v123/folder/img.jpg
 */
export function cldUrl(url: string, transforms: string): string {
  if (!isCloudinaryUrl(url)) return url;

  // Cloudinary URL format: .../image/upload/v123456/folder/file.ext
  // Insert transforms after /upload/
  return url.replace(
    /\/image\/upload\//,
    `/image/upload/${transforms}/`
  );
}

/**
 * Thumbnail quadrada com smart crop.
 * Usa g_auto (smart gravity) para focar no conteúdo principal.
 */
export function cldThumb(url: string, size = 200): string {
  return cldUrl(url, `w_${size},h_${size},c_fill,g_auto,f_auto,q_auto`);
}

/**
 * Imagem otimizada sem resize (auto-format + auto-quality).
 * Serve WebP/AVIF quando o browser suporta.
 */
export function cldOptimized(url: string): string {
  return cldUrl(url, 'f_auto,q_auto');
}

/**
 * Imagem com largura máxima (mantém aspect ratio).
 */
export function cldResize(url: string, maxWidth: number): string {
  return cldUrl(url, `w_${maxWidth},c_limit,f_auto,q_auto`);
}

/**
 * Logo com fundo removido (transparente).
 * Usa e_background_removal do Cloudinary AI.
 */
export function cldRemoveBg(url: string): string {
  return cldUrl(url, 'e_background_removal,f_auto,q_auto');
}

/**
 * Smart URL: se é Cloudinary → otimiza, senão → retorna original.
 * Útil para renderizar imagens que podem vir de Supabase Storage (legacy)
 * ou Cloudinary (novo).
 */
export function smartImageUrl(url: string | null | undefined, transforms?: string): string {
  if (!url) return '';
  if (!isCloudinaryUrl(url)) return url;
  return transforms ? cldUrl(url, transforms) : cldOptimized(url);
}

/* ══════════════════════════════════════════════
   SERVER: Signing (importado apenas pelo API route)
   ══════════════════════════════════════════════ */

/**
 * Gera timestamp + signature para upload assinado.
 * APENAS para uso server-side (API route).
 */
export async function generateCloudinarySignature(
  params: Record<string, string>
): Promise<{ signature: string; timestamp: number }> {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) throw new Error('CLOUDINARY_API_SECRET não configurado');

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsWithTimestamp: Record<string, string> = { ...params, timestamp: String(timestamp) };

  // Ordenar e concatenar params (spec Cloudinary)
  const sortedParams = Object.keys(paramsWithTimestamp)
    .sort()
    .map(k => `${k}=${paramsWithTimestamp[k]}`)
    .join('&');

  const stringToSign = sortedParams + apiSecret;

  // SHA-1 via Web Crypto API (Node.js 18+ / Edge Runtime)
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return { signature, timestamp };
}
