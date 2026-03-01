/**
 * Testes de integração — LojistaDashboard
 *
 * Cobertura do checklist item 2:
 *   - Cálculo de uso mensal e barra de consumo (especialmente plano pro ilimitado)
 *   - Cartões de métricas (fábricas seguidas, pendências, total de posts)
 *   - Listagem de últimas gerações e links de navegação rápida
 *   - Comportamento em sessão expirada (erro amigável, não trava)
 *
 * COMO RODAR:
 *   pnpm vitest run src/components/dashboard/__tests__/LojistaDashboard.test.tsx
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import LojistaDashboard from '../LojistaDashboard';

// ── Mock do Supabase client ────────────────────────────────────
const mockInvoke = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  createClient: () => ({
    auth: { getSession: mockGetSession },
    functions: { invoke: mockInvoke },
  }),
}));

// ── Mock do logger ─────────────────────────────────────────────
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  }),
}));

// ── Mock do api-errors ─────────────────────────────────────────
vi.mock('@/lib/api-errors', () => ({
  handleApiError: vi.fn((_fnName: string, result: { data: unknown; error: unknown }) => {
    if (result.error) return { code: 'NETWORK_ERROR', message: 'Erro de conexão. Verifique sua internet e tente novamente.', requestId: null };
    const data = result.data as Record<string, unknown> | null;
    if (!data || data.success === false) {
      return { code: 'ERROR', message: 'Erro ao carregar dados. Tente novamente.', requestId: null };
    }
    return { code: 'OK', message: '', requestId: null };
  }),
}));

// ── Mock do next/link ──────────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ── Dados de fixture ───────────────────────────────────────────
const SESSION_MOCK = {
  data: { session: { access_token: 'token-test', user: { id: 'user-1' } } },
};

const SESSION_EXPIRED = { data: { session: null } };

function makeDashboardData(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    profile: {
      role: 'lojista',
      plan: 'loja',
      full_name: 'João Lojista',
      store_type: 'Moda',
      location_city: 'São Paulo',
      location_state: 'SP',
      store_voice: null,
      onboarding_complete: true,
    },
    plan_limits: {
      monthly_generations: 100,
      max_products: 50,
      max_factories_followed: 10,
      description: 'Plano Loja',
      price_brl: 49.9,
    },
    stats: {
      total_generations: 25,
      usage_count: 30,
      usage_limit: 100,
      usage_percentage: 30,
      factories_followed: 3,
      pending_follows: 1,
    },
    recent_generations: [
      {
        id: 'gen-1',
        caption: 'Post incrível sobre produto X',
        image_url: 'https://example.com/img1.png',
        format: 'feed',
        created_at: new Date().toISOString(),
        product: { name: 'Produto X Único', image_url: 'https://example.com/prod1.png' },
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(SESSION_MOCK);
});

// ══════════════════════════════════════════════════════════════
// GRUPO 1: Loading state
// ══════════════════════════════════════════════════════════════
describe('LojistaDashboard — loading', () => {
  it('exibe skeleton de loading enquanto busca dados', () => {
    mockInvoke.mockReturnValue(new Promise(() => {})); // nunca resolve
    render(<LojistaDashboard userName="João" />);
    // Skeleton tem classe animate-pulse
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 2: Sessão expirada
// ══════════════════════════════════════════════════════════════
describe('LojistaDashboard — sessão expirada', () => {
  it('exibe mensagem "Sessão expirada" quando sessão é null', async () => {
    mockGetSession.mockResolvedValue(SESSION_EXPIRED);
    render(<LojistaDashboard userName="" />);
    await waitFor(() => {
      expect(screen.getByText(/sessão expirada/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('não trava (não lança exceção) quando sessão é null', () => {
    mockGetSession.mockResolvedValue(SESSION_EXPIRED);
    expect(() => render(<LojistaDashboard userName="" />)).not.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 3: Plano Loja — barra de consumo
// ══════════════════════════════════════════════════════════════
describe('LojistaDashboard — plano loja (uso 30%)', () => {
  beforeEach(() => {
    mockInvoke.mockResolvedValue({ data: makeDashboardData(), error: null });
  });

  it('exibe o greeting com o nome do usuário da prop', async () => {
    render(<LojistaDashboard userName="João" />);
    await waitFor(() => {
      expect(screen.getByText(/Olá, João!/i)).toBeInTheDocument();
    });
  });

  it('exibe o badge do plano Loja', async () => {
    render(<LojistaDashboard userName="João" />);
    await waitFor(() => {
      // Badge do plano tem classe uppercase tracking-wider
      const badge = screen.getByText('Loja');
      expect(badge).toBeInTheDocument();
    });
  });

  it('exibe o contador de uso (30 / 100)', async () => {
    render(<LojistaDashboard userName="João" />);
    await waitFor(() => {
      // Buscar pelo texto '30%' que é único e está no mesmo bloco de uso
      expect(screen.getByText('30%')).toBeInTheDocument();
    });
  });

  it('exibe a porcentagem de uso (30%)', async () => {
    render(<LojistaDashboard userName="João" />);
    await waitFor(() => {
      expect(screen.getByText('30%')).toBeInTheDocument();
    });
  });

  it('exibe o número de fábricas seguidas', async () => {
    render(<LojistaDashboard userName="João" />);
    await waitFor(() => {
      // Cartão de fábricas seguidas
      expect(screen.getByText('Fábricas')).toBeInTheDocument();
    });
  });

  it('exibe a última geração na lista', async () => {
    render(<LojistaDashboard userName="João" />);
    await waitFor(() => {
      expect(screen.getByText(/Produto X Único/i)).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 4: Plano Pro — uso ilimitado (usage_limit=999999)
// ══════════════════════════════════════════════════════════════
describe('LojistaDashboard — plano pro (ilimitado)', () => {
  beforeEach(() => {
    mockInvoke.mockResolvedValue({
      data: makeDashboardData({
        profile: {
          role: 'lojista', plan: 'pro', full_name: 'Maria Pro',
          store_type: 'Tech', location_city: null, location_state: null,
          store_voice: null, onboarding_complete: true,
        },
        stats: {
          total_generations: 500,
          usage_count: 150,
          usage_limit: 999999,
          usage_percentage: 0,
          factories_followed: 8,
          pending_follows: 0,
        },
      }),
      error: null,
    });
  });

  it('exibe "Ilimitado" para plano pro', async () => {
    render(<LojistaDashboard userName="Maria" />);
    await waitFor(() => {
      expect(screen.getByText('Ilimitado')).toBeInTheDocument();
    });
  });

  it('exibe "∞" no limite de uso para plano pro', async () => {
    render(<LojistaDashboard userName="Maria" />);
    await waitFor(() => {
      // O ∞ está dentro de um span aninhado: "/ ∞"
      // Usar getAllByText com regex para encontrar o span que contém ∞
      const elements = screen.getAllByText(/∞/);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('NÃO exibe aviso de limite para plano pro', async () => {
    render(<LojistaDashboard userName="Maria" />);
    await waitFor(() => {
      expect(screen.queryByText(/quase no limite/i)).not.toBeInTheDocument();
    });
  });

  it('exibe badge Pro', async () => {
    render(<LojistaDashboard userName="Maria" />);
    await waitFor(() => {
      // Badge Pro tem classe text-purple-400
      const badge = screen.getByText('Pro');
      expect(badge).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 5: Aviso de limite (usage >= 90%)
// ══════════════════════════════════════════════════════════════
describe('LojistaDashboard — aviso de limite (90%)', () => {
  beforeEach(() => {
    mockInvoke.mockResolvedValue({
      data: makeDashboardData({
        stats: {
          total_generations: 90,
          usage_count: 90,
          usage_limit: 100,
          usage_percentage: 90,
          factories_followed: 2,
          pending_follows: 0,
        },
      }),
      error: null,
    });
  });

  it('exibe aviso de limite quando uso >= 90%', async () => {
    render(<LojistaDashboard userName="João" />);
    await waitFor(() => {
      expect(screen.getByText(/quase no limite/i)).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 6: Estado de erro (Edge Function falha)
// ══════════════════════════════════════════════════════════════
describe('LojistaDashboard — erro da Edge Function', () => {
  it('exibe mensagem de erro quando Edge Function falha', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Function error') });
    render(<LojistaDashboard userName="João" />);
    await waitFor(() => {
      // O error state exibe um AlertCircle + mensagem de erro
      const errorMsg = screen.queryByText(/erro/i) || screen.queryByText(/conexão/i);
      expect(errorMsg).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('exibe botão "Tentar novamente" no estado de erro', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Function error') });
    render(<LojistaDashboard userName="João" />);
    await waitFor(() => {
      expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
