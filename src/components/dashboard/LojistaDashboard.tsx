'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import {
  Store, Image as ImageIcon, Factory, Clock, Sparkles,
  ArrowRight, Loader2, AlertCircle, Zap, Package,
  TrendingUp, Crown,
} from 'lucide-react';

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */

interface LojistaStats {
  total_generations: number;
  usage_count: number;
  usage_limit: number;
  usage_percentage: number;
  factories_followed: number;
  pending_follows: number;
}

interface RecentGeneration {
  id: string;
  caption: string | null;
  image_url: string | null;
  format: string;
  created_at: string;
  products: { name: string; image_url: string | null } | null;
}

const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  loja: 50,
  pro: 999999,
};

/* ═══════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════ */

export default function LojistaDashboard({ userName }: { userName: string }) {
  const supabase = createClient();
  const [plan, setPlan] = useState('free');
  const [stats, setStats] = useState<LojistaStats>({
    total_generations: 0, usage_count: 0, usage_limit: 5,
    usage_percentage: 0, factories_followed: 0, pending_follows: 0,
  });
  const [recentGenerations, setRecentGenerations] = useState<RecentGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Sessão expirada. Faça login novamente.'); setLoading(false); return; }

      // 1. Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

      const userPlan = profile?.plan || 'free';
      setPlan(userPlan);
      const limit = PLAN_LIMITS[userPlan] ?? 5;

      // 2. Count generations this month
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count: monthlyCount } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', firstOfMonth);

      // 3. Total generations
      const { count: totalGenerations } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // 4. Factories followed (approved)
      const { count: factoriesFollowed } = await supabase
        .from('factory_followers')
        .select('*', { count: 'exact', head: true })
        .eq('lojista_id', user.id)
        .eq('status', 'approved');

      // 5. Pending follows
      const { count: pendingFollows } = await supabase
        .from('factory_followers')
        .select('*', { count: 'exact', head: true })
        .eq('lojista_id', user.id)
        .eq('status', 'pending');

      const usageCount = monthlyCount ?? 0;
      const usagePercentage = limit > 0 ? Math.round((usageCount / limit) * 100) : 0;

      setStats({
        total_generations: totalGenerations ?? 0,
        usage_count: usageCount,
        usage_limit: limit,
        usage_percentage: usagePercentage,
        factories_followed: factoriesFollowed ?? 0,
        pending_follows: pendingFollows ?? 0,
      });

      // 6. Recent generations (last 5)
      const { data: generations } = await supabase
        .from('generations')
        .select(`
          id, caption, image_url, format, created_at,
          products:product_id(name, image_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentGenerations((generations as unknown as RecentGeneration[]) ?? []);

    } catch (err) {
      console.error('LojistaDashboard error:', err);
      setError('Erro ao carregar dados. Tente novamente.');
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // SESSION GUARD: verificar sessão antes de buscar dados
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) {
        console.log('[LojistaDashboard] Sem sessão ativa — abortando fetchData');
        return;
      }
      await fetchData();
    };
    run();
    return () => { cancelled = true; };
  }, [fetchData, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-dark-400 text-sm">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-dark-800 text-white rounded-xl text-sm font-600 hover:bg-dark-700 transition-all">
          Tentar novamente
        </button>
      </div>
    );
  }

  const planLabel = plan === 'pro' ? 'Pro' : plan === 'loja' ? 'Loja' : 'Free';
  const planColor = plan === 'pro' ? 'text-purple-400' : plan === 'loja' ? 'text-blue-400' : 'text-dark-400';
  const planBg = plan === 'pro' ? 'bg-purple-600/10 border-purple-500/20' : plan === 'loja' ? 'bg-blue-600/10 border-blue-500/20' : 'bg-dark-800/30 border-dark-700/30';
  const usageColor = stats.usage_percentage >= 90 ? 'bg-red-500' : stats.usage_percentage >= 70 ? 'bg-amber-500' : 'bg-brand-500';

  return (
    <div className="animate-fade-in-up space-y-8">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-800 tracking-tight flex items-center gap-2">
            <Store className="text-brand-400" size={24} />
            {userName ? `Olá, ${userName}!` : 'Dashboard'}
          </h1>
          <p className="text-dark-400 text-sm mt-1">Visão geral da sua fábrica de posts</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-900/80 border border-dark-800/50 rounded-full self-start sm:self-auto">
          <Store size={14} className="text-brand-400" />
          <span className="text-[10px] font-700 uppercase tracking-wider text-brand-400">Lojista</span>
        </div>
      </div>

      {/* Usage bar */}
      <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-brand-400" />
            <span className="text-sm font-700 text-white">Uso Mensal</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${planBg}`}>
            <Crown size={12} className={planColor} />
            <span className={`text-[10px] font-800 uppercase tracking-wider ${planColor}`}>{planLabel}</span>
          </div>
        </div>

        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-800 text-white">
            {stats.usage_count} <span className="text-sm font-600 text-dark-400">/ {stats.usage_limit === 999999 ? '∞' : stats.usage_limit}</span>
          </span>
          <span className={`text-xs font-700 ${
            stats.usage_percentage >= 90 ? 'text-red-400' : stats.usage_percentage >= 70 ? 'text-amber-400' : 'text-brand-400'
          }`}>
            {stats.usage_limit === 999999 ? 'Ilimitado' : `${stats.usage_percentage}%`}
          </span>
        </div>

        <div className="w-full h-2.5 bg-dark-800/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${usageColor}`}
            style={{ width: `${Math.min(stats.usage_percentage, 100)}%` }}
          />
        </div>

        {stats.usage_percentage >= 90 && stats.usage_limit !== 999999 && (
          <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
            <AlertCircle size={12} />
            Você está quase no limite. Considere fazer upgrade do plano.
          </p>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-600/10 border border-dark-800/30 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Factory size={18} className="text-green-400" />
            <span className="text-xs text-dark-400 font-500">Fábricas</span>
          </div>
          <p className="text-2xl font-800 text-green-400">{stats.factories_followed}</p>
        </div>

        <div className="bg-amber-600/10 border border-dark-800/30 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={18} className="text-amber-400" />
            <span className="text-xs text-dark-400 font-500">Pendentes</span>
          </div>
          <p className="text-2xl font-800 text-amber-400">{stats.pending_follows}</p>
        </div>

        <div className="bg-brand-600/10 border border-dark-800/30 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={18} className="text-brand-400" />
            <span className="text-xs text-dark-400 font-500">Total Posts</span>
          </div>
          <p className="text-2xl font-800 text-brand-400">{stats.total_generations}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/dashboard/setores"
          className="flex items-center gap-4 p-4 bg-dark-900/60 border border-dark-800/40 rounded-2xl hover:border-brand-500/30 transition-all group"
        >
          <div className="p-3 rounded-xl bg-brand-600/15">
            <Sparkles size={20} className="text-brand-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-700 text-white">Gerar Post</p>
            <p className="text-xs text-dark-400 mt-0.5">Criar nova arte</p>
          </div>
          <ArrowRight size={16} className="text-dark-600 group-hover:text-brand-400 transition-colors" />
        </Link>

        <Link
          href="/dashboard/setores"
          className="flex items-center gap-4 p-4 bg-dark-900/60 border border-dark-800/40 rounded-2xl hover:border-blue-500/30 transition-all group"
        >
          <div className="p-3 rounded-xl bg-blue-600/15">
            <Package size={20} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-700 text-white">Catálogo</p>
            <p className="text-xs text-dark-400 mt-0.5">Ver setores</p>
          </div>
          <ArrowRight size={16} className="text-dark-600 group-hover:text-blue-400 transition-colors" />
        </Link>

        <Link
          href="/dashboard/historico"
          className="flex items-center gap-4 p-4 bg-dark-900/60 border border-dark-800/40 rounded-2xl hover:border-purple-500/30 transition-all group"
        >
          <div className="p-3 rounded-xl bg-purple-600/15">
            <ImageIcon size={20} className="text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-700 text-white">Minhas Artes</p>
            <p className="text-xs text-dark-400 mt-0.5">Histórico</p>
          </div>
          <ArrowRight size={16} className="text-dark-600 group-hover:text-purple-400 transition-colors" />
        </Link>
      </div>

      {/* Recent generations */}
      {recentGenerations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-700 text-white flex items-center gap-2">
              <Zap size={14} className="text-brand-400" />
              Últimas Gerações
            </h2>
            <Link href="/dashboard/historico" className="text-xs text-dark-400 hover:text-brand-400 transition-colors">
              Ver todas →
            </Link>
          </div>

          <div className="space-y-3">
            {recentGenerations.map((gen) => (
              <Link
                key={gen.id}
                href="/dashboard/historico"
                className="flex items-center gap-4 p-3 bg-dark-900/40 border border-dark-800/30 rounded-2xl hover:border-dark-700/50 transition-all group"
              >
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center p-2 flex-shrink-0 overflow-hidden">
                  {gen.image_url ? (
                    <img src={gen.image_url} alt="" className="max-w-full max-h-full object-contain" loading="lazy" />
                  ) : (
                    <ImageIcon size={20} className="text-dark-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-700 text-white truncate">
                    {gen.products?.name || 'Produto'}
                  </p>
                  {gen.caption && (
                    <p className="text-[11px] text-dark-400 mt-0.5 line-clamp-1">{gen.caption}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-800 uppercase tracking-wider ${
                    gen.format === 'story' ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'
                  }`}>
                    {gen.format}
                  </span>
                  <span className="text-[10px] text-dark-500">
                    {new Date(gen.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {recentGenerations.length === 0 && (
        <div className="text-center py-12 bg-dark-900/40 border border-dark-800/30 rounded-3xl">
          <ImageIcon size={48} className="mx-auto text-dark-600 mb-4" />
          <h2 className="text-lg font-600 text-dark-300 mb-2">Nenhuma arte gerada</h2>
          <p className="text-dark-500 text-sm mb-6">Acesse o catálogo e gere sua primeira arte!</p>
          <Link
            href="/dashboard/setores"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-600 hover:bg-brand-700 transition-all"
          >
            <Sparkles size={16} /> Ir para Setores
          </Link>
        </div>
      )}
    </div>
  );
}
