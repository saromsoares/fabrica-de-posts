/**
 * route-rules.ts
 * Fonte única de verdade para as regras de roteamento da aplicação.
 * Todos os helpers são funções puras — testáveis sem dependência de req/res.
 *
 * Rotas mapeadas conforme estrutura real: find src/app -name "page.tsx" | sort
 */

// ============================================================
// 1. TIPO DO CONTEXTO DE AUTH (retornado pela RPC get_auth_context)
// ============================================================

export interface AuthContext {
  role: string;
  plan: string;
  onboarding_complete: boolean;
  is_super_admin: boolean;
  has_factory: boolean;
}

// ============================================================
// 2. DEFINIÇÃO DE ROTAS (declarativa e testável)
// ============================================================

export const ROUTE_RULES = {
  /**
   * Rotas públicas — qualquer pessoa acessa, mesmo sem login.
   * Prefixos: qualquer pathname que comece com um desses é público.
   */
  public: [
    '/',
    '/login',
    '/signup',
    '/auth/callback',
    '/auth/confirm',
    '/reset-password',
    '/termos',
    '/privacidade',
  ],

  /**
   * Rotas que exigem onboarding_complete = true para acesso.
   * Exceções (brand-kit, admin, conta) são tratadas no middleware.
   */
  requiresOnboarding: [
    '/dashboard',
    '/dashboard/estudio',
    '/dashboard/historico',
    '/dashboard/produtos',
    '/dashboard/setores',
    '/dashboard/fabricas',
    '/dashboard/categorias',
    '/dashboard/templates',
  ],

  /**
   * Rotas exclusivas de fabricante (ou admin/super_admin).
   * Mapeadas conforme src/app/(dashboard)/dashboard/fabricante/*
   */
  fabricante: [
    '/dashboard/fabricante',
  ],

  /**
   * Rotas exclusivas de admin/super_admin.
   * Mapeadas conforme src/app/(dashboard)/dashboard/admin/*
   */
  admin: [
    '/dashboard/admin',
  ],

  /**
   * Rotas do wizard de onboarding.
   * Usuários com onboarding pendente podem acessar estas rotas.
   */
  onboarding: [
    '/onboarding',
  ],

  /**
   * Rotas que usuários autenticados NÃO devem acessar
   * (ex: login — redirecionar para dashboard).
   */
  redirectIfAuthenticated: [
    '/login',
    '/signup',
  ],

  /**
   * Rotas protegidas que NÃO exigem onboarding completo.
   * Útil para brand-kit, conta e admin (que podem ser acessados antes do onboarding).
   */
  onboardingExempt: [
    '/dashboard/brand-kit',
    '/dashboard/conta',
    '/dashboard/admin',
    '/dashboard/fabricante',
    '/onboarding',
  ],
} as const;

// ============================================================
// 3. HELPERS PUROS (sem dependência de req/res)
// ============================================================

/**
 * Verifica se um pathname é uma rota pública (sem autenticação necessária).
 */
export function isPublicRoute(pathname: string): boolean {
  return ROUTE_RULES.public.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );
}

/**
 * Verifica se um pathname é um asset estático ou API route.
 * Esses paths devem ser ignorados pelo middleware.
 */
export function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    /\.[a-zA-Z0-9]+$/.test(pathname) // arquivos com extensão (.css, .js, .png, etc.)
  );
}

/**
 * Verifica se um pathname é uma rota exclusiva de admin.
 */
export function isAdminRoute(pathname: string): boolean {
  return ROUTE_RULES.admin.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );
}

/**
 * Verifica se um pathname é uma rota exclusiva de fabricante.
 */
export function isFabricanteRoute(pathname: string): boolean {
  return ROUTE_RULES.fabricante.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );
}

/**
 * Verifica se um pathname é uma rota do wizard de onboarding.
 */
export function isOnboardingRoute(pathname: string): boolean {
  return ROUTE_RULES.onboarding.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );
}

/**
 * Verifica se um pathname exige onboarding_complete = true.
 */
export function requiresOnboarding(pathname: string): boolean {
  // Verificar se está na lista de onboarding-exempt primeiro
  const isExempt = ROUTE_RULES.onboardingExempt.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );
  if (isExempt) return false;

  return ROUTE_RULES.requiresOnboarding.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );
}

/**
 * Verifica se um pathname deve redirecionar usuários já autenticados.
 */
export function shouldRedirectIfAuthenticated(pathname: string): boolean {
  return ROUTE_RULES.redirectIfAuthenticated.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );
}

// ============================================================
// 4. HELPERS DE PERMISSÃO (baseados no AuthContext)
// ============================================================

/**
 * Verifica se o usuário pode acessar rotas de admin.
 */
export function canAccessAdmin(ctx: AuthContext): boolean {
  return ctx.is_super_admin || ['admin', 'super_admin'].includes(ctx.role);
}

/**
 * Verifica se o usuário pode acessar rotas de fabricante.
 */
export function canAccessFabricante(ctx: AuthContext): boolean {
  return ctx.is_super_admin || ['fabricante', 'admin', 'super_admin'].includes(ctx.role);
}

/**
 * Retorna a URL de destino do onboarding baseado no role do usuário.
 */
export function getOnboardingUrl(ctx: AuthContext): string {
  return ctx.role === 'fabricante' ? '/onboarding' : '/onboarding';
}
