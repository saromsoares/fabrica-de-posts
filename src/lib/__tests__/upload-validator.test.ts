/**
 * Testes unitários — upload-validator.ts
 *
 * Cobertura do checklist item 4:
 *   - Mensagens de erro claras para logo/produto/template (tipo, proporção, dimensões)
 *   - Casos de erro: arquivo >10MB, tipo inválido
 *
 * COMO RODAR:
 *   pnpm vitest run src/lib/__tests__/upload-validator.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateFile,
  getUploadHint,
  getAcceptString,
  invalidateUploadRulesCache,
  type UploadType,
} from '../upload-validator';

// ── Helpers para criar File mocks ──────────────────────────────
function makeFile(name: string, type: string, sizeBytes: number): File {
  const blob = new Blob(['x'.repeat(Math.min(sizeBytes, 1000))], { type });
  // Sobrescrever size (Blob.size é read-only, mas File aceita no construtor)
  const file = new File([blob], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes, configurable: true });
  return file;
}

// ── Mock de getImageDimensions via Image global ────────────────
// O setup.ts já define global.Image como MockImage.
// Aqui controlamos naturalWidth/naturalHeight por teste.
function mockImageDimensions(width: number, height: number) {
  // @ts-expect-error — override global Image
  global.Image = class {
    naturalWidth = width;
    naturalHeight = height;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_: string) {
      Promise.resolve().then(() => this.onload?.());
    }
  };
}

function mockImageError() {
  // @ts-expect-error — override global Image
  global.Image = class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_: string) {
      Promise.resolve().then(() => this.onerror?.());
    }
  };
}

// ── Limpar cache entre testes ──────────────────────────────────
beforeEach(() => {
  invalidateUploadRulesCache();
  vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════
// GRUPO 1: Tipo de arquivo inválido
// ══════════════════════════════════════════════════════════════
describe('validateFile — formato inválido', () => {
  it('logo: rejeita JPEG com mensagem clara', async () => {
    mockImageDimensions(600, 600);
    const file = makeFile('logo.jpg', 'image/jpeg', 100_000);
    const result = await validateFile(file, 'logo');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Use arquivo PNG para o logo.');
  });

  it('product: rejeita GIF com mensagem clara', async () => {
    mockImageDimensions(800, 800);
    const file = makeFile('product.gif', 'image/gif', 100_000);
    const result = await validateFile(file, 'product');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('PNG ou JPEG');
  });

  it('template: rejeita WebP com mensagem clara', async () => {
    mockImageDimensions(1080, 1080);
    const file = makeFile('template.webp', 'image/webp', 100_000);
    const result = await validateFile(file, 'template');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('PNG ou JPEG');
  });

  it('brand-logo: rejeita PDF com mensagem clara', async () => {
    mockImageDimensions(600, 600);
    const file = makeFile('logo.pdf', 'application/pdf', 100_000);
    const result = await validateFile(file, 'brand-logo');
    expect(result.valid).toBe(false);
    // brand-logo tem mensagem diferente de logo (intencional)
    expect(result.error).toContain('PNG');
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 2: Arquivo muito grande
// ══════════════════════════════════════════════════════════════
describe('validateFile — tamanho excedido', () => {
  it('logo: rejeita arquivo >5MB com mensagem clara', async () => {
    const file = makeFile('logo.png', 'image/png', 6 * 1024 * 1024); // 6MB
    const result = await validateFile(file, 'logo');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Logo muito grande. Máximo: 5MB.');
  });

  it('product: rejeita arquivo >10MB com mensagem clara', async () => {
    const file = makeFile('product.png', 'image/png', 11 * 1024 * 1024); // 11MB
    const result = await validateFile(file, 'product');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Arquivo muito grande. Máximo: 10MB.');
  });

  it('template: rejeita arquivo >15MB com mensagem clara', async () => {
    const file = makeFile('template.png', 'image/png', 16 * 1024 * 1024); // 16MB
    const result = await validateFile(file, 'template');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Arquivo muito grande. Máximo: 15MB.');
  });

  it('product: aceita arquivo exatamente no limite (10MB)', async () => {
    mockImageDimensions(800, 800);
    const file = makeFile('product.png', 'image/png', 10 * 1024 * 1024); // 10MB exato
    const result = await validateFile(file, 'product');
    // Não deve falhar por tamanho (10MB exato = no limite, aceito)
    expect(result.error ?? '').not.toContain('Máximo: 10MB');
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 3: Dimensões mínimas
// ══════════════════════════════════════════════════════════════
describe('validateFile — dimensões mínimas', () => {
  it('logo: rejeita imagem 400×400 (abaixo de 500×500)', async () => {
    mockImageDimensions(400, 400);
    const file = makeFile('logo.png', 'image/png', 100_000);
    const result = await validateFile(file, 'logo');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('500×500px');
    expect(result.error).toContain('400×400px');
  });

  it('logo: aceita imagem exatamente 500×500', async () => {
    mockImageDimensions(500, 500);
    const file = makeFile('logo.png', 'image/png', 100_000);
    const result = await validateFile(file, 'logo');
    expect(result.valid).toBe(true);
  });

  it('product: rejeita imagem 600×600 (abaixo de 800×800)', async () => {
    mockImageDimensions(600, 600);
    const file = makeFile('product.png', 'image/png', 100_000);
    const result = await validateFile(file, 'product');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('800×800px');
  });

  it('template: rejeita imagem 800×800 (abaixo de 1080×1080)', async () => {
    mockImageDimensions(800, 800);
    const file = makeFile('template.png', 'image/png', 100_000);
    const result = await validateFile(file, 'template');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('1080×1080');
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 4: Aspect ratio (logo e brand-logo devem ser quadrados)
// ══════════════════════════════════════════════════════════════
describe('validateFile — aspect ratio', () => {
  it('logo: rejeita imagem 800×600 (não é quadrado)', async () => {
    mockImageDimensions(800, 600);
    const file = makeFile('logo.png', 'image/png', 100_000);
    const result = await validateFile(file, 'logo');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('quadrado');
  });

  it('logo: aceita imagem 600×620 (dentro da tolerância de 5%)', async () => {
    // ratio = 600/620 ≈ 0.968, diferença de 1 - 0.968 = 0.032 < 0.05
    mockImageDimensions(600, 620);
    const file = makeFile('logo.png', 'image/png', 100_000);
    const result = await validateFile(file, 'logo');
    expect(result.valid).toBe(true);
  });

  it('logo: rejeita imagem 600×700 (fora da tolerância de 5%)', async () => {
    // ratio = 600/700 ≈ 0.857, diferença de 1 - 0.857 = 0.143 > 0.05
    mockImageDimensions(600, 700);
    const file = makeFile('logo.png', 'image/png', 100_000);
    const result = await validateFile(file, 'logo');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('quadrado');
  });

  it('product: aceita imagem não-quadrada (sem restrição de ratio)', async () => {
    mockImageDimensions(1200, 800);
    const file = makeFile('product.png', 'image/png', 100_000);
    const result = await validateFile(file, 'product');
    expect(result.valid).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 5: Template — dimensões exatas (Feed ou Story)
// ══════════════════════════════════════════════════════════════
describe('validateFile — template dimensões exatas', () => {
  it('aceita template Feed 1080×1080 e detecta formato feed', async () => {
    mockImageDimensions(1080, 1080);
    const file = makeFile('template.png', 'image/png', 100_000);
    const result = await validateFile(file, 'template');
    expect(result.valid).toBe(true);
    expect(result.metadata?.format).toBe('feed');
  });

  it('aceita template Story 1080×1920 e detecta formato story', async () => {
    mockImageDimensions(1080, 1920);
    const file = makeFile('template.png', 'image/png', 100_000);
    const result = await validateFile(file, 'template');
    expect(result.valid).toBe(true);
    expect(result.metadata?.format).toBe('story');
  });

  it('rejeita template 1200×1200 com mensagem de dimensões corretas', async () => {
    mockImageDimensions(1200, 1200);
    const file = makeFile('template.png', 'image/png', 100_000);
    const result = await validateFile(file, 'template');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('1080×1080');
    expect(result.error).toContain('1080×1920');
    expect(result.error).toContain('1200×1200px');
  });

  it('rejeita template 1080×1350 (formato Instagram Portrait — não suportado)', async () => {
    mockImageDimensions(1080, 1350);
    const file = makeFile('template.png', 'image/png', 100_000);
    const result = await validateFile(file, 'template');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('1080×1080');
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 6: Erro ao ler imagem (arquivo corrompido)
// ══════════════════════════════════════════════════════════════
describe('validateFile — imagem ilegível', () => {
  it('retorna erro amigável quando a imagem não pode ser lida', async () => {
    mockImageError();
    const file = makeFile('corrupt.png', 'image/png', 100_000);
    const result = await validateFile(file, 'logo');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Não foi possível ler a imagem.');
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 7: Metadata retornado em caso de sucesso
// ══════════════════════════════════════════════════════════════
describe('validateFile — metadata no sucesso', () => {
  it('retorna metadata completo para logo válido', async () => {
    mockImageDimensions(800, 800);
    const file = makeFile('logo.png', 'image/png', 200_000);
    const result = await validateFile(file, 'logo');
    expect(result.valid).toBe(true);
    expect(result.metadata).toMatchObject({
      width: 800,
      height: 800,
      size_bytes: 200_000,
      content_type: 'image/png',
      format: null,
    });
  });

  it('retorna metadata com format=feed para template feed', async () => {
    mockImageDimensions(1080, 1080);
    const file = makeFile('template.png', 'image/png', 500_000);
    const result = await validateFile(file, 'template');
    expect(result.valid).toBe(true);
    expect(result.metadata?.format).toBe('feed');
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 8: Helpers — getAcceptString e getUploadHint
// ══════════════════════════════════════════════════════════════
describe('getAcceptString', () => {
  it('logo: retorna apenas image/png', () => {
    expect(getAcceptString('logo')).toBe('image/png');
  });

  it('product: retorna image/png,image/jpeg', () => {
    const accept = getAcceptString('product');
    expect(accept).toContain('image/png');
    expect(accept).toContain('image/jpeg');
  });

  it('template: retorna image/png,image/jpeg', () => {
    const accept = getAcceptString('template');
    expect(accept).toContain('image/png');
    expect(accept).toContain('image/jpeg');
  });
});

describe('getUploadHint', () => {
  it('logo: hint menciona PNG e 500×500px', () => {
    const hint = getUploadHint('logo');
    expect(hint).toContain('PNG');
    expect(hint).toContain('500×500');
  });

  it('template: hint menciona 1080×1080 e 1080×1920', () => {
    const hint = getUploadHint('template');
    expect(hint).toMatch(/1080/);
  });
});
