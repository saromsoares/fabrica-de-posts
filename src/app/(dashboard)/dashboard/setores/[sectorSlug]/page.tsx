'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { invokeWithAuth } from '@/hooks/useAuthenticatedFunction';
import Link from 'next/link';
import { Loader2, ArrowLeft, Factory as FactoryIcon, CheckCircle, Clock, UserPlus, UserMinus, Search } from 'lucide-react';
import type { Sector, Factory, FactoryFollower } from '@/types/database';

type FactoryWithStatus = Factory & {
  follow_status: FactoryFollower['status'] | null;
};

export default function SectorFactoriesPage() {
  const params = useParams();
  const sectorSlug = params.sectorSlug as string;
  const supabase = createClient();

  const [sector, setSector] = useState<Sector | null>(null);
  const [factories, setFactories] = useState<FactoryWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Buscar setor
    const { data: sectorData } = await supabase
      .from('sectors')
      .select('id, name, slug, icon_svg')
      .eq('slug', sectorSlug)
      .single();

    if (!sectorData) { setLoading(false); return; }
    setSector(sectorData);

    // Buscar fábricas do setor
    const { data: factoriesData } = await supabase
      .from('factories')
      .select('id, name, logo_url, description, active, sector_id')
      .eq('sector_id', sectorData.id)
      .eq('active', true)
      .order('name');

    // Buscar status de follow do lojista
    const { data: follows } = await supabase
      .from('factory_followers')
      .select('factory_id, status')
      .eq('lojista_id', user.id);

    const followMap = new Map<string, FactoryFollower['status']>();
    follows?.forEach(f => followMap.set(f.factory_id, f.status as FactoryFollower['status']));

    const enriched: FactoryWithStatus[] = (factoriesData || []).map(f => ({
      ...f,
      follow_status: followMap.get(f.id) || null,
    }));

    setFactories(enriched);
    setLoading(false);
  }, [supabase, sectorSlug]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleFollow = async (factoryId: string) => {
    setActionLoading(factoryId);
    try {
      await invokeWithAuth('manage-followers', {
        action: 'follow', factory_id: factoryId,
      });
      await loadData();
    } catch (err) {
      console.error('Erro ao seguir:', err);
    }
    setActionLoading(null);
  };

  const handleUnfollow = async (factoryId: string) => {
    setActionLoading(factoryId);
    try {
      await invokeWithAuth('manage-followers', {
        action: 'unfollow', factory_id: factoryId,
      });
      await loadData();
    } catch (err) {
      console.error('Erro ao deixar de seguir:', err);
    }
    setActionLoading(null);
  };

  const filtered = factories.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-400" size={32} />
      </div>
    );
  }

  if (!sector) {
    return (
      <div className="text-center py-16">
        <p className="text-dark-400">Setor não encontrado.</p>
        <Link href="/dashboard/setores" className="text-brand-400 hover:underline mt-2 inline-block">
          Voltar aos setores
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard/setores" className="inline-flex items-center gap-2 text-dark-400 hover:text-white text-sm mb-4 transition-colors">
          <ArrowLeft size={16} /> Voltar aos setores
        </Link>
        <div className="flex items-center gap-4">
          {sector.icon_svg && (
            <div className="w-12 h-12 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-brand-400">
              <div className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: sector.icon_svg }} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-display font-800 tracking-tight">{sector.name}</h1>
            <p className="text-dark-400 mt-0.5">{filtered.length} fábrica{filtered.length !== 1 ? 's' : ''} neste setor</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" />
        <input
          type="text"
          placeholder="Buscar fábrica..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-dark-900 border border-dark-800 rounded-xl text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
        />
      </div>

      {/* Grid de fábricas */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FactoryIcon size={48} className="mx-auto text-dark-700 mb-4" />
          <p className="text-dark-400">Nenhuma fábrica encontrada neste setor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((factory) => {
            const isApproved = factory.follow_status === 'approved';
            const isPending = factory.follow_status === 'pending';
            const isLoading = actionLoading === factory.id;

            return (
              <div
                key={factory.id}
                className={`bg-dark-900 border rounded-2xl p-6 transition-all ${
                  isApproved ? 'border-green-500/30 hover:border-green-500/50' : 'border-dark-800 hover:border-dark-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  <div className="w-14 h-14 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden p-1.5 flex-shrink-0">
                    {factory.logo_url ? (
                      <img src={factory.logo_url} alt={factory.name} className="max-w-[80%] max-h-[80%] object-contain" />
                    ) : (
                      <FactoryIcon size={24} className="text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-700 text-white truncate">{factory.name}</h3>
                    {factory.description && (
                      <p className="text-dark-400 text-sm mt-1 line-clamp-2">{factory.description}</p>
                    )}

                    {/* Badge de status */}
                    <div className="mt-3">
                      {isApproved ? (
                        <div className="flex items-center gap-4">
                          <span className="inline-flex items-center gap-1.5 text-xs font-700 text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full">
                            <CheckCircle size={12} /> Aprovado
                          </span>
                          <Link
                            href={`/dashboard/fabricas/${factory.id}`}
                            className="text-xs font-700 text-brand-400 hover:text-brand-300 transition-colors"
                          >
                            Ver produtos →
                          </Link>
                        </div>
                      ) : isPending ? (
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-700 text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-full">
                            <Clock size={12} /> Pendente
                          </span>
                          <button
                            onClick={() => handleUnfollow(factory.id)}
                            disabled={isLoading}
                            className="text-xs text-dark-400 hover:text-red-400 transition-colors"
                          >
                            {isLoading ? <Loader2 size={12} className="animate-spin" /> : 'Cancelar'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleFollow(factory.id)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 text-xs font-700 text-brand-400 bg-brand-500/10 px-3 py-1.5 rounded-full hover:bg-brand-500/20 transition-colors"
                        >
                          {isLoading ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <>
                              <UserPlus size={12} /> Solicitar Acesso
                            </>
                          )}
                        </button>
                      )}
                    </div>
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
