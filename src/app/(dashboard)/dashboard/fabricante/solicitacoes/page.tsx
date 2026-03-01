'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Check, X, Clock, Users, Building2, RefreshCw } from 'lucide-react';
import { createLogger } from '@/lib/logger';

const log = createLogger('Solicitacoes');

type FollowerRequest = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    city: string | null;
    state: string | null;
  } | null;
};

type TabFilter = 'pending' | 'approved' | 'rejected' | 'all';

export default function SolicitacoesPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<FollowerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>('pending');
  const [factoryId, setFactoryId] = useState<string | null>(null);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });

  const fetchRequests = useCallback(async (fId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('factory_followers')
      .select(`
        id, status, created_at,
        profiles:user_id (full_name, email, avatar_url, city, state)
      `)
      .eq('factory_id', fId)
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Failed to fetch requests', { error: error.message });
    } else if (data) {
      setRequests(data as unknown as FollowerRequest[]);
      setCounts({
        pending: data.filter(r => r.status === 'pending').length,
        approved: data.filter(r => r.status === 'approved').length,
        rejected: data.filter(r => r.status === 'rejected').length,
      });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      const { data: factory } = await supabase
        .from('factories')
        .select('id')
        .eq('owner_id', session.user.id)
        .single();

      if (!factory || cancelled) return;
      setFactoryId(factory.id);
      await fetchRequests(factory.id);
    })();
    return () => { cancelled = true; };
  }, [supabase, fetchRequests]);

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    setActionLoading(requestId);
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const { error } = await supabase
        .from('factory_followers')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
      setCounts(prev => ({
        ...prev,
        pending: prev.pending - 1,
        [action === 'approve' ? 'approved' : 'rejected']: (action === 'approve' ? prev.approved : prev.rejected) + 1,
      }));
    } catch (err) {
      log.error('Action failed', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = requests.filter(r => tab === 'all' ? true : r.status === tab);

  const TABS: { key: TabFilter; label: string; count?: number; color: string }[] = [
    { key: 'pending', label: 'Pendentes', count: counts.pending, color: counts.pending > 0 ? 'text-amber-400' : 'text-dark-500' },
    { key: 'approved', label: 'Aprovados', count: counts.approved, color: 'text-green-400' },
    { key: 'rejected', label: 'Rejeitados', count: counts.rejected, color: 'text-red-400' },
    { key: 'all', label: 'Todos', color: 'text-dark-400' },
  ];

  return (
    <div className="animate-fade-in-up max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users size={28} className="text-brand-400" />
            <h1 className="font-display text-3xl font-800 tracking-tight">Solicitações de Acesso</h1>
          </div>
          <p className="text-dark-400 text-sm">Lojistas que solicitaram acesso ao seu catálogo.</p>
        </div>
        {factoryId && (
          <button
            onClick={() => fetchRequests(factoryId)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-dark-400 hover:text-white transition-colors border border-dark-700/50 hover:border-dark-600"
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-dark-900/60 border border-amber-600/20 rounded-2xl p-5 text-center">
          <div className="text-3xl font-800 text-amber-400">{counts.pending}</div>
          <div className="text-xs text-dark-400 mt-1 flex items-center justify-center gap-1.5"><Clock size={11} /> Aguardando</div>
        </div>
        <div className="bg-dark-900/60 border border-green-600/20 rounded-2xl p-5 text-center">
          <div className="text-3xl font-800 text-green-400">{counts.approved}</div>
          <div className="text-xs text-dark-400 mt-1 flex items-center justify-center gap-1.5"><Check size={11} /> Aprovados</div>
        </div>
        <div className="bg-dark-900/60 border border-dark-700/40 rounded-2xl p-5 text-center">
          <div className="text-3xl font-800 text-dark-400">{counts.rejected}</div>
          <div className="text-xs text-dark-400 mt-1 flex items-center justify-center gap-1.5"><X size={11} /> Rejeitados</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-dark-800/40 pb-3">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-500 transition-all ${tab === t.key ? 'bg-dark-800/60 text-white' : 'text-dark-500 hover:text-dark-300'}`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-xs font-700 px-1.5 py-0.5 rounded-full ${t.key === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-dark-800 text-dark-400'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Building2 size={40} className="text-dark-700 mx-auto mb-4" />
          <p className="text-dark-500 text-sm">
            {tab === 'pending' ? 'Nenhuma solicitação pendente.' : 'Nenhum resultado para este filtro.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const profile = req.profiles;
            const name = profile?.full_name || profile?.email || 'Lojista';
            const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
            const location = [profile?.city, profile?.state].filter(Boolean).join(', ');
            const date = new Date(req.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
            const isPending = req.status === 'pending';
            const isApproved = req.status === 'approved';

            return (
              <div
                key={req.id}
                className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-5 flex items-center gap-4 transition-all hover:border-dark-700/60"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center font-700 text-sm text-white" style={{ background: 'linear-gradient(135deg, #ff6b35, #a855f7)' }}>
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt={name} className="w-11 h-11 rounded-xl object-cover" />
                  ) : initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-600 text-sm text-white truncate">{name}</div>
                  {profile?.email && <div className="text-xs text-dark-500 truncate">{profile.email}</div>}
                  <div className="flex items-center gap-3 mt-1">
                    {location && <span className="text-xs text-dark-600">{location}</span>}
                    <span className="text-xs text-dark-700">{date}</span>
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex-shrink-0">
                  {isPending ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-600 bg-amber-500/15 text-amber-400 border border-amber-500/20">
                      Pendente
                    </span>
                  ) : isApproved ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-600 bg-green-500/15 text-green-400 border border-green-500/20">
                      Aprovado
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-600 bg-red-500/10 text-red-400 border border-red-500/20">
                      Rejeitado
                    </span>
                  )}
                </div>

                {/* Actions */}
                {isPending && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAction(req.id, 'approve')}
                      disabled={actionLoading === req.id}
                      className="w-9 h-9 rounded-xl flex items-center justify-center bg-green-600/15 hover:bg-green-600/30 text-green-400 transition-all disabled:opacity-40"
                      title="Aprovar"
                    >
                      {actionLoading === req.id ? (
                        <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'reject')}
                      disabled={actionLoading === req.id}
                      className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-600/10 hover:bg-red-600/20 text-red-400 transition-all disabled:opacity-40"
                      title="Rejeitar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
