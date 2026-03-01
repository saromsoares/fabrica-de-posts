'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Plus, Trash2, X, AlertCircle, CheckCircle, Tag, Factory } from 'lucide-react';
import { extractError } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  slug: string;
  factory_id: string | null;
  created_at: string;
  factories?: { id: string; name: string; logo_url: string | null } | null;
}

interface FactoryOption {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function AdminCategoriasPage() {
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [factories, setFactories] = useState<FactoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFactoryId, setNewFactoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [{ data: cats }, { data: facs }] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, slug, factory_id, created_at, factories:factories!factory_id(id, name, logo_url)')
          .order('name'),
        supabase
          .from('factories')
          .select('id, name, logo_url')
          .eq('active', true)
          .order('name'),
      ]);
      setCategories((cats || []) as Category[]);
      setFactories((facs || []) as FactoryOption[]);
    } catch (err) {
      setError(`Erro ao carregar: ${extractError(err)}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

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

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3500);
  };

  const handleAdd = async () => {
    setError(null);
    const name = newName.trim();
    if (!name) { setError('Nome da categoria é obrigatório.'); return; }

    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      setError('Já existe uma categoria com esse nome.');
      return;
    }

    setSaving(true);
    try {
      const slug = name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const payload: Record<string, unknown> = { name, slug };
      if (newFactoryId) payload.factory_id = newFactoryId;

      const { error: err } = await supabase.from('categories').insert(payload);
      if (err) throw new Error(err.message);

      setNewName('');
      setNewFactoryId('');
      setShowForm(false);
      showSuccessMsg(`Categoria "${name}" criada!`);
      fetchData();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir a categoria "${name}"?\nProdutos vinculados ficarão sem categoria.`)) return;
    setError(null);
    try {
      const { error: err } = await supabase.from('categories').delete().eq('id', id);
      if (err) throw new Error(err.message);
      showSuccessMsg(`Categoria "${name}" excluída.`);
      fetchData();
    } catch (err) {
      setError(`Erro ao excluir: ${extractError(err)}`);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/15 transition-all text-sm';

  return (
    <div className="animate-fade-in-up">
      {/* Toast */}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-emerald-600 text-white text-sm font-500 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in-up">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-800">Categorias</h1>
          <p className="text-white/30 text-sm mt-0.5">{categories.length} categoria{categories.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setError(null); setNewName(''); setNewFactoryId(''); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-600 rounded-xl transition-all"
        >
          <Plus size={16} /> Nova categoria
        </button>
      </div>

      {error && !showForm && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-dark-950 border border-dark-700/50 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-700 text-lg">Nova categoria</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-dark-800/60">
                <X size={20} className="text-white/50" />
              </button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400">
                <AlertCircle size={16} className="flex-shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-500 text-white/70 mb-1.5">Nome *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className={inputClass}
                  placeholder="Ex: Iluminação, Acessórios, Elétrica..."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-500 text-white/70 mb-1.5 flex items-center gap-1.5">
                  <Factory size={14} /> Fábrica vinculada
                </label>
                <select
                  value={newFactoryId}
                  onChange={e => setNewFactoryId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Sem fábrica (global)</option>
                  {factories.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-white/30 mt-1">Deixe em branco para categoria global (todas as fábricas).</p>
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={saving || !newName.trim()}
              className="w-full mt-5 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-display font-600 rounded-xl transition-all text-sm"
            >
              {saving ? 'Salvando...' : 'Criar categoria'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl skeleton-shimmer" />)}</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20 bg-dark-900/40 border border-dark-800/30 rounded-2xl">
          <Tag size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/40 mb-1">Nenhuma categoria cadastrada.</p>
          <p className="text-white/25 text-sm">Clique em &quot;Nova categoria&quot; para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between px-5 py-3.5 bg-dark-900/40 border border-dark-800/30 rounded-xl hover:border-dark-700/50 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-600/10 flex items-center justify-center flex-shrink-0">
                  <Tag size={14} className="text-brand-400" />
                </div>
                <div>
                  <p className="font-500 text-sm text-white">{c.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-white/30">{c.slug}</p>
                    {c.factories ? (
                      <span className="flex items-center gap-1 text-[10px] text-dark-400 bg-dark-700/40 px-1.5 py-0.5 rounded-full">
                        <Factory size={9} />
                        {c.factories.name}
                      </span>
                    ) : (
                      <span className="text-[10px] text-dark-500 bg-dark-800/40 px-1.5 py-0.5 rounded-full">global</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(c.id, c.name)}
                className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                title="Excluir"
              >
                <Trash2 size={14} className="text-white/30 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
