'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Plus, Pencil, Trash2, FolderOpen, X, Check, Package } from 'lucide-react';
import type { Category, Factory } from '@/types/database';

export default function FabricanteCategoriesPage() {
  const supabase = createClient();
  const [factory, setFactory] = useState<Factory | null>(null);
  const [categories, setCategories] = useState<(Category & { product_count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Buscar fábrica do usuário
    const { data: factoryData } = await supabase
      .from('factories')
      .select('id, name, logo_url')
      .eq('user_id', user.id)
      .single();

    if (!factoryData) { setLoading(false); return; }
    setFactory(factoryData as Factory);

    // Buscar categorias da fábrica
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name, slug, factory_id')
      .eq('factory_id', factoryData.id)
      .order('name');

    // Contar produtos por categoria
    const enriched = await Promise.all(
      (cats || []).map(async (cat) => {
        const { count } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('category_id', cat.id);
        return { ...cat, product_count: count || 0 };
      })
    );

    setCategories(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const slugify = (text: string) =>
    text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSave = async () => {
    if (!formName.trim() || !factory) return;
    setSaving(true);
    setError('');

    const slug = slugify(formName.trim());

    if (editingId) {
      // Update
      const { error: err } = await supabase
        .from('categories')
        .update({ name: formName.trim(), slug })
        .eq('id', editingId);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      // Insert
      const { error: err } = await supabase
        .from('categories')
        .insert({ name: formName.trim(), slug, factory_id: factory.id });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setFormName('');
    setEditingId(null);
    setShowForm(false);
    setSaving(false);
    await loadData();
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta categoria? Os produtos associados perderão a categoria.')) return;
    await supabase.from('categories').delete().eq('id', id);
    await loadData();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName('');
    setError('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-400" size={32} />
      </div>
    );
  }

  if (!factory) {
    return (
      <div className="text-center py-16">
        <FolderOpen size={48} className="mx-auto text-dark-700 mb-4" />
        <p className="text-dark-400">Nenhuma fábrica associada à sua conta.</p>
        <p className="text-dark-500 text-sm mt-1">Peça ao administrador para associar uma fábrica ao seu perfil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-800 tracking-tight">Categorias</h1>
          <p className="text-dark-400 mt-1">Gerencie as categorias de produtos da {factory.name}.</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setFormName(''); setError(''); }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-700 transition-colors"
        >
          <Plus size={16} /> Nova Categoria
        </button>
      </div>

      {/* Form inline */}
      {showForm && (
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6">
          <h3 className="font-700 text-sm mb-4">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Nome da categoria..."
              className="flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Salvar
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 bg-dark-800 hover:bg-dark-700 text-dark-300 px-4 py-2.5 rounded-xl text-sm font-700 transition-colors"
            >
              <X size={14} /> Cancelar
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>
      )}

      {/* Lista de categorias */}
      {categories.length === 0 ? (
        <div className="text-center py-16 bg-dark-900 border border-dark-800 rounded-2xl">
          <FolderOpen size={48} className="mx-auto text-dark-700 mb-4" />
          <p className="text-dark-400">Nenhuma categoria criada ainda.</p>
          <p className="text-dark-500 text-sm mt-1">Crie categorias para organizar seus produtos.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between bg-dark-900 border border-dark-800 rounded-xl px-5 py-4 hover:border-dark-700 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center text-brand-400">
                  <FolderOpen size={18} />
                </div>
                <div>
                  <h3 className="font-700 text-sm text-white">{cat.name}</h3>
                  <p className="text-dark-500 text-xs flex items-center gap-1.5 mt-0.5">
                    <Package size={10} /> {cat.product_count} produto{cat.product_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(cat)}
                  className="p-2 text-dark-500 hover:text-brand-400 hover:bg-dark-800 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="p-2 text-dark-500 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
