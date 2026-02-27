'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shield, Package, LayoutTemplate, Users, ArrowLeft } from 'lucide-react';

const adminNav = [
  { href: '/dashboard/admin', icon: Shield, label: 'Painel Admin', exact: true },
  { href: '/dashboard/admin/produtos', icon: Package, label: 'Produtos' },
  { href: '/dashboard/admin/templates', icon: LayoutTemplate, label: 'Templates' },
  { href: '/dashboard/admin/clients', icon: Users, label: 'Clientes' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      {/* Admin header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Shield size={16} className="text-amber-400" />
          </div>
          <span className="font-display font-700 text-sm text-amber-400">Painel Admin</span>
        </div>
        <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Voltar ao app
        </Link>
      </div>

      {/* Admin nav */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {adminNav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-500 whitespace-nowrap transition-all ${active ? 'bg-amber-500/15 text-amber-400' : 'bg-dark-800/40 text-dark-400 hover:text-white hover:bg-dark-800'}`}>
              <item.icon size={16} /> {item.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
