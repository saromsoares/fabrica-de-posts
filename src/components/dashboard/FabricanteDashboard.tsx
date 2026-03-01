'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import {
  Factory, Package, Users, Clock, TrendingUp,
  Check, X, AlertCircle, ArrowRight,
  Image as ImageIcon, Sparkles, RefreshCw, BarChart3,
} from 'lucide-react';
import LogoAvatar from '@/components/ui/LogoAvatar';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api-errors';

const log = createLogger('FabricanteDashboard');

/* ═══════════════════════════════════════
   TYPES — contrato idêntico ao fabricante-stats v3
   ═══════════════════════════════════════ */

interface FactoryInfo {
  id: string;
  name: string;
  logo_url: string | null;
  active: boolean;
}

interface FabricanteStats {
  total_products: number;
  active_products: number;
  total_followers: number;
  pending_requests: number;
  total_generations: number;
}

interface RecentFollower {
  id: string;
  status: string;
  requested_at: string;
  lojista_id: string;
  profile: { full_name: string | null; avatar_url: string | null } | null;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  image_url: string | null;
  generation_count: number;
}

interface FabricanteDashboardData {
  has_factory: boolean;
  factory?: FactoryInfo;
  stats?: FabricanteStats;
  recent_followers?: RecentFollower[];
  top_products?: TopProduct[];
  message?: string;
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
          <div className="h-7 w-52 bg-dark-800/60 rounded-xl" />
          <div className="h-4 w-40 bg-dark-800/40 rounded-lg" />
        </div>
        <div className="h-7 w-24 bg-dark-800/40 rounded-full" />
      </div>

      {/* Factory info skeleton */}
      <div className="flex items-center gap-4 p-4 bg-dark-900/60 border border-dark-800/40 rounded-2xl">
        <div className="w-12 h-12 rounded-xl bg-dark-800/60" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-32 bg-dark-800/60 rounded" />
          <div className="h-3 w-24 bg-dark-800/40 rounded" />
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-dark-900/40 border border-dark-800/30 rounded-2xl p-4 space-y-2">
            <div className="h-4 w-16 bg-dark-800/60 rounded" />
            <div className="h-8 w-12 bg-dark-800/60 rounded" />
          </div>
        ))}
      </div>

      {/* Two column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="h-5 w-32 bg-dark-800/60 rounded" />
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 bg-dark-900/40 border border-dark-800/30 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-5 w-28 bg-dark-800/60 rounded" />
          {[0, 1, 2].map(i => (
            <div key={i} className="h-14 bg-dark-900/40 border border-dark-800/30 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════ */

export default function FabricanteDashboard({ userName }: { userName: string }) {
  const supabase = createClient();
  const [dashboard, setDashboard] = useState<FabricanteDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  // ─── Fetch: 1 única chamada à Edge Function fabricante-stats ───
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

      const result = await supabase.functions.invoke('fabricante-stats');
      const apiErr = handleApiError('fabricante-stats', result);
      if (apiErr.code !== 'OK') {
        log.error('fetchData failed', { code: apiErr.code, rid: apiErr.requestId });
        setError(apiErr.message || 'Erro ao carregar dados. Tente novamente.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const data = result.data;
      if (!data) throw new Error('Resposta vazia da Edge Function');

      log.info('Dashboard data loaded');
      setDashboard(data as FabricanteDashboardData);
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
      if (cancelled) return;
      if (!session) {
        // Sessão expirada — exibir erro amigável e parar o loading
        setError('Sessão expirada. Faça login novamente.');
        setLoading(false);
        return;
      }
      await fetchData();
    }

    run();
    return () => { cancelled = true; };
  }, [fetchData, supabase]);

  // ─── Page Visibility: recarregar quando usuário volta à aba (se > 5min) ───
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const stale = Date.now() - lastFetchRef.current > 5 * 60 * 1000;
        if (stale) fetchData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData]);

  // ─── Approve / Reject follower (query direta — ação pontual, não dashboard data) ───
  const handleFollowerAction = async (followerId: string, action: 'approve' | 'reject') => {
    setActionLoading(followerId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Sessão expirada.'); setActionLoading(null); return; }

      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const { error: updateError } = await supabase
        .from('factory_followers')
        .update({ status: newStatus, responded_at: new Date().toISOString() })
        .eq('id', followerId);

      if (updateError) {
        setError(updateError.message);
      } else {
        // Recarregar silenciosamente após ação
        await fetchData(true);
      }
    } catch {
      setError('Erro ao processar solicitação.');
    }
    setActionLoading(null);
  };

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

  // ─── Sem fábrica cadastrada ───
  if (!dashboard.has_factory) {
    return (
      <div className="animate-fade-in-up">
        <div className="text-center py-16 bg-dark-900/40 border border-dark-800/30 rounded-3xl">
          <Factory size={48} className="mx-auto text-dark-600 mb-4" />
          <h2 className="text-lg font-700 text-dark-300 mb-2">Nenhuma fábrica cadastrada</h2>
          <p className="text-dark-500 text-sm mb-6">
            {dashboard.message ?? 'Crie sua fábrica para começar a disponibilizar produtos para os lojistas.'}
          </p>
          <Link
            href="/onboarding?role=fabricante"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl text-sm font-700 hover:bg-brand-700 transition-all"
          >
            <Factory size={16} /> Criar Fábrica
          </Link>
        </div>
      </div>
    );
  }

  const { factory, stats, recent_followers, top_products } = dashboard;
  if (!factory || !stats) return null;

  const statCards = [
    { label: 'Produtos', value: stats.total_products, icon: Package, color: 'text-blue-400', bg: 'bg-blue-600/10' },
    { label: 'Seguidores', value: stats.total_followers, icon: Users, color: 'text-green-400', bg: 'bg-green-600/10' },
    {
      label: 'Pendentes', value: stats.pending_requests, icon: Clock,
      color: stats.pending_requests > 0 ? 'text-amber-400' : 'text-dark-500',
      bg: stats.pending_requests > 0 ? 'bg-amber-600/10' : 'bg-dark-800/30',
    },
    { label: 'Posts Gerados', value: stats.total_generations, icon: TrendingUp, color: 'text-brand-400', bg: 'bg-brand-600/10' },
  ];

  return (
    <div className="animate-fade-in-up space-y-8">

      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-800 tracking-tight flex items-center gap-2">
            <Factory className="text-blue-400" size={24} />
            {userName ? `Olá, ${userName}!` : 'Painel do Fabricante'}
          </h1>
          <p className="text-dark-400 text-sm mt-1">Gestão de catálogo e performance de revenda</p>
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
            <Factory size={14} className="text-blue-400" />
            <span className="text-[10px] font-700 uppercase tracking-wider text-blue-400">Fabricante</span>
          </div>
        </div>
      </div>

      {/* Factory info */}
      <div className="flex items-center gap-4 p-4 bg-dark-900/60 border border-dark-800/40 rounded-2xl">
        <LogoAvatar src={factory.logo_url} alt={factory.name} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-700 text-white truncate">{factory.name}</p>
          <p className="text-xs text-dark-400 mt-0.5">
            {factory.active ? 'Ativa' : 'Inativa'} &middot; {stats.total_products} produto{stats.total_products !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard/fabricante/perfil"
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex-shrink-0"
        >
          Editar →
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border border-dark-800/30 rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <span className="text-xs text-dark-400 font-500">{label}</span>
            </div>
            <p className={`text-2xl font-800 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/dashboard/fabricante/produtos"
          className="flex items-center gap-4 p-4 bg-dark-900/60 border border-dark-800/40 rounded-2xl hover:border-blue-500/30 transition-all group"
        >
          <div className="p-3 rounded-xl bg-blue-600/15">
            <Package size={20} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-700 text-white">Produtos</p>
            <p className="text-xs text-dark-400 mt-0.5">Gerenciar catálogo</p>
          </div>
          <ArrowRight size={16} className="text-dark-600 group-hover:text-blue-400 transition-colors" />
        </Link>

        <Link
          href="/dashboard/fabricante/templates"
          className="flex items-center gap-4 p-4 bg-dark-900/60 border border-dark-800/40 rounded-2xl hover:border-brand-500/30 transition-all group"
        >
          <div className="p-3 rounded-xl bg-brand-600/15">
            <Sparkles size={20} className="text-brand-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-700 text-white">Templates</p>
            <p className="text-xs text-dark-400 mt-0.5">Modelos de post</p>
          </div>
          <ArrowRight size={16} className="text-dark-600 group-hover:text-brand-400 transition-colors" />
        </Link>

        <Link
          href="/dashboard/fabricante/categorias"
          className="flex items-center gap-4 p-4 bg-dark-900/60 border border-dark-800/40 rounded-2xl hover:border-green-500/30 transition-all group"
        >
          <div className="p-3 rounded-xl bg-green-600/15">
            <BarChart3 size={20} className="text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-700 text-white">Categorias</p>
            <p className="text-xs text-dark-400 mt-0.5">Organizar produtos</p>
          </div>
          <ArrowRight size={16} className="text-dark-600 group-hover:text-green-400 transition-colors" />
        </Link>
      </div>

      {/* Two-column: Followers + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent followers */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-700 text-white flex items-center gap-2">
              <Users size={16} className="text-green-400" />
              Solicitações Recentes
              {stats.pending_requests > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-800 rounded-full">
                  {stats.pending_requests}
                </span>
              )}
            </h2>
          </div>

          {(!recent_followers || recent_followers.length === 0) ? (
            <div className="text-center py-8 bg-dark-900/40 border border-dark-800/30 rounded-xl">
              <Users size={24} className="mx-auto text-dark-600 mb-2" />
              <p className="text-dark-500 text-xs">Nenhuma solicitação ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent_followers.map((follower) => (
                <div
                  key={follower.id}
                  className="flex items-center gap-3 p-3 bg-dark-900/40 border border-dark-800/30 rounded-xl"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-dark-700/60 flex items-center justify-center flex-shrink-0">
                    {follower.profile?.avatar_url ? (
                      <img src={follower.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-xs font-700 text-dark-400">
                        {(follower.profile?.full_name ?? 'L')[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-600 text-white truncate">
                      {follower.profile?.full_name ?? 'Lojista'}
                    </p>
                    <span className={`text-[10px] font-600 ${
                      follower.status === 'approved' ? 'text-green-400' :
                      follower.status === 'pending' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {follower.status === 'approved' ? 'Aprovado' :
                       follower.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                    </span>
                  </div>

                  {/* Action buttons (only for pending) */}
                  {follower.status === 'pending' && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleFollowerAction(follower.id, 'approve')}
                        disabled={actionLoading === follower.id}
                        className="p-1.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-all disabled:opacity-50"
                        title="Aprovar"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => handleFollowerAction(follower.id, 'reject')}
                        disabled={actionLoading === follower.id}
                        className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all disabled:opacity-50"
                        title="Rejeitar"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-700 text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-400" />
              Top Produtos
            </h2>
            <Link href="/dashboard/fabricante/produtos" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Ver todos →
            </Link>
          </div>

          {(!top_products || top_products.length === 0) ? (
            <div className="text-center py-8 bg-dark-900/40 border border-dark-800/30 rounded-xl">
              <Package size={24} className="mx-auto text-dark-600 mb-2" />
              <p className="text-dark-500 text-xs">Nenhum produto com posts ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {top_products.map((product, idx) => (
                <div
                  key={product.product_id}
                  className="flex items-center gap-3 p-3 bg-dark-900/40 border border-dark-800/30 rounded-xl"
                >
                  {/* Rank */}
                  <span className={`text-[10px] font-800 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                    idx === 1 ? 'bg-dark-700/60 text-dark-300' :
                    idx === 2 ? 'bg-orange-900/30 text-orange-400' :
                    'text-dark-600'
                  }`}>
                    {idx + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-xl bg-dark-800/60 border border-dark-700/40 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={14} className="text-dark-500" />
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-600 text-white truncate">{product.product_name}</p>
                  </div>

                  {/* Count */}
                  <span className="text-xs font-800 text-brand-400 flex-shrink-0">
                    {product.generation_count} post{product.generation_count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
