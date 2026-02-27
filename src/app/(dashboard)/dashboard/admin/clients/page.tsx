'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Users, Check } from 'lucide-react';
import { PLAN_LABELS } from '@/lib/utils';

const PAGE_SIZE = 20;

type ClientRow = {
  id: string;
  full_name: string | null;
  role: string;
  plan: string;
  onboarding_complete: boolean;
  created_at: string;
};

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const supabase = createClient();

  const fetchClients = useCallback(async (targetPage: number) => {
    setLoading(true);
    const from = targetPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count } = await supabase
      .from('profiles')
      .select('id, full_name, role, plan, onboarding_complete, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (data) setClients(data as ClientRow[]);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchClients(page); }, [fetchClients, page]);

  const handleChangePlan = async (userId: string, plan: string) => {
    await supabase.from('profiles').update({ plan }).eq('id', userId);
    fetchClients(page);
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Mudar para ${newRole}?`)) return;
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    fetchClients(page);
  };

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <Users size={24} className="text-amber-400" />
        <h1 className="font-display text-2xl font-800">Clientes</h1>
        <span className="text-sm text-dark-400">({totalCount})</span>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-dark-900/60 animate-pulse" />)}</div>
      ) : (
        <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-800/40">
                  <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Usuário</th>
                  <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Plano</th>
                  <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Onboarding</th>
                  <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-dark-800/20 hover:bg-dark-800/20">
                    <td className="px-4 py-3 font-500">{c.full_name || 'Sem nome'}</td>
                    <td className="px-4 py-3">
                      <select value={c.plan} onChange={(e) => handleChangePlan(c.id, e.target.value)}
                        className="bg-dark-950 border border-dark-700/50 rounded-lg px-2 py-1 text-xs text-white">
                        <option value="free">Free</option>
                        <option value="loja">Loja</option>
                        <option value="pro">Pro</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleRole(c.id, c.role)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-500 ${c.role === 'admin' ? 'bg-amber-500/15 text-amber-400' : 'bg-dark-700 text-dark-400'}`}>
                        {c.role}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {c.onboarding_complete ? <Check size={16} className="text-emerald-400" /> : <span className="text-dark-500 text-xs">Pendente</span>}
                    </td>
                    <td className="px-4 py-3 text-dark-400 text-xs">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-dark-800/40">
              <span className="text-xs text-dark-400">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-3 py-1 text-xs rounded-lg bg-dark-800 text-dark-300 disabled:opacity-40">Anterior</button>
                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= totalCount}
                  className="px-3 py-1 text-xs rounded-lg bg-dark-800 text-dark-300 disabled:opacity-40">Próxima</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
