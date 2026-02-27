'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Package, Users, Image } from 'lucide-react';

export default function AdminPage() {
  const [stats, setStats] = useState({ products: 0, users: 0, generations: 0 });
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const [{ count: p }, { count: u }, { count: g }] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('generations').select('id', { count: 'exact', head: true }),
      ]);
      setStats({ products: p || 0, users: u || 0, generations: g || 0 });
    })();
  }, [supabase]);

  const cards = [
    { label: 'Produtos', value: stats.products, icon: Package, color: 'text-blue-400 bg-blue-500/10' },
    { label: 'Usuários', value: stats.users, icon: Users, color: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Gerações', value: stats.generations, icon: Image, color: 'text-amber-400 bg-amber-500/10' },
  ];

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-display text-2xl font-800 mb-6">Resumo</h1>
      <div className="grid grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl ${c.color} flex items-center justify-center mb-3`}>
              <c.icon size={20} />
            </div>
            <div className="font-display text-3xl font-800">{c.value}</div>
            <p className="text-xs text-dark-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
