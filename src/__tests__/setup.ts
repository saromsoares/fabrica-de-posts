/**
 * Vitest global setup
 * Importado antes de cada arquivo de teste via vitest.config.ts setupFiles
 */
import '@testing-library/jest-dom';

// ── Mock: URL.createObjectURL / revokeObjectURL (não existe em jsdom) ──
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// ── Mock: Image API (não existe em jsdom) ──
// Usado por getImageDimensions() no upload-validator
class MockImage {
  naturalWidth = 0;
  naturalHeight = 0;
  src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(value: string) {
    // Simular carregamento síncrono via microtask
    Promise.resolve().then(() => {
      if (value.includes('invalid')) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    });
  }
}

// @ts-expect-error — override global Image para testes
global.Image = MockImage;

// ── Mock: process.env para Supabase ──
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
