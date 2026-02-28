'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { invokeWithAuth } from '@/hooks/useAuthenticatedFunction';
import Link from 'next/link';
import {
  Factory, Package, Users, Clock, TrendingUp,
  Check, X, Loader2, AlertCircle, ArrowRight,
  Image as ImageIcon, Sparkles, UserPlus, BarChart3,
} from 'lucide-react';

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */

interface FabricanteData {
  has_factory: boolean;
  factory: {
    id: string;
    name: string;
    logo_url: string | null;
    active: boolean;
  } | null;
  stats: {
    total_products: number;
    active_products: number;
    total_followers: number;
    pending_requests: number;
    total_generations: number;
  };
  recent_followers: Array<{
    id: string;
    status: string;
    requested_at: string;
    profiles: { full_name: string | null; avatar_url: string | null };
  }>;
  top_products: Array<{
    product_id: string;
    product_name: string;
    image_url: string | null;
    generation_count: number;
  }>;
}

/* ═══════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════ */

export default function FabricanteDashboard({ userName }: { userName: string }) {
  const supabase = createClient();
  const [data, setData] = useState<FabricanteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: result, error: fnError } = await invokeWithAuth<FabricanteData>('fabricante-stats');
    if (fnError) {
      setError(fnError);
    } else {
      setData(result);
    }
    setLoading(false);
  }, []);

  // Guard de sessão + cleanup para evitar chamadas duplicadas
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      await fetchData();
    };

    run();
    return () => { cancelled = true; };
  }, [fetchData, supabase]);

  const handleFollowerAction = async (followerId: string, action: 'approve' | 'reject') => {
    setActionLoading(followerId);
    const { error: fnError } = await invokeWithAuth('manage-followers', {
      action,
      follower_id: followerId,
    });
    if (fnError) {
      setError(fnError);
    } else {
      await fetchData();
    }
    setActionLoading(null);
  };

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

  // No factory created yet
  if (!data?.has_factory) {
    return (
      <div className="animate-fade-in-up">
        <div className="text-center py-16 bg-dark-900/40 border border-dark-800/30 rounded-3xl">
          <Factory size={48} className="mx-auto text-dark-600 mb-4" />
          <h2 className="text-lg font-700 text-dark-300 mb-2">Nenhuma fábrica cadastrada</h2>
          <p className="text-dark-500 text-sm mb-6">
            Crie sua fábrica para começar a disponibilizar produtos para os lojistas.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl text-sm font-700 hover:bg-brand-700 transition-all"
          >
            <Factory size={16} /> Criar Fábrica
          </Link>
        </div>
      </div>
    );
  }

  const stats = data.stats;

  const statCards = [
    {
      label: 'Produtos',
      value: stats.total_products,
      icon: Package,
      color: 'text-blue-400',
      bg: 'bg-blue-600/10',
    },
    {
      label: 'Seguidores',
      value: stats.total_followers,
      icon: Users,
      color: 'text-green-400',
      bg: 'bg-green-600/10',
    },
    {
      label: 'Pendentes',
      value: stats.pending_requests,
      icon: Clock,
      color: stats.pending_requests > 0 ? 'text-amber-400' : 'text-dark-500',
      bg: stats.pending_requests > 0 ? 'bg-amber-600/10' : 'bg-dark-800/30',
    },
    {
      label: 'Posts Gerados',
      value: stats.total_generations,
      icon: TrendingUp,
      color: 'text-brand-400',
      bg: 'bg-brand-600/10',
    },
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
          <p className="text-dark-400 text-sm mt-1">
            Gestão de catálogo e performance de revenda
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-900/80 border border-dark-800/50 rounded-full self-start sm:self-auto">
          <Factory size={14} className="text-blue-400" />
          <span className="text-[10px] font-700 uppercase tracking-wider text-blue-400">Fabricante</span>
        </div>
      </div>

      {/* Factory info */}
      {data.factory && (
        <div className="flex items-center gap-4 p-4 bg-dark-900/60 border border-dark-800/40 rounded-2xl">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2 flex-shrink-0">
            {data.factory.logo_url ? (
              <img src={data.factory.logo_url} alt={data.factory.name} className="max-w-full max-h-full object-contain" />
            ) : (
              <Factory size={20} className="text-slate-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-700 text-white truncate">{data.factory.name}</p>
            <p className="text-xs text-dark-400 mt-0.5">
              {data.factory.active ? 'Ativa' : 'Inativa'} &middot; {stats.total_products} produto{stats.total_products !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`${card.bg} border border-dark-800/30 rounded-2xl p-4`}>
            <div className="flex items-center gap-3 mb-2">
              <card.icon size={18} className={card.color} />
              <span className="text-xs text-dark-400 font-500">{card.label}</span>
            </div>
            <p className={`text-2xl font-800 ${card.color}`}>
              {card.value.toLocaleString('pt-BR')}
            </p>
          </div>
        ))}
      </div>

      {/* Two columns: Pending requests + Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending follower requests */}
        <div className="bg-dark-900/60 border border-dark-800/40 rounded-3xl p-6">
          <h2 className="text-sm font-700 text-white flex items-center gap-2 mb-4">
            <UserPlus size={16} className="text-amber-400" />
            Solicitações Pendentes
            {stats.pending_requests > 0 && (
              <span className="ml-auto px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-800 rounded-full">
                {stats.pending_requests}
              </span>
            )}
          </h2>

          {data.recent_followers.filter((f) => f.status === 'pending').length === 0 ? (
            <div className="text-center py-8">
              <Users size={32} className="mx-auto text-dark-600 mb-3" />
              <p className="text-dark-500 text-xs">Nenhuma solicitação pendente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recent_followers
                .filter((f) => f.status === 'pending')
                .map((follower) => (
                  <div
                    key={follower.id}
                    className="flex items-center gap-3 p-3 bg-dark-950/50 border border-dark-800/30 rounded-xl"
                  >
                    <div className="w-9 h-9 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {follower.profiles?.avatar_url ? (
                        <img src={follower.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Users size={16} className="text-dark-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-700 text-white truncate">
                        {follower.profiles?.full_name || 'Lojista'}
                      </p>
                      <p className="text-[10px] text-dark-500">
                        {new Date(follower.requested_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleFollowerAction(follower.id, 'approve')}
                        disabled={actionLoading === follower.id}
                        className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-50"
                        title="Aprovar"
                      >
                        {actionLoading === follower.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => handleFollowerAction(follower.id, 'reject')}
                        disabled={actionLoading === follower.id}
                        className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                        title="Rejeitar"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Top 5 products */}
        <div className="bg-dark-900/60 border border-dark-800/40 rounded-3xl p-6">
          <h2 className="text-sm font-700 text-white flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-brand-400" />
            Top 5 Produtos Mais Usados
          </h2>

          {data.top_products.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon size={32} className="mx-auto text-dark-600 mb-3" />
              <p className="text-dark-500 text-xs">Nenhuma geração registrada ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.top_products.map((product, index) => (
                <div
                  key={product.product_id}
                  className="flex items-center gap-3 p-3 bg-dark-950/50 border border-dark-800/30 rounded-xl"
                >
                  {/* Rank */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-800 flex-shrink-0 ${
                    index === 0 ? 'bg-brand-600/20 text-brand-400' :
                    index === 1 ? 'bg-blue-600/20 text-blue-400' :
                    'bg-dark-800/50 text-dark-400'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Product image */}
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 flex-shrink-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.product_name} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <Package size={16} className="text-slate-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-700 text-white truncate">{product.product_name}</p>
                    <p className="text-[10px] text-dark-500">
                      {product.generation_count} post{product.generation_count !== 1 ? 's' : ''} gerado{product.generation_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/admin/produtos"
          className="flex items-center gap-4 p-4 bg-dark-900/60 border border-dark-800/40 rounded-2xl hover:border-blue-500/30 transition-all group"
        >
          <div className="p-3 rounded-xl bg-blue-600/15">
            <Package size={20} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-700 text-white">Gerenciar Produtos</p>
            <p className="text-xs text-dark-400 mt-0.5">Adicione ou edite seus produtos</p>
          </div>
          <ArrowRight size={16} className="text-dark-600 group-hover:text-blue-400 transition-colors" />
        </Link>

        <Link
          href="/dashboard/produtos"
          className="flex items-center gap-4 p-4 bg-dark-900/60 border border-dark-800/40 rounded-2xl hover:border-brand-500/30 transition-all group"
        >
          <div className="p-3 rounded-xl bg-brand-600/15">
            <Sparkles size={20} className="text-brand-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-700 text-white">Testar Geração</p>
            <p className="text-xs text-dark-400 mt-0.5">Veja como seus produtos ficam nos posts</p>
          </div>
          <ArrowRight size={16} className="text-dark-600 group-hover:text-brand-400 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
