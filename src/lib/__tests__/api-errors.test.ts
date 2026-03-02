/**
 * Testes unitários — api-errors.ts
 *
 * Cobertura:
 *   - handleApiError: sucesso, erro novo (estruturado), erro legado, erro de rede
 *   - isApiError: type guard
 *   - getUserMessage: mensagens PT-BR mapeadas e fallback
 *   - getRequestId: extração de request_id
 *
 * COMO RODAR:
 *   pnpm vitest run src/lib/__tests__/api-errors.test.ts
 */
import { describe, it, expect, vi } from 'vitest';
import {
  handleApiError,
  isApiError,
  getUserMessage,
  getRequestId,
} from '../api-errors';

// Silenciar logs do logger durante os testes
vi.mock('../logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// ══════════════════════════════════════════════════════════════
// isApiError — type guard
// ══════════════════════════════════════════════════════════════
describe('isApiError', () => {
  it('retorna true para formato novo de erro', () => {
    const data = {
      success: false,
      error: { code: 'AUTH_MISSING', message: 'Não autenticado', request_id: 'abc123' },
    };
    expect(isApiError(data)).toBe(true);
  });

  it('retorna false para sucesso', () => {
    const data = { success: true, data: {} };
    expect(isApiError(data)).toBe(false);
  });

  it('retorna false para formato legado (error como string)', () => {
    const data = { success: false, error: 'Mensagem de erro legada' };
    expect(isApiError(data)).toBe(false);
  });

  it('retorna false para null', () => {
    expect(isApiError(null)).toBe(false);
  });

  it('retorna false para string', () => {
    expect(isApiError('erro')).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// getUserMessage — mensagens amigáveis
// ══════════════════════════════════════════════════════════════
describe('getUserMessage', () => {
  it('retorna mensagem PT-BR mapeada para AUTH_MISSING', () => {
    const data = {
      success: false,
      error: { code: 'AUTH_MISSING', message: 'Missing auth', request_id: 'rid1' },
    };
    expect(getUserMessage(data)).toBe('Você precisa estar logado para continuar.');
  });

  it('retorna mensagem PT-BR mapeada para PLAN_LIMIT_REACHED', () => {
    const data = {
      success: false,
      error: { code: 'PLAN_LIMIT_REACHED', message: 'Limit reached', request_id: 'rid2' },
    };
    expect(getUserMessage(data)).toContain('limite do seu plano');
  });

  it('retorna mensagem do backend para código não mapeado', () => {
    const data = {
      success: false,
      error: { code: 'CUSTOM_CODE_XYZ', message: 'Erro personalizado', request_id: 'rid3' },
    };
    expect(getUserMessage(data)).toBe('Erro personalizado');
  });

  it('retorna string de erro para formato legado', () => {
    const data = { success: false, error: 'Erro legado de texto' };
    expect(getUserMessage(data)).toBe('Erro legado de texto');
  });

  it('retorna fallback para dado inválido', () => {
    expect(getUserMessage(null)).toBe('Algo deu errado. Tente novamente.');
    expect(getUserMessage(undefined)).toBe('Algo deu errado. Tente novamente.');
    expect(getUserMessage({})).toBe('Algo deu errado. Tente novamente.');
  });
});

// ══════════════════════════════════════════════════════════════
// getRequestId — extração de request_id
// ══════════════════════════════════════════════════════════════
describe('getRequestId', () => {
  it('extrai request_id de erro novo', () => {
    const data = {
      success: false,
      error: { code: 'AUTH_MISSING', message: 'Não autenticado', request_id: 'req-abc-123' },
    };
    expect(getRequestId(data)).toBe('req-abc-123');
  });

  it('extrai request_id de resposta de sucesso', () => {
    const data = { success: true, request_id: 'req-success-456' };
    expect(getRequestId(data)).toBe('req-success-456');
  });

  it('retorna null para formato legado sem request_id', () => {
    const data = { success: false, error: 'Erro legado' };
    expect(getRequestId(data)).toBeNull();
  });

  it('retorna null para null', () => {
    expect(getRequestId(null)).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// handleApiError — handler principal
// ══════════════════════════════════════════════════════════════
describe('handleApiError', () => {
  // ── Sucesso ──────────────────────────────────────────────────
  it('retorna code=OK para resposta de sucesso', () => {
    const result = { data: { success: true, request_id: 'rid-ok' }, error: null };
    const err = handleApiError('test-fn', result);
    expect(err.code).toBe('OK');
    expect(err.message).toBe('');
    expect(err.requestId).toBe('rid-ok');
  });

  it('retorna code=OK para sucesso sem request_id', () => {
    const result = { data: { success: true }, error: null };
    const err = handleApiError('test-fn', result);
    expect(err.code).toBe('OK');
    expect(err.requestId).toBeNull();
  });

  // ── Erro de rede ─────────────────────────────────────────────
  it('retorna NETWORK_ERROR quando há erro de invocação', () => {
    const result = { data: null, error: new Error('fetch failed') };
    const err = handleApiError('test-fn', result);
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.message).toContain('conexão');
    expect(err.requestId).toBeNull();
  });

  it('retorna NETWORK_ERROR para erro de string', () => {
    const result = { data: null, error: 'FunctionsFetchError' };
    const err = handleApiError('test-fn', result);
    expect(err.code).toBe('NETWORK_ERROR');
  });

  // ── Erro novo (estruturado) ───────────────────────────────────
  it('retorna código do backend para erro novo AUTH_MISSING', () => {
    const result = {
      data: {
        success: false,
        error: { code: 'AUTH_MISSING', message: 'Not authenticated', request_id: 'rid-auth' },
      },
      error: null,
    };
    const err = handleApiError('test-fn', result);
    expect(err.code).toBe('AUTH_MISSING');
    expect(err.message).toBe('Você precisa estar logado para continuar.');
    expect(err.requestId).toBe('rid-auth');
  });

  it('retorna código do backend para PLAN_LIMIT_REACHED', () => {
    const result = {
      data: {
        success: false,
        error: { code: 'PLAN_LIMIT_REACHED', message: 'Limit exceeded', request_id: 'rid-plan' },
      },
      error: null,
    };
    const err = handleApiError('test-fn', result);
    expect(err.code).toBe('PLAN_LIMIT_REACHED');
    expect(err.message).toContain('limite');
  });

  it('retorna mensagem do backend para código não mapeado', () => {
    const result = {
      data: {
        success: false,
        error: { code: 'CUSTOM_ERROR', message: 'Erro específico do backend', request_id: 'rid-custom' },
      },
      error: null,
    };
    const err = handleApiError('test-fn', result);
    expect(err.code).toBe('CUSTOM_ERROR');
    expect(err.message).toBe('Erro específico do backend');
  });

  // ── Erro legado ───────────────────────────────────────────────
  it('retorna LEGACY_ERROR para formato legado', () => {
    const result = {
      data: { success: false, error: 'Erro legado de texto' },
      error: null,
    };
    const err = handleApiError('test-fn', result);
    expect(err.code).toBe('LEGACY_ERROR');
    expect(err.message).toBe('Erro legado de texto');
    expect(err.requestId).toBeNull();
  });

  // ── Sessão expirada (checklist item 1) ───────────────────────
  it('retorna mensagem de sessão expirada para AUTH_INVALID', () => {
    const result = {
      data: {
        success: false,
        error: { code: 'AUTH_INVALID', message: 'Token expired', request_id: 'rid-exp' },
      },
      error: null,
    };
    const err = handleApiError('test-fn', result);
    expect(err.code).toBe('AUTH_INVALID');
    expect(err.message).toContain('sessão expirou');
  });

  // ── Plano pro ilimitado (checklist item 2) ───────────────────
  it('retorna OK para resposta de lojista-stats com usage_limit=999999', () => {
    const result = {
      data: {
        success: true,
        profile: { plan: 'pro' },
        stats: { usage_count: 0, usage_limit: 999999, usage_percentage: 0 },
        request_id: 'rid-pro',
      },
      error: null,
    };
    const err = handleApiError('lojista-stats', result);
    expect(err.code).toBe('OK');
  });

  // ── Fabricante sem fábrica (checklist item 3) ─────────────────
  it('retorna mensagem amigável para NO_FACTORY', () => {
    const result = {
      data: {
        success: false,
        error: { code: 'NO_FACTORY', message: 'No factory', request_id: 'rid-nf' },
      },
      error: null,
    };
    const err = handleApiError('fabricante-stats', result);
    expect(err.code).toBe('NO_FACTORY');
    expect(err.message).toBe('Fabricante sem fábrica cadastrada.');
  });
});
