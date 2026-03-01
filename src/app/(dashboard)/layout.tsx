'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import {
  Sparkles, LayoutDashboard, Palette, Package,
  Image as ImageIcon, User, LogOut, Shield,
  Menu, X, Factory, Store, Grid3X3, FolderOpen,
  LayoutTemplate, Settings, ChevronRight,
} from 'lucide-react';
import type { Profile } from '@/types/database';
import { isAdminRole } from '@/lib/role-helpers';
import NotificationBell from '@/components/notifications/NotificationBell';
import LogoAvatar from '@/components/ui/LogoAvatar';

type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  exact: boolean;
};

// Navegação do LOJISTA
const lojistaNav: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/dashboard/setores', icon: Grid3X3, label: 'Setores', exact: false },
  { href: '/dashboard/historico', icon: ImageIcon, label: 'Minhas Artes', exact: true },
  { href: '/dashboard/brand-kit', icon: Palette, label: 'Brand Kit', exact: true },
  { href: '/dashboard/conta', icon: User, label: 'Conta', exact: true },
];

// Navegação do FABRICANTE
const fabricanteNav: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/dashboard/fabricante/produtos', icon: Package, label: 'Produtos', exact: false },
  { href: '/dashboard/fabricante/categorias', icon: FolderOpen, label: 'Categorias', exact: false },
  { href: '/dashboard/fabricante/templates', icon: LayoutTemplate, label: 'Templates', exact: true },
  { href: '/dashboard/fabricante/perfil', icon: Settings, label: 'Perfil da Fábrica', exact: true },
  { href: '/dashboard/conta', icon: User, label: 'Conta', exact: true },
];

// Navegação do ADMIN
const adminNav: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/dashboard/setores', icon: Grid3X3, label: 'Setores', exact: false },
  { href: '/dashboard/historico', icon: ImageIcon, label: 'Minhas Artes', exact: true },
  { href: '/dashboard/brand-kit', icon: Palette, label: 'Brand Kit', exact: true },
  { href: '/dashboard/conta', icon: User, label: 'Conta', exact: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !cancelled) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data && !cancelled) setProfile(data as Profile);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getNavItems = (): NavItem[] => {
    if (!profile) return lojistaNav;
    if (isAdminRole(profile)) return adminNav;
    if (profile.role === 'fabricante') return fabricanteNav;
    return lojistaNav;
  };

  const navItems = getNavItems();

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href) ||
      (item.href === '/dashboard/fabricante/produtos' && pathname.startsWith('/dashboard/estudio')) ||
      (item.href === '/dashboard/setores' && (
        pathname.startsWith('/dashboard/fabricas') ||
        pathname.startsWith('/dashboard/categorias')
      ));
  };

  const roleConfig = profile ? (
    profile.role === 'fabricante'
      ? { label: 'Painel Fabricante', color: 'text-blue-400', icon: Factory, accent: 'bg-blue-600/10 border-blue-500/20 text-blue-400' }
      : isAdminRole(profile)
        ? { label: 'Painel Admin', color: 'text-purple-400', icon: Shield, accent: 'bg-purple-600/10 border-purple-500/20 text-purple-400' }
        : { label: 'Painel Lojista', color: 'text-brand-400', icon: Store, accent: 'bg-brand-600/10 border-brand-500/20 text-brand-400' }
  ) : null;

  return (
    <div className="min-h-screen flex bg-dark-950 text-white">
      {/* Mobile overlay — with smooth fade transition */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-dark-950 border-r border-dark-800/40 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl shadow-black/60' : '-translate-x-full'
        }`}
        aria-label="Navegação principal"
      >
        {/* Logo */}
        <div className="h-[68px] px-5 flex items-center justify-between border-b border-dark-800/40 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-md shadow-brand-600/25 group-hover:shadow-brand-600/40 transition-shadow">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-display font-800 text-[15px] tracking-tight">
              Fábrica de <span className="text-brand-400">Posts</span>
            </span>
          </Link>
          <button
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/60 transition-all"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* User profile */}
        {profile && roleConfig ? (
          <div className="px-4 py-4 border-b border-dark-800/40 shrink-0">
            <div className="flex items-center gap-3">
              <LogoAvatar src={profile.avatar_url} alt={profile.full_name || 'Usuário'} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-700 text-white truncate leading-tight">
                  {profile.full_name || 'Usuário'}
                </p>
                <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-800 uppercase tracking-wider border ${roleConfig.accent}`}>
                  <roleConfig.icon size={8} />
                  {isAdminRole(profile) ? 'Super Admin' : profile.role}
                </span>
              </div>
              <NotificationBell />
            </div>
          </div>
        ) : (
          /* Skeleton while loading */
          <div className="px-4 py-4 border-b border-dark-800/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl skeleton-shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-28 skeleton-shimmer" />
                <div className="h-2.5 w-16 skeleton-shimmer" />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto" aria-label="Menu principal">
          {/* Section label */}
          {roleConfig && (
            <div className="px-3 pb-2 pt-1">
              <span className="text-[9px] font-800 uppercase tracking-widest text-dark-600">
                {roleConfig.label}
              </span>
            </div>
          )}

          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-600 transition-all duration-150
                  ${active
                    ? 'bg-brand-600/12 text-white'
                    : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800/50'
                  }
                `}
              >
                {/* Active indicator bar */}
                <div className={`w-0.5 h-5 rounded-full transition-all duration-150 shrink-0 ${
                  active ? 'bg-brand-400' : 'bg-transparent group-hover:bg-dark-700'
                }`} />
                <item.icon
                  size={17}
                  className={`shrink-0 transition-colors ${active ? 'text-brand-400' : 'text-dark-500 group-hover:text-dark-300'}`}
                />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight size={13} className="text-brand-500/60 shrink-0" />}
              </Link>
            );
          })}

          {/* Admin section */}
          {profile && isAdminRole(profile) && (
            <>
              <div className="h-px bg-dark-800/40 my-3 mx-1" />
              <div className="px-3 pb-2">
                <span className="text-[9px] font-800 uppercase tracking-widest text-dark-600">Administração</span>
              </div>
              <Link
                href="/dashboard/admin"
                aria-current={pathname.startsWith('/dashboard/admin') ? 'page' : undefined}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-600 transition-all duration-150
                  ${pathname.startsWith('/dashboard/admin')
                    ? 'bg-purple-600/12 text-white'
                    : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800/50'
                  }
                `}
              >
                <div className={`w-0.5 h-5 rounded-full transition-all shrink-0 ${
                  pathname.startsWith('/dashboard/admin') ? 'bg-purple-400' : 'bg-transparent group-hover:bg-dark-700'
                }`} />
                <Shield
                  size={17}
                  className={`shrink-0 ${pathname.startsWith('/dashboard/admin') ? 'text-purple-400' : 'text-dark-500 group-hover:text-dark-300'}`}
                />
                <span className="flex-1">Admin</span>
                {pathname.startsWith('/dashboard/admin') && <ChevronRight size={13} className="text-purple-500/60 shrink-0" />}
              </Link>
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-dark-800/40 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-600 text-dark-500 hover:text-red-400 hover:bg-red-500/6 transition-all duration-150"
          >
            <div className="w-0.5 h-5 rounded-full bg-transparent group-hover:bg-red-500/40 transition-all shrink-0" />
            <LogOut size={17} className="shrink-0 transition-colors" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 h-14 bg-dark-950/90 glass border-b border-dark-800/40 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-dark-300 hover:text-white hover:bg-dark-800/60 transition-all"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
                <Sparkles size={13} className="text-white" />
              </div>
              <span className="font-display font-800 text-sm tracking-tight">
                Fábrica de <span className="text-brand-400">Posts</span>
              </span>
            </div>
          </div>
          <NotificationBell />
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 sm:p-6 lg:p-8 xl:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
