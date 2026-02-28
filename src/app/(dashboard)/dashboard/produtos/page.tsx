'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { invokeWithAuth } from '@/hooks/useAuthenticatedFunction';
import {
  Factory, Search, CheckCircle2, Clock, ArrowRight,
  Loader2, UserMinus, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Factory as FactoryType } from '@/types/database';

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */

interface FactoryWithFollow extends FactoryType {
  follow_status: 'pending' | 'approved' | 'rejected' | null;
}

/* ═══════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════ */

export default function ProdutosPage() {
  const [factories, setFactories] = useState<FactoryWithFollow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchFactories = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Fetch all active factories
    const { data: factoriesData } = await supabase
      .from('factories')
      .select('id, name, logo_url, description, website, whatsapp, active, created_at, user_id')
      .eq('active', true)
      .order('name');

    // Fetch user's follow statuses
    const { data: followsData } = await supabase
      .from('factory_followers')
      .select('factory_id, status')
      .eq('lojista_id', user.id);

    const followMap = new Map<string, 'pending' | 'approved' | 'rejected'>();
    if (followsData) {
      followsData.forEach((f: { factory_id: string; status: string }) => {
        followMap.set(f.factory_id, f.status as 'pending' | 'approved' | 'rejected');
      });
    }

    const enriched: FactoryWithFollow[] = ((factoriesData || []) as FactoryType[]).map((f) => ({
      ...f,
      follow_status: followMap.get(f.id) || null,
    }));

    setFactories(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchFactories(); }, [fetchFactories]);

  const handleFollow = async (factoryId: string) => {
    setActionLoading(factoryId);
    setError(null);

    try {
      const { error: authErr } = await invokeWithAuth('manage-followers', {
        action: 'follow', factory_id: factoryId,
      });
      if (authErr) throw new Error(authErr);

      setFactories((prev) =>
        prev.map((f) =>
          f.id === factoryId ? { ...f, follow_status: 'pending' } : f
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar acesso.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfollow = async (factoryId: string) => {
    setActionLoading(factoryId);
    setError(null);

    try {
      const { error: authErr } = await invokeWithAuth('manage-followers', {
        action: 'unfollow', factory_id: factoryId,
      });
      if (authErr) throw new Error(authErr);

      setFactories((prev) =>
        prev.map((f) =>
          f.id === factoryId ? { ...f, follow_status: null } : f
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deixar de seguir.');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = factories.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-800 tracking-tight">Catálogo</h1>
        <p className="text-dark-400 mt-1">Escolha uma fábrica para ver os produtos disponíveis.</p>
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar fábrica..."
          className="w-full pl-10 pr-4 py-2.5 bg-dark-900/60 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Grid de fábricas */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-2xl bg-dark-900/60 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Factory size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400">
            {search ? 'Nenhuma fábrica encontrada.' : 'Nenhuma fábrica disponível ainda.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((factory) => {
            const isApproved = factory.follow_status === 'approved';
            const isPending = factory.follow_status === 'pending';
            const isOwner = factory.user_id === userId;
            const canAccess = isApproved || isOwner;

            return (
              <div
                key={factory.id}
                className="group bg-dark-900/60 border border-dark-800/40 rounded-2xl overflow-hidden hover:border-dark-700/50 transition-all duration-300 flex flex-col"
              >
                {/* Logo da fábrica - clickable only if approved */}
                {canAccess ? (
                  <Link href={`/dashboard/produtos/${factory.id}`}>
                    <div className="aspect-square bg-white flex items-center justify-center p-6 group-hover:bg-slate-50 transition-colors cursor-pointer relative">
                      {factory.logo_url ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={factory.logo_url}
                            alt={factory.name}
                            fill
                            className="object-contain group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />
                        </div>
                      ) : (
                        <Factory size={48} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
                      )}

                      {/* Status badge overlay */}
                      <div className="absolute top-2 right-2">
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-500/90 text-white text-[9px] font-800 uppercase tracking-wider rounded-lg shadow-sm">
                          <CheckCircle2 size={10} /> Aprovado
                        </span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="aspect-square bg-white flex items-center justify-center p-6 relative">
                    {factory.logo_url ? (
                      <div className="relative w-full h-full opacity-70">
                        <Image
                          src={factory.logo_url}
                          alt={factory.name}
                          fill
                          className="object-contain"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      </div>
                    ) : (
                      <Factory size={48} className="text-slate-300" />
                    )}

                    {/* Status badge overlay */}
                    <div className="absolute top-2 right-2">
                      {isPending ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/90 text-white text-[9px] font-800 uppercase tracking-wider rounded-lg shadow-sm">
                          <Clock size={10} /> Pendente
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 bg-dark-800/80 text-dark-300 text-[9px] font-800 uppercase tracking-wider rounded-lg shadow-sm border border-dark-700/30">
                          Sem acesso
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Info + Action */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-display font-700 text-sm text-center mb-3">
                    {factory.name}
                  </h3>

                  {/* Action button */}
                  <div className="mt-auto">
                    {canAccess ? (
                      <Link
                        href={`/dashboard/produtos/${factory.id}`}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-600/15 border border-brand-500/20 rounded-xl text-brand-400 text-xs font-700 hover:bg-brand-600/25 transition-all"
                      >
                        Ver produtos <ArrowRight size={12} />
                      </Link>
                    ) : isPending ? (
                      <button
                        onClick={() => handleUnfollow(factory.id)}
                        disabled={actionLoading === factory.id}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-700 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                      >
                        {actionLoading === factory.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <>
                            <UserMinus size={12} /> Cancelar Solicitação
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFollow(factory.id)}
                        disabled={actionLoading === factory.id}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-600/15 border border-brand-500/20 rounded-xl text-brand-400 text-xs font-700 hover:bg-brand-600/25 transition-all disabled:opacity-50"
                      >
                        {actionLoading === factory.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <>
                            <ArrowRight size={12} /> Solicitar Acesso
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
