'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api-errors';
import {
  Store, Image as ImageIcon, Factory, Clock, Sparkles,
  ArrowRight, AlertCircle, Zap, Package,
  TrendingUp, Crown, RefreshCw,
} from 'lucide-react';

const log = createLogger('LojistaDashboard');

/* ═══════════════════════════════════════
   TYPES — contrato idêntico ao lojista-stats v4
   ═══════════════════════════════════════ */

interface LojistaProfile {
  role: string;
  plan: string;
  full_name: string | null;
  store_type: string | null;
  location_city: string | null;
  location_state: string | null;
  store_voice: string | null;
  onboarding_complete: boolean;
}

interface LojistaPlanLimits {
  monthly_generations: number;
  max_products: number;
  max_factories_followed: number;
  description: string | null;
  price_brl: number;
}

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
  product: { name: string; image_url: string | null } | null;
}

interface LojistaDashboardData {
  profile: LojistaProfile;
  plan_limits: LojistaPlanLimits;
  stats: LojistaStats;
  recent_generations: RecentGeneration[];
}

/* ═══════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════ */

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Greeting skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-dark-800/60 rounded-xl" />
          <div className="h-4 w-32 bg-dark-800/40 rounded-lg" />
        </div>
        <div className="h-7 w-20 bg-dark-800/40 rounded-full" />
      </div>

      {/* Usage bar skeleton */}
      <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-5 space-y-3">
        <div className="flex justify-between">
          <div className="h-4 w-24 bg-dark-800/60 rounded" />
          <div className="h-6 w-16 bg-dark-800/40 rounded-full" />
        </div>
        <div className="h-8 w-32 bg-dark-800/60 rounded" />
        <div className="h-2.5 w-full bg-dark-800/60 rounded-full" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-dark-900/40 border border-dark-800/30 rounded-2xl p-4 space-y-2">
            <div className="h-4 w-16 bg-dark-800/60 rounded" />
            <div className="h-8 w-12 bg-dark-800/60 rounded" />
          </div>
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-16 bg-dark-900/40 border border-dark-800/30 rounded-2xl" />
        ))}
      </div>

      {/* Recent generations skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-32 bg-dark-800/60 rounded" />
        {[0, 1, 2].map(i => (
          <div key={i} className="h-16 bg-dark-900/40 border border-dark-800/30 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════ */

export default function LojistaDashboard({ userName }: { userName: string }) {
  const supabase = createClient();
  const [dashboard, setDashboard] = useState<LojistaDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const lastFetchRef = useRef<number>(0);

  // ─── Fetch: 1 única chamada à Edge Function lojista-stats ───
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      // SESSION GUARD
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Sessão expirada. Faça login novamente.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const result = await supabase.functions.invoke('lojista-stats');
      const apiErr = handleApiError('lojista-stats', result);
      if (apiErr.code !== 'OK') {
        log.error('fetchData failed', { code: apiErr.code, rid: apiErr.requestId });
        setError(apiErr.message || 'Erro ao carregar dados. Tente novamente.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const data = result.data;
      if (!data) throw new Error('Resposta vazia da Edge Function');

      log.info('Dashboard data loaded', { plan: (data as LojistaDashboardData).profile?.plan });
      setDashboard(data as LojistaDashboardData);
      lastFetchRef.current = Date.now();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('fetchData exception', { error: message });
      setError('Erro ao carregar dados. Tente novamente.');
    }

    setLoading(false);
    setRefreshing(false);
  }, [supabase]);

  // ─── Mount: buscar dados 1 vez ───
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      await fetchData();
    }

    run();
    return () => { cancelled = true; };
  }, [fetchData, supabase]);

  // ─── Page Visibility: recarregar quando usuário volta à aba (se > 5min) ───
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const stale = Date.now() - lastFetchRef.current > 5 * 60 * 1000; // 5 minutos
        if (stale) fetchData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData]);

  // ─── Loading state ───
  if (loading) return <DashboardSkeleton />;

  // ─── Error state ───
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-dark-400 text-sm">{error}</p>
        <button
          onClick={() => fetchData()}
          className="px-4 py-2 bg-dark-800 text-white rounded-xl text-sm font-600 hover:bg-dark-700 transition-all"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!dashboard) return null;

  const { profile, stats, recent_generations } = dashboard;
  const plan = profile.plan || 'free';
  const planLabel = plan === 'pro' ? 'Pro' : plan === 'loja' ? 'Loja' : 'Free';
  const planColor = plan === 'pro' ? 'text-purple-400' : plan === 'loja' ? 'text-blue-400' : 'text-dark-400';
  const planBg = plan === 'pro'
    ? 'bg-purple-600/10 border-purple-500/20'
    : plan === 'loja'
    ? 'bg-blue-600/10 border-blue-500/20'
    : 'bg-dark-800/30 border-dark-700/30';
  const usageColor = stats.usage_percentage >= 90
    ? 'bg-red-500'
    : stats.usage_percentage >= 70
    ? 'bg-amber-500'
    : 'bg-brand-500';

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-dark-900/60 border border-dark-800/40 text-dark-400 hover:text-white hover:border-dark-700 transition-all disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-900/80 border border-dark-800/50 rounded-full">
            <Store size={14} className="text-brand-400" />
            <span className="text-[10px] font-700 uppercase tracking-wider text-brand-400">Lojista</span>
          </div>
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
            {stats.usage_count}{' '}
            <span className="text-sm font-600 text-dark-400">
              / {stats.usage_limit === 999999 ? '∞' : stats.usage_limit}
            </span>
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
          className="flex items-center gap-4 p-4 bg-dark-900/60 border border-dark-800/40 rounded-2xl hover:border-green-500/30 transition-all group"
        >
          <div className="p-3 rounded-xl bg-green-600/15">
            <ImageIcon size={20} className="text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-700 text-white">Histórico</p>
            <p className="text-xs text-dark-400 mt-0.5">Posts criados</p>
          </div>
          <ArrowRight size={16} className="text-dark-600 group-hover:text-green-400 transition-colors" />
        </Link>
      </div>

      {/* Recent generations */}
      {recent_generations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-700 text-white flex items-center gap-2">
              <ImageIcon size={16} className="text-brand-400" />
              Posts Recentes
            </h2>
            <Link href="/dashboard/historico" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Ver todos →
            </Link>
          </div>

          <div className="space-y-3">
            {recent_generations.map((gen) => (
              <div
                key={gen.id}
                className="flex items-center gap-4 p-3 bg-dark-900/40 border border-dark-800/30 rounded-xl hover:border-dark-700/50 transition-all"
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {gen.image_url ? (
                    <img src={gen.image_url} alt={gen.product?.name ?? 'Post'} className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon size={20} className="text-gray-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-600 text-white truncate">
                    {gen.product?.name ?? 'Produto removido'}
                  </p>
                  {gen.caption && (
                    <p className="text-xs text-dark-400 truncate mt-0.5">{gen.caption}</p>
                  )}
                </div>

                {/* Format badge */}
                <span className="text-[10px] font-700 uppercase tracking-wider text-dark-500 bg-dark-800/60 px-2 py-1 rounded-lg flex-shrink-0">
                  {gen.format}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {recent_generations.length === 0 && (
        <div className="text-center py-12 bg-dark-900/40 border border-dark-800/30 rounded-2xl">
          <Sparkles size={32} className="mx-auto text-dark-600 mb-3" />
          <p className="text-dark-400 text-sm font-500">Nenhum post gerado ainda</p>
          <p className="text-dark-600 text-xs mt-1">Explore o catálogo e crie seu primeiro post</p>
          <Link
            href="/dashboard/setores"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-700 hover:bg-brand-700 transition-all"
          >
            <Sparkles size={14} /> Começar agora
          </Link>
        </div>
      )}
    </div>
  );
}
