import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Rotas públicas
  const isPublic = path === '/' || path.startsWith('/login') || path.startsWith('/auth/callback');

  // Não autenticado + rota protegida → login
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Autenticado na landing/login → dashboard
  if (user && (path === '/' || path.startsWith('/login'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Proteger rotas admin: só role='admin' ou 'super_admin' acessa
  if (user && path.startsWith('/dashboard/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin')
      .eq('id', user.id)
      .single();

    const hasAdminAccess = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.is_super_admin === true;
    if (!hasAdminAccess) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Onboarding: redirecionar para /onboarding se não completou
  // Permitir acesso a: /onboarding, /dashboard/brand-kit, /dashboard/admin, /dashboard/conta
  if (user && path.startsWith('/dashboard') && !path.startsWith('/dashboard/brand-kit') && !path.startsWith('/dashboard/admin') && !path.startsWith('/dashboard/conta')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', user.id)
      .single();

    if (profile && !profile.onboarding_complete) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
