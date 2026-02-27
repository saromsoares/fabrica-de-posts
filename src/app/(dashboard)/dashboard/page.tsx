'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Zap, Clock, Image, Star } from 'lucide-react';
import Link from 'next/link';
import type { UsageInfo, Generation } from '@/types/database';

export default function DashboardPage() {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<Generation[]>([]);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar usage
      const { data: usageData } = await supabase.rpc('get_usage', { p_user_id: user.id });
      if (usageData) setUsage(usageData as UsageInfo);

      // Últimas gerações
      const { data: gens } = await supabase
        .from('generations')
        .select('*, product:products(name), template:templates(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);
      if (gens) setRecentGenerations(gens as Generation[]);
    })();
  }, [supabase]);

  const usagePercent = usage ? Math.round((usage.count / usage.limit) * 100) : 0;

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-display text-3xl font-800 tracking-tight mb-8">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600/10 flex items-center justify-center">
              <Image size={20} className="text-brand-400" />
            </div>
            <span className="text-sm text-dark-400">Artes este mês</span>
          </div>
          <div className="font-display text-3xl font-800">{usage?.count ?? 0}<span className="text-lg text-dark-500">/{usage?.limit ?? 5}</span></div>
          <div className="mt-3 h-2 bg-dark-800 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${Math.min(usagePercent, 100)}%` }} />
          </div>
        </div>

        <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center">
              <Zap size={20} className="text-emerald-400" />
            </div>
            <span className="text-sm text-dark-400">Restantes</span>
          </div>
          <div className="font-display text-3xl font-800">{usage?.remaining ?? 5}</div>
        </div>

        <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 flex items-center justify-center">
              <Star size={20} className="text-violet-400" />
            </div>
            <span className="text-sm text-dark-400">Plano</span>
          </div>
          <div className="font-display text-3xl font-800 capitalize">{usage?.plan ?? 'free'}</div>
        </div>

        <Link href="/dashboard/produtos" className="bg-brand-600/10 border border-brand-500/30 rounded-2xl p-5 hover:bg-brand-600/20 transition-all group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-sm text-brand-300">Ação rápida</span>
          </div>
          <div className="font-display text-lg font-700 text-brand-300 group-hover:text-brand-200 transition-colors">Gerar nova arte →</div>
        </Link>
      </div>

      {/* Últimas gerações */}
      <h2 className="font-display text-xl font-700 mb-4">Últimas gerações</h2>
      {recentGenerations.length === 0 ? (
        <div className="bg-dark-900/40 border border-dark-800/40 rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">✨</div>
          <p className="text-dark-400">Nenhuma arte gerada ainda.</p>
          <Link href="/dashboard/produtos" className="inline-block mt-4 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-600 rounded-xl transition-all">
            Criar primeira arte
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {recentGenerations.map((gen) => (
            <div key={gen.id} className="bg-dark-900/60 border border-dark-800/40 rounded-2xl overflow-hidden group">
              {gen.image_url ? (
                <div className="aspect-square bg-dark-800 flex items-center justify-center overflow-hidden">
                  <img src={gen.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-square bg-dark-800 flex items-center justify-center">
                  <Clock size={24} className="text-dark-600" />
                </div>
              )}
              <div className="p-3">
                <p className="text-xs text-dark-400 truncate">{(gen.product as {name?: string})?.name || 'Produto'}</p>
                <p className="text-[10px] text-dark-500 mt-1 capitalize">{gen.format} · {new Date(gen.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
