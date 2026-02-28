'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { Sparkles, LayoutDashboard, Palette, Package, Clock, User, LogOut, Menu, X, Settings } from 'lucide-react';
import type { Profile } from '@/types/database';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/brand-kit', icon: Palette, label: 'Brand Kit' },
  { href: '/dashboard/produtos', icon: Package, label: 'Catálogo' },
  { href: '/dashboard/historico', icon: Clock, label: 'Minhas Artes' },
  { href: '/dashboard/conta', icon: User, label: 'Conta' },
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !cancelled) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, role, plan, onboarding_complete')
          .eq('id', user.id)
          .single();
        if (data && !cancelled) setProfile(data as Profile);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed top-0 left-0 h-screen z-50 w-64 bg-dark-950 border-r border-dark-800/40 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-500 transition-all ${active ? 'bg-brand-600/15 text-brand-400' : 'text-dark-400 hover:text-white hover:bg-dark-800/60'}`}>
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="h-px bg-dark-800/40 my-3" />
              <div className="px-3 mb-2">
                <span className="text-[11px] font-700 text-amber-400 uppercase tracking-wider">
                  🔧 Área da Fábrica (Admin)
                </span>
              </div>
              <Link href="/dashboard/admin/fabricas" onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-500 transition-all ${pathname.startsWith('/dashboard/admin/fabricas') ? 'bg-amber-500/15 text-amber-400' : 'text-dark-400 hover:text-white hover:bg-dark-800/60'}`}>
                <span className="text-base">🏭</span> Cadastrar Fábrica
              </Link>
              <Link href="/dashboard/admin/produtos" onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-500 transition-all ${pathname.startsWith('/dashboard/admin/produtos') ? 'bg-amber-500/15 text-amber-400' : 'text-dark-400 hover:text-white hover:bg-dark-800/60'}`}>
                <span className="text-base">📦</span> Cadastrar Produto
              </Link>
              <Link href="/dashboard/admin/categorias" onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-500 transition-all ${pathname.startsWith('/dashboard/admin/categorias') ? 'bg-amber-500/15 text-amber-400' : 'text-dark-400 hover:text-white hover:bg-dark-800/60'}`}>
                <span className="text-base">🏷️</span> Categorias
              </Link>
              <Link href="/dashboard/admin/clients" onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-500 transition-all ${pathname.startsWith('/dashboard/admin/clients') ? 'bg-amber-500/15 text-amber-400' : 'text-dark-400 hover:text-white hover:bg-dark-800/60'}`}>
                <Settings size={18} /> Clientes
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

      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
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
