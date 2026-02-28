'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { 
  Sparkles, LayoutDashboard, Palette, Package, 
  Image as ImageIcon, User, LogOut, Shield, 
  Menu, X, Factory, Store 
} from 'lucide-react';
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
    <div className="min-h-screen flex bg-dark-950 text-white">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-dark-950 border-r border-dark-800/40 flex flex-col transition-all duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="h-20 px-6 flex items-center justify-between border-b border-dark-800/40">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/20 group-hover:scale-105 transition-transform">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="font-display font-800 text-base tracking-tight">Fábrica de <span className="text-brand-400">Posts</span></span>
          </Link>
          <button className="lg:hidden text-dark-400 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>

        {/* User Profile Summary in Sidebar */}
        {profile && (
          <div className="px-6 py-6 border-b border-dark-800/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-dark-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-700 truncate">{profile.full_name || 'Usuário'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {profile.role === 'fabricante' ? (
                    <Factory size={10} className="text-blue-400" />
                  ) : profile.role === 'admin' ? (
                    <Shield size={10} className="text-purple-400" />
                  ) : (
                    <Store size={10} className="text-brand-400" />
                  )}
                  <span className={`text-[9px] font-800 uppercase tracking-widest ${
                    profile.role === 'fabricante' ? 'text-blue-400' : 
                    profile.role === 'admin' ? 'text-purple-400' : 'text-brand-400'
                  }`}>
                    {profile.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-700 transition-all border ${
                  active 
                    ? 'bg-brand-600/10 border-brand-500/20 text-brand-400 shadow-sm' 
                    : 'text-dark-400 border-transparent hover:text-white hover:bg-dark-800/60'
                }`}>
                <item.icon size={18} className={active ? 'text-brand-400' : 'text-dark-500'} />
                {item.label}
              </Link>
            );
          })}

          {profile?.role === 'admin' && (
            <>
              <div className="h-px bg-dark-800/40 my-4 mx-2" />
              <Link href="/dashboard/admin" onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-700 transition-all border ${
                  pathname.startsWith('/dashboard/admin') 
                    ? 'bg-purple-600/10 border-purple-500/20 text-purple-400 shadow-sm' 
                    : 'text-dark-400 border-transparent hover:text-white hover:bg-dark-800/60'
                }`}>
                <Shield size={18} className={pathname.startsWith('/dashboard/admin') ? 'text-purple-400' : 'text-dark-500'} />
                Admin
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-dark-800/40">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-700 text-dark-400 hover:text-red-400 hover:bg-red-500/5 transition-all group">
            <LogOut size={18} className="group-hover:text-red-400 transition-colors" /> Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 h-16 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/40 flex items-center px-6">
          <button onClick={() => setSidebarOpen(true)} className="text-dark-300 hover:text-white transition-colors"><Menu size={24} /></button>
          <div className="ml-4 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="font-display font-800 text-sm tracking-tight">Fábrica de <span className="text-brand-400">Posts</span></span>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
