/**
 * image-validator.ts
 *
 * @deprecated Este arquivo está DEPRECIADO desde Março/2026.
 * Use `@/lib/upload-validator` como fonte única de verdade para validação de uploads.
 *
 * Migração:
 *   - validateLogo(file)        → validateFile(file, 'logo')
 *   - validateProductImage(file) → validateFile(file, 'product')
 *   - validateTemplate(file)     → validateFile(file, 'template')
 *
 * Componente unificado: `@/components/ui/FileUpload`
 *
 * Este arquivo será removido após confirmação de que nenhum componente ativo o importa.
 */

type ValidationResult = {
  valid: boolean;
  error?: string;
};

type TemplateValidationResult = ValidationResult & {
  format?: 'feed' | 'story';
};

/**
 * Lê as dimensões de um arquivo de imagem usando Image + createObjectURL.
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem.'));
    };
    img.src = url;
  });
}

/**
 * Valida logo (fábrica ou brand kit).
 * - Apenas PNG
 * - Proporção 1:1 (width === height)
 * - Mínimo 500x500px
 */
export async function validateLogo(file: File): Promise<ValidationResult> {
  // Verificar tipo
  if (file.type !== 'image/png') {
    return {
      valid: false,
      error: 'A logo deve ser um arquivo PNG. Outros formatos não são aceitos.',
    };
  }

  // Verificar dimensões
  try {
    const { width, height } = await getImageDimensions(file);

    if (width !== height) {
      return {
        valid: false,
        error: `A logo deve ter proporção 1:1 (quadrada). A imagem enviada tem ${width}x${height}px.`,
      };
    }

    if (width < 500) {
      return {
        valid: false,
        error: `A logo deve ter no mínimo 500x500px. A imagem enviada tem ${width}x${height}px.`,
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Não foi possível ler as dimensões da imagem.' };
  }
}

/**
 * Valida imagem de produto.
 * - Apenas PNG
 * - Proporção 1:1 (width === height)
 * - Mínimo 1080x1080px
 */
export async function validateProductImage(file: File): Promise<ValidationResult> {
  // Verificar tipo
  if (file.type !== 'image/png') {
    return {
      valid: false,
      error: 'A imagem do produto deve ser um arquivo PNG. Outros formatos não são aceitos.',
    };
  }

  // Verificar dimensões
  try {
    const { width, height } = await getImageDimensions(file);

    if (width !== height) {
      return {
        valid: false,
        error: `A imagem do produto deve ter proporção 1:1 (quadrada). A imagem enviada tem ${width}x${height}px.`,
      };
    }

    if (width < 1080) {
      return {
        valid: false,
        error: `A imagem do produto deve ter no mínimo 1080x1080px. A imagem enviada tem ${width}x${height}px.`,
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Não foi possível ler as dimensões da imagem.' };
  }
}

/**
 * Valida imagem de template.
 * - PNG ou JPG
 * - Se 1080x1080 → format = 'feed'
 * - Se 1080x1920 → format = 'story'
 * - Qualquer outra dimensão → error
 */
export async function validateTemplate(file: File): Promise<TemplateValidationResult> {
  // Verificar tipo
  if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
    return {
      valid: false,
      error: 'O template deve ser um arquivo PNG ou JPG. Outros formatos não são aceitos.',
    };
  }

  // Verificar dimensões
  try {
    const { width, height } = await getImageDimensions(file);

    if (width === 1080 && height === 1080) {
      return { valid: true, format: 'feed' };
    }

    if (width === 1080 && height === 1920) {
      return { valid: true, format: 'story' };
    }

    return {
      valid: false,
      error: `O template deve ter exatamente 1080x1080px (Feed) ou 1080x1920px (Story). A imagem enviada tem ${width}x${height}px.`,
    };
  } catch {
    return { valid: false, error: 'Não foi possível ler as dimensões da imagem.' };
  }
}
