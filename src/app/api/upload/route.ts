import { NextRequest, NextResponse } from 'next/server';
import { generateCloudinarySignature } from '@/lib/cloudinary';

/* ─── Rate limiter simples em memória (por IP) ─── */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 30;       // uploads/min
const RATE_LIMIT_WINDOW = 60000; // 1 minuto

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Limpar expirados a cada 5min
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 300000);

/* ─── Validação de arquivo ─── */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_FOLDERS = ['fabrica/products', 'fabrica/factories', 'fabrica/brand-kits', 'fabrica/generated-arts'];

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Muitos uploads. Aguarde 1 minuto.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') as string;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Arquivo obrigatório.' }, { status: 400 });
    }

    if (!folder || !ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json(
        { error: `Pasta inválida. Permitidas: ${ALLOWED_FOLDERS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validar tipo
    const fileType = file.type || 'application/octet-stream';
    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: `Tipo não permitido: ${fileType}. Use JPEG, PNG, WebP, SVG ou GIF.` },
        { status: 400 }
      );
    }

    // Validar tamanho
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Arquivo grande demais (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 10MB.` },
        { status: 400 }
      );
    }

    // ─── Cloudinary Upload (se configurado) ───
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      return await uploadToCloudinary(file, folder, cloudName, apiKey);
    }

    // ─── Fallback: retorno sem upload (client lida com Supabase Storage) ───
    return NextResponse.json(
      { error: 'Cloudinary não configurado. Configure NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.', fallback: true },
      { status: 501 }
    );

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Erro interno no upload. Tente novamente.' },
      { status: 500 }
    );
  }
}

/* ─── Cloudinary signed upload ─── */
async function uploadToCloudinary(
  file: Blob,
  folder: string,
  cloudName: string,
  apiKey: string
): Promise<NextResponse> {
  const params: Record<string, string> = { folder };

  const { signature, timestamp } = await generateCloudinarySignature(params);

  const uploadForm = new FormData();
  uploadForm.append('file', file);
  uploadForm.append('folder', folder);
  uploadForm.append('api_key', apiKey);
  uploadForm.append('timestamp', String(timestamp));
  uploadForm.append('signature', signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: uploadForm }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error('Cloudinary error:', errData);
    return NextResponse.json(
      { error: `Erro Cloudinary: ${errData?.error?.message || res.statusText}` },
      { status: res.status }
    );
  }

  const data = await res.json();

  return NextResponse.json({
    url: data.secure_url,
    public_id: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
  });
}
