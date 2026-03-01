'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { Package, Users, Image, FlaskConical, Store, Factory, CheckCircle2 } from 'lucide-react';
import { useAdminTestMode } from '@/hooks/useAdminTestMode';

export default function AdminPage() {
  const [stats, setStats] = useState({ products: 0, users: 0, generations: 0 });
  const supabase = createClient();
  const router = useRouter();
  const { testRole, enterTestMode, exitTestMode } = useAdminTestMode();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      const [{ count: p }, { count: u }, { count: g }] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('generations').select('id', { count: 'exact', head: true }),
      ]);
      if (!cancelled) setStats({ products: p || 0, users: u || 0, generations: g || 0 });
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  const cards = [
    { label: 'Produtos', value: stats.products, icon: Package, color: 'text-blue-400 bg-blue-500/10' },
    { label: 'Usuários', value: stats.users, icon: Users, color: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Gerações', value: stats.generations, icon: Image, color: 'text-amber-400 bg-amber-500/10' },
  ];

  const handleEnterTestMode = (role: 'lojista' | 'fabricante') => {
    enterTestMode(role);
    router.push('/dashboard');
    router.refresh();
  };

  const handleExitTestMode = () => {
    exitTestMode();
    router.refresh();
  };

  return (
    <div className="animate-fade-in-up space-y-8">
      <h1 className="font-display text-2xl font-800">Resumo</h1>

      {/* Stats */}
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

      {/* Modo de Teste */}
      <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical size={18} className="text-purple-400" />
          <h2 className="font-display text-lg font-800">Modo de Teste</h2>
        </div>
        <p className="text-sm text-dark-400 mb-5">
          Visualize e interaja com o dashboard exatamente como um Lojista ou Fabricante real,
          sem alterar seu role ou dados. Suas permissões de Super Admin são preservadas.
        </p>

        {testRole ? (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/50 border border-dark-700/40">
            <div className="flex items-center gap-2 text-sm font-600">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-dark-300">
                Modo de teste ativo como{' '}
                <strong className="text-white font-800">
                  {testRole === 'lojista' ? 'Lojista' : 'Fabricante'}
                </strong>
              </span>
            </div>
            <button
              onClick={handleExitTestMode}
              className="ml-auto px-4 py-2 rounded-xl text-sm font-700 bg-dark-700/60 hover:bg-dark-700 text-dark-200 hover:text-white transition-all"
            >
              Sair do modo de teste
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleEnterTestMode('lojista')}
              className="group flex items-center gap-3 p-4 rounded-xl bg-brand-600/8 border border-brand-500/20 hover:bg-brand-600/15 hover:border-brand-500/40 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center shrink-0 group-hover:bg-brand-600/30 transition-colors">
                <Store size={18} className="text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-800 text-white">Testar como Lojista</p>
                <p className="text-xs text-dark-400 mt-0.5">Ver dashboard, setores, artes e brand kit</p>
              </div>
            </button>

            <button
              onClick={() => handleEnterTestMode('fabricante')}
              className="group flex items-center gap-3 p-4 rounded-xl bg-blue-600/8 border border-blue-500/20 hover:bg-blue-600/15 hover:border-blue-500/40 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0 group-hover:bg-blue-600/30 transition-colors">
                <Factory size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-800 text-white">Testar como Fabricante</p>
                <p className="text-xs text-dark-400 mt-0.5">Ver produtos, categorias, templates e perfil</p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
