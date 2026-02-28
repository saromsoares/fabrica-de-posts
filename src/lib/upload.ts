/**
 * upload.ts
 *
 * Upload unificado: tenta Cloudinary → fallback Supabase Storage.
 * Transparente para os componentes — sempre retorna { url }.
 */

import { createClient } from '@/lib/supabase-browser';

type UploadResult = {
  url: string;
  source: 'cloudinary' | 'supabase';
};

/** Mapa de folders Cloudinary → buckets Supabase */
const FOLDER_TO_BUCKET: Record<string, string> = {
  'fabrica/products': 'products',
  'fabrica/factories': 'factories',
  'fabrica/brand-kits': 'brand-kits',
  'fabrica/generated-arts': 'generated-arts',
};

/**
 * Faz upload de imagem:
 * 1. Tenta Cloudinary (via /api/upload)
 * 2. Se não configurado (501) → fallback para Supabase Storage
 *
 * @param file - Arquivo ou Blob para upload
 * @param folder - Pasta Cloudinary (ex: 'fabrica/products')
 * @param filename - Nome do arquivo para Supabase fallback (ex: 'produto-123.png')
 * @param options - contentType para Supabase fallback
 */
export async function uploadImage(
  file: File | Blob,
  folder: string,
  filename: string,
  options?: { contentType?: string; upsert?: boolean }
): Promise<UploadResult> {
  // 1. Tentar Cloudinary
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      return { url: data.url, source: 'cloudinary' };
    }

    // Se não é 501 (not configured), é erro real
    if (res.status !== 501) {
      const errData = await res.json().catch(() => ({ error: 'Erro no upload' }));
      throw new Error(errData.error || `Upload falhou (${res.status})`);
    }

    // 501 = Cloudinary não configurado → fallback
  } catch (err) {
    // Se é TypeError (network error) → tenta fallback
    // Se é Error com mensagem real → propaga
    if (err instanceof Error && !err.message.includes('fetch')) {
      const isRealError = err.message.includes('Tipo não permitido')
        || err.message.includes('grande demais')
        || err.message.includes('Muitos uploads')
        || err.message.includes('Erro Cloudinary');
      if (isRealError) throw err;
    }
  }

  // 2. Fallback: Supabase Storage
  const bucket = FOLDER_TO_BUCKET[folder];
  if (!bucket) throw new Error(`Bucket não encontrado para folder: ${folder}`);

  const supabase = createClient();
  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(filename, file, {
      contentType: options?.contentType || (file instanceof File ? file.type : 'image/png'),
      upsert: options?.upsert || false,
    });

  if (uploadErr) throw new Error(`Erro no upload: ${uploadErr.message}`);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
  return { url: urlData.publicUrl, source: 'supabase' };
}
