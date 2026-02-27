'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Plus, Trash2, X, AlertCircle, CheckCircle, Tag } from 'lucide-react';
import { extractError } from '@/lib/utils';
import type { Category } from '@/types/database';

export default function AdminCategoriasPage() {
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('categories')
        .select('id, name, slug, created_at')
        .order('name');
      if (err) throw err;
      setCategories((data || []) as Category[]);
    } catch (err) {
      setError(`Erro ao carregar: ${extractError(err)}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3500);
  };

  const handleAdd = async () => {
    setError(null);
    const name = newName.trim();
    if (!name) { setError('Nome da categoria é obrigatório.'); return; }

    // Verificar duplicata
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      setError('Já existe uma categoria com esse nome.');
      return;
    }

    setSaving(true);
    try {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const { error: err } = await supabase
        .from('categories')
        .insert({ name, slug });
      if (err) throw new Error(err.message);

      setNewName('');
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

  const inputClass = 'w-full px-4 py-2.5 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all text-sm';

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
          <p className="text-dark-500 text-sm mt-0.5">{categories.length} categoria{categories.length !== 1 ? 's' : ''} cadastrada{categories.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setError(null); setNewName(''); setShowForm(true); }}
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

      {/* Modal rápido de nova categoria */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-700 text-lg">Nova categoria</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-dark-800">
                <X size={20} className="text-dark-400" />
              </button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400">
                <AlertCircle size={16} className="flex-shrink-0" /> {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-500 text-dark-300 mb-1.5">Nome *</label>
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

            <button
              onClick={handleAdd}
              disabled={saving || !newName.trim()}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-display font-600 rounded-xl transition-all text-sm"
            >
              {saving ? 'Salvando...' : 'Criar categoria'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-dark-900/60 animate-pulse" />)}</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20 bg-dark-900/40 border border-dark-800/40 rounded-2xl">
          <Tag size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400 mb-1">Nenhuma categoria cadastrada.</p>
          <p className="text-dark-500 text-sm">Clique em &quot;Nova categoria&quot; para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between px-5 py-3.5 bg-dark-900/60 border border-dark-800/40 rounded-xl hover:border-dark-700/60 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                  <Tag size={14} className="text-brand-400" />
                </div>
                <div>
                  <p className="font-500 text-sm">{c.name}</p>
                  <p className="text-[11px] text-dark-500">{c.slug}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(c.id, c.name)}
                className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                title="Excluir"
              >
                <Trash2 size={14} className="text-dark-500 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
