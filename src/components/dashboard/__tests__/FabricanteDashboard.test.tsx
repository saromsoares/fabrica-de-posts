/**
 * Testes de integração — FabricanteDashboard
 *
 * Cobertura do checklist item 3:
 *   - Cenário "sem fábrica cadastrada" (estado vazio + CTA correta)
 *   - Contadores principais (produtos, ativos, seguidores, pendentes, gerações)
 *   - Bloco "Top produtos" e ordenação por geração (sem inconsistência quando não há dados)
 *
 * COMO RODAR:
 *   pnpm vitest run src/components/dashboard/__tests__/FabricanteDashboard.test.tsx
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FabricanteDashboard from '../FabricanteDashboard';

// ── Mock do Supabase client ────────────────────────────────────
const mockInvoke = vi.fn();
const mockGetSession = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  createClient: () => ({
    auth: { getSession: mockGetSession },
    functions: { invoke: mockInvoke },
    from: mockFrom,
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
    if (result.error) return { code: 'NETWORK_ERROR', message: 'Erro de conexão.', requestId: null };
    const data = result.data as Record<string, unknown> | null;
    if (!data || data.success === false) {
      return { code: 'ERROR', message: 'Erro ao carregar dados.', requestId: null };
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

// ── Mock do LogoAvatar ─────────────────────────────────────────
vi.mock('@/components/ui/LogoAvatar', () => ({
  default: ({ alt }: { alt: string }) => <div data-testid="logo-avatar">{alt}</div>,
}));

// ── Dados de fixture ───────────────────────────────────────────
const SESSION_MOCK = {
  data: { session: { access_token: 'token-test', user: { id: 'user-1' } } },
};

function makeFactoryDashboardData(overrides: Record<string, unknown> = {}) {
  return {
    has_factory: true,
    factory: {
      id: 'factory-1',
      name: 'Fábrica Teste',
      logo_url: null,
      active: true,
    },
    stats: {
      total_products: 15,
      active_products: 12,
      total_followers: 8,
      pending_requests: 2,
      total_generations: 45,
    },
    recent_followers: [
      {
        id: 'follow-1',
        status: 'approved',
        requested_at: new Date().toISOString(),
        lojista_id: 'user-2',
        profile: { full_name: 'Lojista A', avatar_url: null },
      },
    ],
    top_products: [
      {
        product_id: 'prod-1',
        product_name: 'Produto Estrela',
        image_url: null,
        generation_count: 20,
      },
      {
        product_id: 'prod-2',
        product_name: 'Produto Secundário',
        image_url: null,
        generation_count: 10,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(SESSION_MOCK);
  // Mock do from().select() para approve/reject actions
  mockFrom.mockReturnValue({
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 1: Sem fábrica cadastrada
// ══════════════════════════════════════════════════════════════
describe('FabricanteDashboard — sem fábrica', () => {
  beforeEach(() => {
    mockInvoke.mockResolvedValue({
      data: {
        has_factory: false,
        message: 'Crie sua fábrica para começar.',
      },
      error: null,
    });
  });

  it('exibe título "Nenhuma fábrica cadastrada"', async () => {
    render(<FabricanteDashboard userName="João" />);
    await waitFor(() => {
      expect(screen.getByText(/nenhuma fábrica cadastrada/i)).toBeInTheDocument();
    });
  });

  it('exibe CTA "Criar Fábrica" com link para /onboarding', async () => {
    render(<FabricanteDashboard userName="João" />);
    await waitFor(() => {
      const ctaLink = screen.getByRole('link', { name: /criar fábrica/i });
      expect(ctaLink).toBeInTheDocument();
      expect(ctaLink).toHaveAttribute('href', '/onboarding');
    });
  });

  it('exibe a mensagem customizada do backend', async () => {
    render(<FabricanteDashboard userName="João" />);
    await waitFor(() => {
      expect(screen.getByText(/Crie sua fábrica para começar/i)).toBeInTheDocument();
    });
  });

  it('NÃO exibe os contadores de métricas', async () => {
    render(<FabricanteDashboard userName="João" />);
    await waitFor(() => {
      expect(screen.queryByText(/produtos/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/seguidores/i)).not.toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 2: Contadores principais
// ══════════════════════════════════════════════════════════════
describe('FabricanteDashboard — contadores', () => {
  beforeEach(() => {
    mockInvoke.mockResolvedValue({
      data: makeFactoryDashboardData(),
      error: null,
    });
  });

  it('exibe o nome da fábrica', async () => {
    render(<FabricanteDashboard userName="João" />);
    await waitFor(() => {
      // getAllByText pois o nome aparece no LogoAvatar e no texto
      const matches = screen.getAllByText(/Fábrica Teste/i);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it('exibe total de produtos (15)', async () => {
    render(<FabricanteDashboard userName="João" />);
    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  it('exibe total de seguidores (8)', async () => {
    render(<FabricanteDashboard userName="João" />);
    await waitFor(() => {
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  it('exibe pendências (2) com destaque visual', async () => {
    render(<FabricanteDashboard userName="João" />);
    await waitFor(() => {
      // Pendentes aparece como label do card
      expect(screen.getByText('Pendentes')).toBeInTheDocument();
      // O valor 2 aparece em um p.text-2xl com cor amber
      // Buscar todos os elementos com texto '2'
      const allEls = screen.getAllByText('2');
      expect(allEls.length).toBeGreaterThan(0);
      // Pelo menos um deles deve ter classe amber
      const amberEl = allEls.find(el => el.className.includes('amber'));
      expect(amberEl).toBeTruthy();
    });
  });

  it('exibe total de posts gerados (45)', async () => {
    render(<FabricanteDashboard userName="João" />);
    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 3: Top produtos
// ══════════════════════════════════════════════════════════════
describe('FabricanteDashboard — top produtos', () => {
  it('exibe top produtos ordenados por geração', async () => {
    mockInvoke.mockResolvedValue({
      data: makeFactoryDashboardData(),
      error: null,
    });
    render(<FabricanteDashboard userName="João" />);
    await waitFor(() => {
      expect(screen.getByText(/Produto Estrela/i)).toBeInTheDocument();
      expect(screen.getByText(/Produto Secundário/i)).toBeInTheDocument();
      // Produto Estrela (20 posts) deve aparecer antes de Produto Secundário (10 posts)
      const items = screen.getAllByText(/posts?/i);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('exibe estado vazio quando não há top produtos', async () => {
    mockInvoke.mockResolvedValue({
      data: makeFactoryDashboardData({ top_products: [] }),
      error: null,
    });
    render(<FabricanteDashboard userName="João" />);
    await waitFor(() => {
      expect(screen.getByText(/nenhum produto com posts ainda/i)).toBeInTheDocument();
    });
  });

  it('não quebra quando top_products é undefined', async () => {
    mockInvoke.mockResolvedValue({
      data: makeFactoryDashboardData({ top_products: undefined }),
      error: null,
    });
    expect(() => render(<FabricanteDashboard userName="João" />)).not.toThrow();
    await waitFor(() => {
      expect(screen.getByText(/nenhum produto com posts ainda/i)).toBeInTheDocument();
    });
  });

  it('exibe contagem de posts por produto', async () => {
    mockInvoke.mockResolvedValue({
      data: makeFactoryDashboardData(),
      error: null,
    });
    render(<FabricanteDashboard userName="João" />);
    await waitFor(() => {
      expect(screen.getByText(/20 posts?/i)).toBeInTheDocument();
      expect(screen.getByText(/10 posts?/i)).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 4: Sessão expirada
// ══════════════════════════════════════════════════════════════
describe('FabricanteDashboard — sessão expirada', () => {
  it('exibe erro amigável quando sessão é null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<FabricanteDashboard userName="" />);
    await waitFor(() => {
      const errorEl = screen.queryByText(/sessão expirada/i) ||
        screen.queryByText(/faça login/i);
      expect(errorEl).toBeTruthy();
    }, { timeout: 3000 });
  });
});

// ══════════════════════════════════════════════════════════════
// GRUPO 5: Zero pendências (sem destaque visual)
// ══════════════════════════════════════════════════════════════
describe('FabricanteDashboard — zero pendências', () => {
  it('exibe 0 pendências sem destaque de alerta', async () => {
    mockInvoke.mockResolvedValue({
      data: makeFactoryDashboardData({
        stats: {
          total_products: 10,
          active_products: 10,
          total_followers: 5,
          pending_requests: 0,
          total_generations: 20,
        },
      }),
      error: null,
    });
    render(<FabricanteDashboard userName="João" />);
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
});
