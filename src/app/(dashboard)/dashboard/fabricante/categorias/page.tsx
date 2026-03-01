'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { isFabricanteRole } from '@/lib/role-helpers';
import {
  Loader2, Plus, Pencil, Trash2, FolderOpen, X, Check,
  Package, AlertCircle, CheckCircle, AlertTriangle, SmilePlus,
} from 'lucide-react';
import type { Category, Factory, Profile } from '@/types/database';

type CategoryWithCount = Category & { product_count: number };

export default function FabricanteCategoriesPage() {
  const supabase = createClient();
  const router = useRouter();

  // Auth & role
  const [authorized, setAuthorized] = useState(false);
  const [factory, setFactory] = useState<Factory | null>(null);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [saving, setSaving] = useState(false);

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);

  const showSuccessToast = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3500);
  };

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_super_admin')
        .eq('id', user.id)
        .single();

      if (!profile || !isFabricanteRole(profile as Pick<Profile, 'role' | 'is_super_admin'>)) {
        router.push('/dashboard');
        return;
      }
      setAuthorized(true);

      // Get factory
      const { data: factoryData } = await supabase
        .from('factories')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!factoryData) { setLoading(false); return; }
      setFactory(factoryData as Factory);

      // Get categories with product count
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('factory_id', factoryData.id)
        .order('name');

      const enriched = await Promise.all(
        (cats || []).map(async (cat) => {
          const { count } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', cat.id);
          return { ...cat, product_count: count || 0 } as CategoryWithCount;
        })
      );

      setCategories(enriched);
    } catch (err) {
      console.error('loadData error:', err);
      setError('Erro ao carregar dados.');
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      await loadData();
    }
    run();
    return () => { cancelled = true; };
  }, [loadData, supabase]);

  const handleSave = async () => {
    if (!formName.trim() || !factory) return;
    setSaving(true);
    setError(null);

    const slug = slugify(formName.trim());

    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('categories')
          .update({ name: formName.trim(), slug })
          .eq('id', editingId);
        if (err) throw new Error(err.message);
        showSuccessToast('Categoria atualizada!');
      } else {
        const { error: err } = await supabase
          .from('categories')
          .insert({ name: formName.trim(), slug, factory_id: factory.id });
        if (err) throw new Error(err.message);
        showSuccessToast('Categoria criada com sucesso!');
      }

      handleCancel();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    }
    setSaving(false);
  };

  const handleEdit = (cat: CategoryWithCount) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormIcon('');
    setShowForm(true);
    setError(null);
  };

  const handleDeleteRequest = (cat: CategoryWithCount) => {
    setDeleteTarget(cat);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    // Check if has products
    if (deleteTarget.product_count > 0) {
      setError(`Esta categoria possui ${deleteTarget.product_count} produto${deleteTarget.product_count !== 1 ? 's' : ''} vinculado${deleteTarget.product_count !== 1 ? 's' : ''}. Mova os produtos para outra categoria antes de excluir.`);
      setDeleteTarget(null);
      return;
    }

    try {
      const { error: err } = await supabase
        .from('categories')
        .delete()
        .eq('id', deleteTarget.id);
      if (err) throw new Error(err.message);
      showSuccessToast('Categoria excluída.');
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.');
      setDeleteTarget(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName('');
    setFormIcon('');
    setError(null);
  };

  // Loading state
  if (loading || !authorized) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-400" size={32} />
      </div>
    );
  }

  // No factory
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
    <div className="animate-fade-in-up space-y-8">
      {/* ─── Toast de sucesso ─── */}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-emerald-600 text-white text-sm font-500 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in-up">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* ─── Toast de erro ─── */}
      {error && !showForm && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-red-600 text-white text-sm font-500 rounded-xl shadow-2xl flex items-center gap-2 max-w-md animate-fade-in-up">
          <AlertCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-800 tracking-tight flex items-center gap-2">
            <FolderOpen className="text-brand-400" size={24} />
            Categorias
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            Organize os produtos da <span className="text-white font-600">{factory.name}</span> em categorias.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setFormName(''); setFormIcon(''); setError(null); }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-700 transition-colors self-start sm:self-auto"
        >
          <Plus size={16} /> Nova Categoria
        </button>
      </div>

      {/* ─── Formulário inline ─── */}
      {showForm && (
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6">
          <h3 className="font-700 text-sm mb-4 flex items-center gap-2">
            {editingId ? <Pencil size={14} className="text-brand-400" /> : <Plus size={14} className="text-brand-400" />}
            {editingId ? 'Editar Categoria' : 'Nova Categoria'}
          </h3>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Nome da categoria (ex: Faróis, Lâmpadas LED...)"
              className="flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-700 transition-colors disabled:opacity-50"
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
          </div>

          {formName.trim() && (
            <p className="text-dark-500 text-xs mt-3">
              Slug: <span className="text-dark-400 font-mono">{slugify(formName.trim())}</span>
            </p>
          )}
        </div>
      )}

      {/* ─── Lista de categorias ─── */}
      {categories.length === 0 ? (
        <div className="text-center py-16 bg-dark-900 border border-dark-800 rounded-2xl">
          <FolderOpen size={48} className="mx-auto text-dark-700 mb-4" />
          <p className="text-dark-400 font-600">Nenhuma categoria criada ainda.</p>
          <p className="text-dark-500 text-sm mt-1">Crie categorias para organizar seus produtos.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header da lista */}
          <div className="hidden sm:flex items-center px-5 py-2 text-[10px] font-700 uppercase tracking-widest text-dark-600">
            <span className="flex-1">Categoria</span>
            <span className="w-28 text-center">Produtos</span>
            <span className="w-24 text-right">Ações</span>
          </div>

          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between bg-dark-900 border border-dark-800 rounded-xl px-5 py-4 hover:border-dark-700 transition-colors group"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center text-brand-400 flex-shrink-0">
                  <FolderOpen size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-700 text-sm text-white truncate">{cat.name}</h3>
                  <p className="text-dark-600 text-[10px] font-mono mt-0.5 truncate">{cat.slug}</p>
                </div>
              </div>

              <div className="w-28 text-center flex-shrink-0">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-600 ${
                  cat.product_count > 0
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'bg-dark-800 text-dark-500'
                }`}>
                  <Package size={10} />
                  {cat.product_count}
                </span>
              </div>

              <div className="w-24 flex items-center justify-end gap-1 flex-shrink-0">
                <button
                  onClick={() => handleEdit(cat)}
                  className="p-2 text-dark-500 hover:text-brand-400 hover:bg-dark-800 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDeleteRequest(cat)}
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

      {/* ─── Modal de confirmação de exclusão ─── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-dark-900 border border-dark-800 rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {deleteTarget.product_count > 0 ? (
              <>
                {/* Bloqueio de exclusão */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-amber-500/10">
                    <AlertTriangle size={24} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-700 text-white">Exclusão bloqueada</h3>
                    <p className="text-dark-400 text-xs mt-0.5">Categoria com produtos vinculados</p>
                  </div>
                </div>
                <div className="px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl mb-4">
                  <p className="text-sm text-amber-300">
                    A categoria <strong>&quot;{deleteTarget.name}&quot;</strong> possui{' '}
                    <strong>{deleteTarget.product_count} produto{deleteTarget.product_count !== 1 ? 's' : ''}</strong> vinculado{deleteTarget.product_count !== 1 ? 's' : ''}.
                  </p>
                  <p className="text-xs text-amber-400/70 mt-2">
                    Mova os produtos para outra categoria antes de excluir.
                  </p>
                </div>
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="w-full py-2.5 bg-dark-800 hover:bg-dark-700 text-white rounded-xl text-sm font-600 transition-colors"
                >
                  Entendi
                </button>
              </>
            ) : (
              <>
                {/* Confirmação de exclusão */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-red-500/10">
                    <Trash2 size={24} className="text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-700 text-white">Excluir categoria</h3>
                    <p className="text-dark-400 text-xs mt-0.5">Esta ação não pode ser desfeita</p>
                  </div>
                </div>
                <p className="text-sm text-dark-300 mb-5">
                  Tem certeza que deseja excluir a categoria <strong>&quot;{deleteTarget.name}&quot;</strong>?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-2.5 bg-dark-800 hover:bg-dark-700 text-white rounded-xl text-sm font-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-600 transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
