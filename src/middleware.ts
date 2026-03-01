/**
 * middleware.ts
 * Middleware de autenticação e autorização do Next.js.
 *
 * Arquitetura:
 * - Regras de rota: src/lib/route-rules.ts (helpers puros, testáveis)
 * - Auth: getSession() (cookie local, sem round-trip) + RPC get_auth_context (1.5ms)
 * - Máximo 2 chamadas de rede por request (getSession + RPC)
 *
 * Fluxo de decisão:
 * 1. Asset estático/API → skip
 * 2. Rota pública → pass-through
 * 3. Sem sessão → redirect /login?redirect={pathname}
 * 4. Autenticado em /login ou /signup → redirect /dashboard
 * 5. Buscar contexto via RPC get_auth_context (1 query, ~1.5ms)
 * 6. Onboarding pendente + rota protegida → redirect /onboarding
 * 7. Rota admin sem permissão → redirect /dashboard
 * 8. Rota fabricante sem permissão → redirect /dashboard
 * 9. Pass-through
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  isStaticAsset,
  isPublicRoute,
  isAdminRoute,
  isFabricanteRoute,
  isOnboardingRoute,
  requiresOnboarding,
  shouldRedirectIfAuthenticated,
  canAccessAdmin,
  canAccessFabricante,
  getOnboardingUrl,
  type AuthContext,
} from '@/lib/route-rules';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Skip: assets estáticos e API routes ──────────────────
  if (isStaticAsset(pathname)) {
    return NextResponse.next({ request });
  }

  // ── 2. Rotas públicas: pass-through sem auth ─────────────────
  if (isPublicRoute(pathname)) {
    return NextResponse.next({ request });
  }

  // ── Criar cliente Supabase com cookie forwarding ─────────────
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── 3. Verificar sessão (lê do cookie — sem round-trip ao Supabase) ──
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // Sem sessão → redirecionar para login preservando o destino
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 4. Autenticado tentando acessar /login ou /signup ────────
  if (shouldRedirectIfAuthenticated(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ── 5. Buscar contexto de auth via RPC (1 única query ao banco) ──
  // A RPC get_auth_context usa SECURITY DEFINER — sem RLS, sem recursão, ~1.5ms
  // A RPC retorna TABLE — usar maybeSingle() para pegar a primeira linha
  const { data: authContext, error: rpcError } = await supabase
    .rpc('get_auth_context', { p_user_id: session.user.id })
    .maybeSingle();

  if (rpcError || !authContext) {
    // RPC falhou (profile não existe ou banco inacessível)
    // Redirecionar para login como fallback seguro
    console.error('[middleware] get_auth_context failed:', rpcError?.message);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const ctx = authContext as AuthContext;

  // ── 6. Onboarding pendente ───────────────────────────────────
  // super_admin bypassa o check de onboarding
  if (!ctx.onboarding_complete && !ctx.is_super_admin) {
    // Já está no onboarding → deixar passar
    if (isOnboardingRoute(pathname)) {
      return supabaseResponse;
    }
    // Tenta acessar rota que exige onboarding → redirecionar
    if (requiresOnboarding(pathname)) {
      const onboardingUrl = getOnboardingUrl(ctx);
      return NextResponse.redirect(new URL(onboardingUrl, request.url));
    }
  }

  // ── 7. Rotas admin ───────────────────────────────────────────
  if (isAdminRoute(pathname)) {
    if (!canAccessAdmin(ctx)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return supabaseResponse;
  }

  // ── 8. Rotas fabricante ──────────────────────────────────────
  if (isFabricanteRoute(pathname)) {
    if (!canAccessFabricante(ctx)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return supabaseResponse;
  }

  // ── 9. Rota autenticada genérica: pass-through ───────────────
  return supabaseResponse;
}

// ============================================================
// MATCHER — quais rotas passam pelo middleware
// Exclui: _next/static, _next/image, favicon.ico, arquivos estáticos
// ============================================================
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
