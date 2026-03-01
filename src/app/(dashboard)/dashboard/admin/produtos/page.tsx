'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { uploadImage } from '@/lib/upload';
import { validateProductImage } from '@/lib/validators/image-validator';
import { Plus, Pencil, Trash2, X, Upload, AlertCircle, CheckCircle, Package } from 'lucide-react';
import { extractError } from '@/lib/utils';
import type { Product, Category, Factory } from '@/types/database';

const PAGE_SIZE = 20;

type ProductForm = {
  name: string;
  description: string;
  main_benefit: string;
  technical_specs: string;
  category_id: string;
  factory_id: string;
  tags: string;
  active: boolean;
};
const emptyForm: ProductForm = { name: '', description: '', main_benefit: '', technical_specs: '', category_id: '', factory_id: '', tags: '', active: true };

export default function AdminProdutosPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<(Product & { factory?: Factory | null; category?: Category | null })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalProductCount, setTotalProductCount] = useState(0);

  // ─── Fetch tudo com log pra debug ───
  const fetchData = useCallback(async (targetPage: number = 0) => {
    setLoading(true);
    try {
      // Buscar fábricas ATIVAS
      const { data: facs, error: facErr } = await supabase
        .from('factories')
        .select('id, name, logo_url, active, created_at')
        .eq('active', true)
        .order('name');

      if (facErr) {
        throw facErr;
      }
      setFactories((facs || []) as Factory[]);

      // Buscar categorias
      const { data: cats, error: catErr } = await supabase
        .from('categories')
        .select('id, name, slug, created_at')
        .order('name');

      if (catErr) {
        throw catErr;
      }
      setCategories((cats || []) as Category[]);

      // Buscar produtos com joins (paginado)
      const from = targetPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: prods, count: prodCount, error: prodErr } = await supabase
        .from('products')
        .select('id, name, description, category_id, factory_id, image_url, tags, active, created_at, updated_at, category:categories!category_id(id, name, slug, created_at), factory:factories!factory_id(id, name, logo_url, active, created_at)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (prodErr) {
        throw prodErr;
      }
      setProducts((prods || []) as (Product & { factory?: Factory | null; category?: Category | null })[]);
      setTotalProductCount(prodCount ?? 0);
    } catch (err) {
      console.error('fetchData error:', err);
      setError(`Erro ao carregar dados: ${extractError(err)}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      await fetchData(page);
    }
    run();
    return () => { cancelled = true; };
  }, [fetchData, page, supabase]);

  // ─── Auto-select se só tem 1 fábrica ───
  useEffect(() => {
    if (factories.length === 1 && !form.factory_id && showForm && !editingId) {
      setForm(prev => ({ ...prev, factory_id: factories[0].id }));
    }
  }, [factories, showForm, editingId, form.factory_id]);

  const clearMessages = () => { setError(null); setSuccess(null); };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3500);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Imagem muito grande. Máx 5MB.'); return; }
    const validation = await validateProductImage(file);
    if (!validation.valid) { setError(validation.error!); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    clearMessages();
  };

  const handleEdit = (p: Product) => {
    clearMessages();
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description || '',
      main_benefit: (p as Product & { main_benefit?: string }).main_benefit || '',
      technical_specs: (p as Product & { technical_specs?: string }).technical_specs || '',
      category_id: p.category_id || '',
      factory_id: p.factory_id || '',
      tags: (p.tags || []).join(', '),
      active: !!p.active,
    });
    setImagePreview(p.image_url || null);
    setImageFile(null);
    setShowForm(true);
  };

  const handleOpenNew = () => {
    clearMessages();
    setEditingId(null);
    // Auto-selecionar se só tem 1 fábrica
    const autoFactory = factories.length === 1 ? factories[0].id : '';
    setForm({ ...emptyForm, factory_id: autoFactory });
    setImageFile(null);
    setImagePreview(null);
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
    if (!form.factory_id) { setError('Selecione uma fábrica.'); return; }
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
        main_benefit: form.main_benefit.trim() || null,
        technical_specs: form.technical_specs.trim() || null,
        category_id: form.category_id || null,
        factory_id: form.factory_id || null,
        tags: form.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
        active: form.active,
        ...(imageUrl && { image_url: imageUrl }),
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error: err } = await supabase.from('products').update(payload).eq('id', editingId);
        if (err) throw new Error(err.message);
        showSuccess('Produto atualizado!');
      } else {
        const { error: err } = await supabase.from('products').insert(payload);
        if (err) throw new Error(err.message);
        showSuccess('Produto criado com sucesso!');
      }

      handleCloseForm();
      const tp = editingId ? page : 0;
      if (!editingId) setPage(0);
      fetchData(tp);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${name}"?`)) return;
    clearMessages();
    try {
      const { error: err } = await supabase.from('products').delete().eq('id', id);
      if (err) throw new Error(err.message);
      showSuccess('Produto excluído.');
      fetchData(page);
    } catch (err) {
      setError(`Erro ao excluir: ${extractError(err)}`);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all text-sm';
  const selectClass = `${inputClass} bg-dark-950 appearance-none`;

  return (
    <div className="animate-fade-in-up">
      {/* ─── Toast global (sempre no topo, z-[60]) ─── */}
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-800">Produtos</h1>
          <p className="text-dark-500 text-sm mt-0.5">
            {factories.length} fábrica{factories.length !== 1 ? 's' : ''} · {categories.length} categoria{categories.length !== 1 ? 's' : ''} · {totalProductCount} produto{totalProductCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={handleOpenNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-600 rounded-xl transition-all">
          <Plus size={16} /> Novo produto
        </button>
      </div>

      {/* ─── Modal (centralizado + scroll interno) ─── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={handleCloseForm}
        >
          <div
            className="bg-dark-900 border border-dark-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-700 text-lg">
                {editingId ? 'Editar produto' : 'Novo produto'}
              </h2>
              <button onClick={handleCloseForm} className="p-1 rounded-lg hover:bg-dark-800 transition-colors">
                <X size={20} className="text-dark-400" />
              </button>
            </div>

            {/* Erro dentro do modal */}
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
                />
              </div>

              {/* Fábrica */}
              <div>
                <label className="block text-sm font-500 text-dark-300 mb-1.5">Fábrica *</label>
                {factories.length === 0 ? (
                  <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-400">
                    Nenhuma fábrica encontrada. Cadastre uma em <strong>Admin → Fábricas</strong> primeiro.
                  </div>
                ) : (
                  <select
                    value={form.factory_id}
                    onChange={e => setForm({ ...form, factory_id: e.target.value })}
                    className={selectClass}
                  >
                    {factories.length > 1 && <option value="">Selecione a fábrica</option>}
                    {factories.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Imagem */}
              <div>
                <label className="block text-sm font-500 text-dark-300 mb-1.5">Imagem do Produto</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-white border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {imagePreview
                      ? <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                      : <Package size={24} className="text-dark-500" />}
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
                  <p className="text-[11px] text-dark-500">Nenhuma categoria. Crie em Admin → Categorias.</p>
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
                  rows={2}
                  placeholder="Descrição opcional do produto..."
                />
              </div>

              {/* Benefício Principal */}
              <div>
                <label className="block text-sm font-500 text-dark-300 mb-1.5">Benefício Principal</label>
                <input
                  type="text"
                  value={form.main_benefit}
                  onChange={e => setForm({ ...form, main_benefit: e.target.value })}
                  className={inputClass}
                  placeholder="Ex: Visibilidade 3x superior ao halógeno convencional"
                />
              </div>

              {/* Especificações Técnicas */}
              <div>
                <label className="block text-sm font-500 text-dark-300 mb-1.5">Especificações Técnicas</label>
                <textarea
                  value={form.technical_specs}
                  onChange={e => setForm({ ...form, technical_specs: e.target.value })}
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="Ex: 6000K, 55W, IP67, Tensão: 9-32V, Fluxo: 4500lm"
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
                disabled={saving || !form.name.trim() || !form.factory_id}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-600 rounded-xl transition-all text-sm"
              >
                {saving ? 'Salvando...' : editingId ? 'Atualizar produto' : 'Criar produto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Lista de produtos ─── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-dark-900/60 animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-dark-900/40 border border-dark-800/40 rounded-2xl">
          <Package size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400 mb-1">Nenhum produto cadastrado.</p>
          <p className="text-dark-500 text-sm">Clique em &quot;Novo produto&quot; para começar.</p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {products.map(p => (
              <div key={p.id} className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 overflow-hidden flex-shrink-0 p-1">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-dark-600" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-600 truncate">{p.name}</h3>
                    <p className="text-xs text-dark-500">
                      {p.factory?.name || '—'} · {p.category?.name || '—'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-500 flex-shrink-0 ${p.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-700 text-dark-400'}`}>
                    {p.active ? 'Ativo' : 'Off'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(p)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-dark-800 hover:bg-dark-700 rounded-xl text-xs text-dark-300 transition-colors">
                    <Pencil size={12} /> Editar
                  </button>
                  <button onClick={() => handleDelete(p.id, p.name)} className="px-4 py-2 bg-dark-800 hover:bg-red-500/10 rounded-xl text-xs text-dark-400 hover:text-red-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden md:block bg-dark-900/60 border border-dark-800/40 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-800/40">
                  <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Produto</th>
                  <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Fábrica</th>
                  <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-500 text-dark-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b border-dark-800/20 hover:bg-dark-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-dark-800 overflow-hidden flex-shrink-0">
                          {p.image_url
                            ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-dark-600" /></div>}
                        </div>
                        <span className="font-500 truncate">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-dark-400">{p.factory?.name || '—'}</td>
                     <td className="px-4 py-3 text-dark-400">{p.category?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-500 ${p.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-700 text-dark-400'}`}>
                        {p.active ? 'Ativo' : 'Off'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(p)} className="p-2 rounded-lg hover:bg-dark-800 transition-colors" title="Editar">
                          <Pencil size={14} className="text-dark-400" />
                        </button>
                        <button onClick={() => handleDelete(p.id, p.name)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors" title="Excluir">
                          <Trash2 size={14} className="text-dark-500 hover:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
