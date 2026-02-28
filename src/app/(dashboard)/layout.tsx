'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { Sparkles, LayoutDashboard, Palette, Package, Image as ImageIcon, User, LogOut, Shield, Menu, X } from 'lucide-react';
import type { Profile } from '@/types/database';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/dashboard/produtos', icon: Package, label: 'Produtos', exact: false },
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
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data as Profile);
      }
    })();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (item: typeof navItems[number]) => {
    if (item.exact) return pathname === item.href;
    // Sub-route match: /dashboard/produtos, /dashboard/produtos/xxx, /dashboard/estudio/xxx
    return pathname.startsWith(item.href) || (item.href === '/dashboard/produtos' && pathname.startsWith('/dashboard/estudio'));
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-dark-950 border-r border-dark-800/40 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 px-6 flex items-center justify-between border-b border-dark-800/40">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-display font-700 text-sm tracking-tight">Fábrica de <span className="text-brand-400">Posts</span></span>
          </Link>
          <button className="lg:hidden text-dark-400" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-500 transition-all ${active ? 'bg-brand-600/15 text-brand-400' : 'text-dark-400 hover:text-white hover:bg-dark-800/60'}`}>
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}

          {profile?.role === 'admin' && (
            <>
              <div className="h-px bg-dark-800/40 my-3" />
              <Link href="/dashboard/admin" onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-500 transition-all ${pathname.startsWith('/dashboard/admin') ? 'bg-brand-600/15 text-brand-400' : 'text-dark-400 hover:text-white hover:bg-dark-800/60'}`}>
                <Shield size={18} /> Admin
              </Link>
            </>
          )}
        </nav>

        <div className="p-3 border-t border-dark-800/40">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-dark-400 hover:text-white hover:bg-dark-800/60 transition-all">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 h-14 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/40 flex items-center px-4">
          <button onClick={() => setSidebarOpen(true)} className="text-dark-300"><Menu size={22} /></button>
          <span className="ml-3 font-display font-700 text-sm">Fábrica de <span className="text-brand-400">Posts</span></span>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
