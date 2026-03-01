'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { uploadImage } from '@/lib/upload';
import { validateProductImage } from '@/lib/validators/image-validator';
import { isFabricanteRole } from '@/lib/role-helpers';
import { extractError } from '@/lib/utils';
import ProductCard from '@/components/product/ProductCard';
import {
  Loader2, Plus, Pencil, Trash2, X, Upload, Package,
  AlertCircle, CheckCircle, Search, Filter, Eye, EyeOff,
  FolderOpen, Sparkles,
} from 'lucide-react';
import type { Product, Category, Factory, Profile } from '@/types/database';

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */

type ProductWithCategory = Product & {
  categories: Pick<Category, 'id' | 'name'> | null;
};

type ProductForm = {
  name: string;
  description: string;
  category_id: string;
  tags: string;
  main_benefit: string;
  technical_specs: string;
  active: boolean;
};

const emptyForm: ProductForm = {
  name: '',
  description: '',
  category_id: '',
  tags: '',
  main_benefit: '',
  technical_specs: '',
  active: true,
};

/* ═══════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════ */

export default function FabricanteProdutosPage() {
  const supabase = createClient();
  const router = useRouter();

  // Auth & data
  const [authorized, setAuthorized] = useState(false);
  const [factory, setFactory] = useState<Factory | null>(null);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Toggle loading
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const showSuccessToast = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3500);
  };

  const clearMessages = () => { setError(null); setSuccess(null); };

  /* ─── Fetch data ─── */
  const fetchData = useCallback(async () => {
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

      // Get categories
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('factory_id', factoryData.id)
        .order('name');
      setCategories((cats || []) as Category[]);

      // Get products with category join
      const { data: prods } = await supabase
        .from('products')
        .select('*, categories:category_id(id, name)')
        .eq('factory_id', factoryData.id)
        .order('created_at', { ascending: false });
      setProducts((prods || []) as ProductWithCategory[]);

    } catch (err) {
      console.error('fetchData error:', err);
      setError('Erro ao carregar dados.');
    }
    setLoading(false);
  }, [supabase, router]);

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

  /* ─── Filtered products ─── */
  const filteredProducts = useMemo(() => {
    let result = products;

    if (filterCategory) {
      result = result.filter(p => p.category_id === filterCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    return result;
  }, [products, filterCategory, searchQuery]);

  /* ─── Image handling ─── */
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Imagem muito grande. Máximo 5MB.');
      return;
    }

    const validation = await validateProductImage(file);
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  /* ─── Form handlers ─── */
  const handleOpenNew = () => {
    clearMessages();
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setShowForm(true);
  };

  const handleEdit = (p: ProductWithCategory) => {
    clearMessages();
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description || '',
      category_id: p.category_id || '',
      tags: (p.tags || []).join(', '),
      main_benefit: p.main_benefit || '',
      technical_specs: p.technical_specs || '',
      active: p.active !== false,
    });
    setImagePreview(p.image_url || null);
    setImageFile(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    clearMessages();
  };

  const handleSave = async () => {
    clearMessages();
    if (!form.name.trim()) { setError('Nome do produto é obrigatório.'); return; }
    if (!factory) { setError('Fábrica não encontrada.'); return; }
    setSaving(true);

    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'png';
        const safeName = form.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const filename = `${Date.now()}-${safeName}.${ext}`;
        const result = await uploadImage(imageFile, 'fabrica/products', filename, { contentType: imageFile.type });
        imageUrl = result.url;
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category_id: form.category_id || null,
        factory_id: factory.id,
        tags: form.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
        main_benefit: form.main_benefit.trim() || null,
        technical_specs: form.technical_specs.trim() || null,
        active: form.active,
        ...(imageUrl && { image_url: imageUrl }),
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error: err } = await supabase.from('products').update(payload).eq('id', editingId);
        if (err) throw new Error(err.message);
        showSuccessToast('Produto atualizado!');
      } else {
        const { error: err } = await supabase.from('products').insert(payload);
        if (err) throw new Error(err.message);
        showSuccessToast('Produto criado com sucesso!');
      }

      handleCloseForm();
      await fetchData();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  /* ─── Toggle active ─── */
  const handleToggleActive = async (product: ProductWithCategory) => {
    setTogglingId(product.id);
    try {
      const newActive = !product.active;
      const { error: err } = await supabase
        .from('products')
        .update({ active: newActive, updated_at: new Date().toISOString() })
        .eq('id', product.id);
      if (err) throw new Error(err.message);

      // Update local state
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, active: newActive } : p
      ));
      showSuccessToast(newActive ? 'Produto ativado!' : 'Produto desativado.');
    } catch (err) {
      setError(extractError(err));
    }
    setTogglingId(null);
  };

  /* ─── Delete ─── */
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    clearMessages();
    try {
      const { error: err } = await supabase.from('products').delete().eq('id', id);
      if (err) throw new Error(err.message);
      showSuccessToast('Produto excluído.');
      await fetchData();
    } catch (err) {
      setError(`Erro ao excluir: ${extractError(err)}`);
    }
  };

  /* ─── Styles ─── */
  const inputClass = 'w-full px-4 py-2.5 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all text-sm';
  const selectClass = `${inputClass} bg-dark-950 appearance-none`;

  /* ─── Loading ─── */
  if (loading || !authorized) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-400" size={32} />
      </div>
    );
  }

  /* ─── No factory ─── */
  if (!factory) {
    return (
      <div className="text-center py-16">
        <Package size={48} className="mx-auto text-dark-700 mb-4" />
        <p className="text-dark-400">Nenhuma fábrica associada à sua conta.</p>
        <p className="text-dark-500 text-sm mt-1">Peça ao administrador para associar uma fábrica ao seu perfil.</p>
      </div>
    );
  }

  const activeCount = products.filter(p => p.active).length;
  const inactiveCount = products.length - activeCount;

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* ─── Toast ─── */}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-emerald-600 text-white text-sm font-500 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in-up">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && !showForm && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-red-600 text-white text-sm font-500 rounded-xl shadow-2xl flex items-center gap-2 max-w-md animate-fade-in-up">
          <AlertCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-800 tracking-tight flex items-center gap-2">
            <Package className="text-blue-400" size={24} />
            Produtos
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            {products.length} produto{products.length !== 1 ? 's' : ''} &middot;{' '}
            <span className="text-emerald-400">{activeCount} ativo{activeCount !== 1 ? 's' : ''}</span>
            {inactiveCount > 0 && (
              <> &middot; <span className="text-dark-500">{inactiveCount} inativo{inactiveCount !== 1 ? 's' : ''}</span></>
            )}
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-700 transition-colors self-start sm:self-auto"
        >
          <Plus size={16} /> Novo Produto
        </button>
      </div>

      {/* ─── Filtros ─── */}
      {products.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Busca */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, descrição ou tag..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-dark-800 rounded-xl text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all"
            />
          </div>

          {/* Filtro por categoria */}
          {categories.length > 0 && (
            <div className="relative">
              <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-dark-900 border border-dark-800 rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-brand-500/50 transition-all min-w-[180px]"
              >
                <option value="">Todas as categorias</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ─── Modal de criação/edição ─── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={handleCloseForm}
        >
          <div
            className="bg-dark-900 border border-dark-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-700 text-lg flex items-center gap-2">
                {editingId ? <Pencil size={18} className="text-brand-400" /> : <Plus size={18} className="text-brand-400" />}
                {editingId ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button onClick={handleCloseForm} className="p-1 rounded-lg hover:bg-dark-800 transition-colors">
                <X size={20} className="text-dark-400" />
              </button>
            </div>

            {/* Error inside modal */}
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400">
                <AlertCircle size={16} className="flex-shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-500 text-dark-300 mb-1.5">Nome do Produto *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  placeholder="Ex: Farol LED H7, Lâmpada Super Branca..."
                  autoFocus
                />
              </div>

              {/* Imagem */}
              <div>
                <label className="block text-sm font-500 text-dark-300 mb-1.5">Imagem do Produto</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-white border-2 border-dashed border-dark-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {imagePreview
                      ? <img src={imagePreview} alt="" className="w-full h-full object-contain p-1" />
                      : <Package size={24} className="text-gray-300" />}
                  </div>
                  <div>
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-dark-800 hover:bg-dark-700 rounded-xl cursor-pointer text-sm text-dark-300 transition-all">
                      <Upload size={16} /> {imageFile ? 'Trocar imagem' : 'Subir imagem'}
                      <input type="file" accept="image/png" className="hidden" onChange={handleImageChange} />
                    </label>
                    <p className="text-[11px] text-dark-500 mt-1.5">PNG, quadrado, mínimo 1080x1080px. Máx 5MB.</p>
                  </div>
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-500 text-dark-300 mb-1.5">Categoria</label>
                {categories.length === 0 ? (
                  <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-400 flex items-center gap-2">
                    <FolderOpen size={14} />
                    Nenhuma categoria. <a href="/dashboard/fabricante/categorias" className="underline">Crie uma primeiro.</a>
                  </div>
                ) : (
                  <select
                    value={form.category_id}
                    onChange={e => setForm({ ...form, category_id: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Sem categoria</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-500 text-dark-300 mb-1.5">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="Descrição do produto para uso em posts e legendas..."
                />
              </div>

              {/* Benefício principal */}
              <div>
                <label className="block text-sm font-500 text-dark-300 mb-1.5">Benefício Principal</label>
                <input
                  type="text"
                  value={form.main_benefit}
                  onChange={e => setForm({ ...form, main_benefit: e.target.value })}
                  className={inputClass}
                  placeholder="Ex: 200% mais luminosidade, Economia de energia..."
                />
              </div>

              {/* Especificações técnicas */}
              <div>
                <label className="block text-sm font-500 text-dark-300 mb-1.5">Especificações Técnicas</label>
                <textarea
                  value={form.technical_specs}
                  onChange={e => setForm({ ...form, technical_specs: e.target.value })}
                  className={`${inputClass} resize-none`}
                  rows={2}
                  placeholder="Potência: 55W, Tensão: 12V, Cor: 6000K..."
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-500 text-dark-300 mb-1.5">Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={e => setForm({ ...form, tags: e.target.value })}
                  className={inputClass}
                  placeholder="led, h7, farol, automotivo"
                />
                {form.tags.trim() && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-dark-800 text-dark-300 text-[11px] rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Ativo */}
              <label className="flex items-center gap-2.5 text-sm text-dark-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4 rounded border-dark-600 bg-dark-950 text-brand-600"
                />
                Produto ativo (visível no catálogo)
              </label>

              {/* Botão salvar */}
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-600 rounded-xl transition-all text-sm"
              >
                {saving ? 'Salvando...' : editingId ? 'Atualizar Produto' : 'Criar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Lista de produtos ─── */}
      {products.length === 0 ? (
        <div className="text-center py-20 bg-dark-900/40 border border-dark-800/40 rounded-2xl">
          <Package size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400 font-600 mb-1">Nenhum produto cadastrado.</p>
          <p className="text-dark-500 text-sm mb-6">Adicione seus produtos para que os lojistas possam criar posts.</p>
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl text-sm font-700 hover:bg-brand-700 transition-all"
          >
            <Plus size={16} /> Criar Primeiro Produto
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-dark-900/40 border border-dark-800/40 rounded-2xl">
          <Search size={40} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400 font-600">Nenhum produto encontrado.</p>
          <p className="text-dark-500 text-sm mt-1">Tente alterar os filtros ou a busca.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="relative group">
              <ProductCard
                name={product.name}
                imageUrl={product.image_url}
                category={product.categories?.name}
                size="md"
                action={
                  <div className="flex items-center gap-2">
                    {/* Toggle active */}
                    <button
                      onClick={() => handleToggleActive(product)}
                      disabled={togglingId === product.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-600 transition-all ${
                        product.active
                          ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                          : 'bg-dark-200 text-gray-400 hover:bg-dark-300'
                      }`}
                      title={product.active ? 'Desativar' : 'Ativar'}
                    >
                      {togglingId === product.id ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : product.active ? (
                        <Eye size={10} />
                      ) : (
                        <EyeOff size={10} />
                      )}
                      {product.active ? 'Ativo' : 'Inativo'}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil size={12} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                }
              />

              {/* Inactive overlay */}
              {!product.active && (
                <div className="absolute inset-0 bg-white/50 rounded-2xl pointer-events-none flex items-center justify-center">
                  <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-600 rounded-full">
                    Inativo
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
