// ============================================================
// Validador de upload client-side
// Regras buscadas da Edge Function (fonte única) com fallback local
// DEVE ser idêntico às regras da Edge Function validate-upload v4
// ============================================================

export type UploadType = 'logo' | 'product' | 'template' | 'brand-logo';

export interface UploadRule {
  formats: string[];
  format_labels: string[];
  aspect_ratio?: number;
  aspect_tolerance?: number;
  min_width: number;
  min_height: number;
  max_size_mb: number;
  description: string;
  error_messages: {
    invalid_format: string;
    too_large: string;
    too_small: string;
    wrong_ratio: string;
    wrong_dimensions?: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  metadata?: {
    width: number;
    height: number;
    size_bytes: number;
    content_type: string;
    format?: 'feed' | 'story' | null;
  };
}

// ============================================================
// FALLBACK — DEVE SER IDÊNTICO À EDGE FUNCTION validate-upload v4
// Atualizar aqui SE mudar no backend (raro)
// ============================================================
const FALLBACK_RULES: Record<UploadType, UploadRule> = {
  logo: {
    formats: ['image/png'],
    format_labels: ['PNG'],
    aspect_ratio: 1,
    aspect_tolerance: 0.05,
    min_width: 500,
    min_height: 500,
    max_size_mb: 5,
    description: 'Logo da fábrica — PNG quadrado, mínimo 500×500px, máximo 5MB',
    error_messages: {
      invalid_format: 'Use arquivo PNG para o logo.',
      too_large: 'Logo muito grande. Máximo: 5MB.',
      too_small: 'Resolução muito baixa. Mínimo: 500×500px.',
      wrong_ratio: 'O logo deve ser quadrado (proporção 1:1).',
    },
  },
  'brand-logo': {
    formats: ['image/png'],
    format_labels: ['PNG'],
    aspect_ratio: 1,
    aspect_tolerance: 0.05,
    min_width: 500,
    min_height: 500,
    max_size_mb: 5,
    description: 'Logo da loja — PNG quadrado, mínimo 500×500px, máximo 5MB',
    error_messages: {
      invalid_format: 'Use arquivo PNG para o logo da loja.',
      too_large: 'Logo muito grande. Máximo: 5MB.',
      too_small: 'Resolução muito baixa. Mínimo: 500×500px.',
      wrong_ratio: 'O logo deve ser quadrado (proporção 1:1).',
    },
  },
  product: {
    formats: ['image/png'],
    format_labels: ['PNG'],
    aspect_ratio: 1,
    aspect_tolerance: 0.05,
    min_width: 1080,
    min_height: 1080,
    max_size_mb: 10,
    description: 'Foto do produto — PNG quadrado, mínimo 1080×1080px, máximo 10MB',
    error_messages: {
      invalid_format: 'Use arquivo PNG para a foto do produto.',
      too_large: 'Imagem muito grande. Máximo: 10MB.',
      too_small: 'Resolução muito baixa. Mínimo: 1080×1080px.',
      wrong_ratio: 'A foto deve ser quadrada (proporção 1:1).',
    },
  },
  template: {
    formats: ['image/png', 'image/jpeg'],
    format_labels: ['PNG', 'JPEG'],
    min_width: 1080,
    min_height: 1080,
    max_size_mb: 15,
    description: 'Preview do template — PNG ou JPEG, 1080×1080 (Feed) ou 1080×1920 (Story), máximo 15MB',
    error_messages: {
      invalid_format: 'Use arquivo PNG ou JPEG para o template.',
      too_large: 'Arquivo muito grande. Máximo: 15MB.',
      too_small: 'Resolução muito baixa. Mínimo: 1080×1080px.',
      wrong_ratio: '',
      wrong_dimensions: 'Use 1080×1080 (Feed) ou 1080×1920 (Story).',
    },
  },
};

// Cache das regras buscadas do backend (TTL: sessão)
let cachedRules: Record<UploadType, UploadRule> | null = null;

/**
 * Buscar regras do backend (fonte única de verdade).
 * Usa fallback local se a chamada falhar.
 */
export async function getUploadRules(): Promise<Record<UploadType, UploadRule>> {
  if (cachedRules) return cachedRules;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return FALLBACK_RULES;

    const res = await fetch(`${supabaseUrl}/functions/v1/validate-upload`, {
      method: 'GET',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.rules) {
        cachedRules = data.rules as Record<UploadType, UploadRule>;
        return cachedRules;
      }
    }
  } catch {
    // Fallback silencioso — não bloquear o usuário
  }

  return FALLBACK_RULES;
}

/**
 * Retorna a regra para um tipo de upload (sync, usando fallback).
 * Usar quando não puder aguardar a Promise de getUploadRules().
 */
export function getUploadRule(type: UploadType): UploadRule {
  return (cachedRules ?? FALLBACK_RULES)[type];
}

/**
 * Invalidar cache (chamar após mudanças nas regras do backend).
 */
export function invalidateUploadRulesCache(): void {
  cachedRules = null;
}

/**
 * Validar arquivo no client ANTES de enviar ao backend.
 * Retorna { valid: true, metadata } ou { valid: false, error: "mensagem" }
 *
 * Fluxo:
 *   1. Formato (MIME type)
 *   2. Tamanho (bytes)
 *   3. Dimensões mínimas (carrega imagem no browser)
 *   4. Aspect ratio (se definido na regra)
 *   5. Dimensões exatas (apenas para template)
 */
export async function validateFile(
  file: File,
  type: UploadType
): Promise<ValidationResult> {
  const rules = getUploadRule(type);

  // 1. Formato
  if (!rules.formats.includes(file.type)) {
    return { valid: false, error: rules.error_messages.invalid_format };
  }

  // 2. Tamanho
  const maxBytes = rules.max_size_mb * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: rules.error_messages.too_large };
  }

  // 3. Dimensões (precisa carregar a imagem no browser)
  const dimensions = await getImageDimensions(file);
  if (!dimensions) {
    return { valid: false, error: 'Não foi possível ler a imagem.' };
  }

  const { width, height } = dimensions;

  if (width < rules.min_width || height < rules.min_height) {
    return {
      valid: false,
      error: `${rules.error_messages.too_small} Recebido: ${width}×${height}px.`,
    };
  }

  // 4. Aspect ratio
  if (rules.aspect_ratio) {
    const ratio = width / height;
    const tolerance = rules.aspect_tolerance ?? 0.05;
    if (Math.abs(ratio - rules.aspect_ratio) > tolerance) {
      return {
        valid: false,
        error: `${rules.error_messages.wrong_ratio} Recebido: ${width}×${height}px.`,
      };
    }
  }

  // 5. Template: dimensões exatas (Feed 1080×1080 ou Story 1080×1920)
  if (type === 'template') {
    const isValidFeed = width === 1080 && height === 1080;
    const isValidStory = width === 1080 && height === 1920;
    if (!isValidFeed && !isValidStory) {
      return {
        valid: false,
        error: `${rules.error_messages.wrong_dimensions ?? 'Dimensões inválidas.'} Recebido: ${width}×${height}px.`,
      };
    }
  }

  const detectedFormat: 'feed' | 'story' | null =
    type === 'template' ? (height === 1920 ? 'story' : 'feed') : null;

  return {
    valid: true,
    metadata: {
      width,
      height,
      size_bytes: file.size,
      content_type: file.type,
      format: detectedFormat,
    },
  };
}

/**
 * Helper: ler dimensões de uma imagem no browser via Image API.
 * Revoga o ObjectURL após leitura para evitar memory leak.
 */
function getImageDimensions(
  file: File
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * Accept string para o <input type="file" accept="...">
 * Ex: "image/png" ou "image/png,image/jpeg"
 */
export function getAcceptString(type: UploadType): string {
  return getUploadRule(type).formats.join(',');
}

/**
 * Texto de ajuda para exibir abaixo do input de upload.
 * Ex: "Logo da fábrica — PNG quadrado, mínimo 500×500px, máximo 5MB"
 */
export function getUploadHint(type: UploadType): string {
  return getUploadRule(type).description;
}
