/* eslint-disable no-console */
/**
 * middleware-rules.test.ts
 * Testes dos helpers puros de route-rules.ts.
 * Executar com: node src/__tests__/middleware-rules.test.ts
 *
 * Não requer jest/vitest — usa Node.js puro com assert.
 */

// Simular o módulo route-rules sem imports do Next.js
// (copiando as funções para teste isolado)

interface AuthContext {
  role: string;
  plan: string;
  onboarding_complete: boolean;
  is_super_admin: boolean;
  has_factory: boolean;
}

const ROUTE_RULES = {
  public: ['/', '/login', '/signup', '/auth/callback', '/auth/confirm', '/reset-password', '/termos', '/privacidade'],
  requiresOnboarding: ['/dashboard', '/dashboard/estudio', '/dashboard/historico', '/dashboard/produtos', '/dashboard/setores', '/dashboard/fabricas', '/dashboard/categorias', '/dashboard/templates'],
  fabricante: ['/dashboard/fabricante'],
  admin: ['/dashboard/admin'],
  onboarding: ['/onboarding'],
  redirectIfAuthenticated: ['/login', '/signup'],
  onboardingExempt: ['/dashboard/brand-kit', '/dashboard/conta', '/dashboard/admin', '/dashboard/fabricante', '/onboarding'],
} as const;

function isPublicRoute(pathname: string): boolean {
  return ROUTE_RULES.public.some(r => pathname === r || pathname.startsWith(r + '/'));
}
function isStaticAsset(pathname: string): boolean {
  return pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/favicon') || /\.[a-zA-Z0-9]+$/.test(pathname);
}
function isAdminRoute(pathname: string): boolean {
  return ROUTE_RULES.admin.some(r => pathname === r || pathname.startsWith(r + '/'));
}
function isFabricanteRoute(pathname: string): boolean {
  return ROUTE_RULES.fabricante.some(r => pathname === r || pathname.startsWith(r + '/'));
}
function isOnboardingRoute(pathname: string): boolean {
  return ROUTE_RULES.onboarding.some(r => pathname === r || pathname.startsWith(r + '/'));
}
function requiresOnboarding(pathname: string): boolean {
  const isExempt = ROUTE_RULES.onboardingExempt.some(r => pathname === r || pathname.startsWith(r + '/'));
  if (isExempt) return false;
  return ROUTE_RULES.requiresOnboarding.some(r => pathname === r || pathname.startsWith(r + '/'));
}
function shouldRedirectIfAuthenticated(pathname: string): boolean {
  return ROUTE_RULES.redirectIfAuthenticated.some(r => pathname === r || pathname.startsWith(r + '/'));
}
function canAccessAdmin(ctx: AuthContext): boolean {
  return ctx.is_super_admin || ['admin', 'super_admin'].includes(ctx.role);
}
function canAccessFabricante(ctx: AuthContext): boolean {
  return ctx.is_super_admin || ['fabricante', 'admin', 'super_admin'].includes(ctx.role);
}

// ── Test runner simples ──────────────────────────────────────
let passed = 0;
let failed = 0;

function test(description: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${description}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${description}`);
    console.error(`     ${(e as Error).message}`);
    failed++;
  }
}

function expect(value: unknown) {
  return {
    toBe(expected: unknown) {
      if (value !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
      }
    },
    toBeTrue() {
      if (value !== true) throw new Error(`Expected true, got ${JSON.stringify(value)}`);
    },
    toBeFalse() {
      if (value !== false) throw new Error(`Expected false, got ${JSON.stringify(value)}`);
    },
  };
}

// ── Testes: isPublicRoute ────────────────────────────────────
console.log('\n📋 isPublicRoute');
test('/ is public', () => expect(isPublicRoute('/')).toBeTrue());
test('/login is public', () => expect(isPublicRoute('/login')).toBeTrue());
test('/signup is public', () => expect(isPublicRoute('/signup')).toBeTrue());
test('/auth/callback is public', () => expect(isPublicRoute('/auth/callback')).toBeTrue());
test('/termos is public', () => expect(isPublicRoute('/termos')).toBeTrue());
test('/dashboard is NOT public', () => expect(isPublicRoute('/dashboard')).toBeFalse());
test('/dashboard/admin is NOT public', () => expect(isPublicRoute('/dashboard/admin')).toBeFalse());
test('/onboarding is NOT public', () => expect(isPublicRoute('/onboarding')).toBeFalse());

// ── Testes: isStaticAsset ────────────────────────────────────
console.log('\n📋 isStaticAsset');
test('/_next/static is static', () => expect(isStaticAsset('/_next/static/chunks/main.js')).toBeTrue());
test('/api/health is static (API)', () => expect(isStaticAsset('/api/health')).toBeTrue());
test('/favicon.ico is static', () => expect(isStaticAsset('/favicon.ico')).toBeTrue());
test('/logo.png is static', () => expect(isStaticAsset('/logo.png')).toBeTrue());
test('/dashboard is NOT static', () => expect(isStaticAsset('/dashboard')).toBeFalse());
test('/onboarding is NOT static', () => expect(isStaticAsset('/onboarding')).toBeFalse());

// ── Testes: isAdminRoute ─────────────────────────────────────
console.log('\n📋 isAdminRoute');
test('/dashboard/admin is admin route', () => expect(isAdminRoute('/dashboard/admin')).toBeTrue());
test('/dashboard/admin/fabricas is admin route', () => expect(isAdminRoute('/dashboard/admin/fabricas')).toBeTrue());
test('/dashboard/admin/produtos is admin route', () => expect(isAdminRoute('/dashboard/admin/produtos')).toBeTrue());
test('/dashboard/admin/categorias is admin route', () => expect(isAdminRoute('/dashboard/admin/categorias')).toBeTrue());
test('/dashboard/admin/clients is admin route', () => expect(isAdminRoute('/dashboard/admin/clients')).toBeTrue());
test('/dashboard is NOT admin route', () => expect(isAdminRoute('/dashboard')).toBeFalse());
test('/dashboard/fabricante is NOT admin route', () => expect(isAdminRoute('/dashboard/fabricante')).toBeFalse());

// ── Testes: isFabricanteRoute ────────────────────────────────
console.log('\n📋 isFabricanteRoute');
test('/dashboard/fabricante is fabricante route', () => expect(isFabricanteRoute('/dashboard/fabricante')).toBeTrue());
test('/dashboard/fabricante/produtos is fabricante route', () => expect(isFabricanteRoute('/dashboard/fabricante/produtos')).toBeTrue());
test('/dashboard/fabricante/categorias is fabricante route', () => expect(isFabricanteRoute('/dashboard/fabricante/categorias')).toBeTrue());
test('/dashboard/fabricante/perfil is fabricante route', () => expect(isFabricanteRoute('/dashboard/fabricante/perfil')).toBeTrue());
test('/dashboard is NOT fabricante route', () => expect(isFabricanteRoute('/dashboard')).toBeFalse());
test('/dashboard/admin is NOT fabricante route', () => expect(isFabricanteRoute('/dashboard/admin')).toBeFalse());

// ── Testes: isOnboardingRoute ────────────────────────────────
console.log('\n📋 isOnboardingRoute');
test('/onboarding is onboarding route', () => expect(isOnboardingRoute('/onboarding')).toBeTrue());
test('/dashboard is NOT onboarding route', () => expect(isOnboardingRoute('/dashboard')).toBeFalse());

// ── Testes: requiresOnboarding ───────────────────────────────
console.log('\n📋 requiresOnboarding');
test('/dashboard requires onboarding', () => expect(requiresOnboarding('/dashboard')).toBeTrue());
test('/dashboard/estudio/123 requires onboarding', () => expect(requiresOnboarding('/dashboard/estudio/123')).toBeTrue());
test('/dashboard/historico requires onboarding', () => expect(requiresOnboarding('/dashboard/historico')).toBeTrue());
test('/dashboard/setores requires onboarding', () => expect(requiresOnboarding('/dashboard/setores')).toBeTrue());
test('/dashboard/brand-kit does NOT require onboarding (exempt)', () => expect(requiresOnboarding('/dashboard/brand-kit')).toBeFalse());
test('/dashboard/conta does NOT require onboarding (exempt)', () => expect(requiresOnboarding('/dashboard/conta')).toBeFalse());
test('/dashboard/admin does NOT require onboarding (exempt)', () => expect(requiresOnboarding('/dashboard/admin')).toBeFalse());
test('/dashboard/fabricante does NOT require onboarding (exempt)', () => expect(requiresOnboarding('/dashboard/fabricante')).toBeFalse());
test('/onboarding does NOT require onboarding (exempt)', () => expect(requiresOnboarding('/onboarding')).toBeFalse());

// ── Testes: shouldRedirectIfAuthenticated ────────────────────
console.log('\n📋 shouldRedirectIfAuthenticated');
test('/login should redirect if authenticated', () => expect(shouldRedirectIfAuthenticated('/login')).toBeTrue());
test('/signup should redirect if authenticated', () => expect(shouldRedirectIfAuthenticated('/signup')).toBeTrue());
test('/dashboard should NOT redirect if authenticated', () => expect(shouldRedirectIfAuthenticated('/dashboard')).toBeFalse());

// ── Testes: canAccessAdmin ───────────────────────────────────
console.log('\n📋 canAccessAdmin');
const superAdmin: AuthContext = { role: 'super_admin', plan: 'pro', onboarding_complete: true, is_super_admin: true, has_factory: false };
const admin: AuthContext = { role: 'admin', plan: 'pro', onboarding_complete: true, is_super_admin: false, has_factory: false };
const fabricante: AuthContext = { role: 'fabricante', plan: 'pro', onboarding_complete: true, is_super_admin: false, has_factory: true };
const lojista: AuthContext = { role: 'lojista', plan: 'free', onboarding_complete: true, is_super_admin: false, has_factory: false };
const lojistaSuperAdmin: AuthContext = { role: 'lojista', plan: 'free', onboarding_complete: true, is_super_admin: true, has_factory: false };

test('super_admin (role) can access admin', () => expect(canAccessAdmin(superAdmin)).toBeTrue());
test('admin (role) can access admin', () => expect(canAccessAdmin(admin)).toBeTrue());
test('lojista with is_super_admin=true can access admin', () => expect(canAccessAdmin(lojistaSuperAdmin)).toBeTrue());
test('fabricante cannot access admin', () => expect(canAccessAdmin(fabricante)).toBeFalse());
test('lojista cannot access admin', () => expect(canAccessAdmin(lojista)).toBeFalse());

// ── Testes: canAccessFabricante ──────────────────────────────
console.log('\n📋 canAccessFabricante');
test('super_admin can access fabricante routes', () => expect(canAccessFabricante(superAdmin)).toBeTrue());
test('admin can access fabricante routes', () => expect(canAccessFabricante(admin)).toBeTrue());
test('fabricante can access fabricante routes', () => expect(canAccessFabricante(fabricante)).toBeTrue());
test('lojista with is_super_admin=true can access fabricante routes', () => expect(canAccessFabricante(lojistaSuperAdmin)).toBeTrue());
test('lojista cannot access fabricante routes', () => expect(canAccessFabricante(lojista)).toBeFalse());

// ── Resultado final ──────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Resultado: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n⚠️  ${failed} teste(s) falharam!`);
  process.exit(1);
} else {
  console.log('\n🎉 Todos os testes passaram!');
  process.exit(0);
}
