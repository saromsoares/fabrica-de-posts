'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Plus, Pencil, Trash2, X, Upload, AlertCircle, Package } from 'lucide-react';
import type { Product, Category } from '@/types/database';

type ProductForm = {
  name: string;
  description: string;
  category_id: string;
  tags: string;
  active: boolean;
};

const emptyForm: ProductForm = {
  name: '',
  description: '',
  category_id: '',
  tags: '',
  active: true,
};

export default function AdminProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = async () => {
    try {
      const [{ data: prods, error: prodsErr }, { data: cats, error: catsErr }] = await Promise.all([
        supabase.from('products').select('*, category:categories(*)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
      ]);
      if (prodsErr) throw prodsErr;
      if (catsErr) throw catsErr;
      if (prods) setProducts(prods as Product[]);
      if (cats) setCategories(cats as Category[]);
    } catch (err) {
      setError(`Erro ao carregar dados: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const clearMessages = () => { setError(null); setSuccess(null); };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validação de tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Imagem muito grande. Máximo: 5MB.');
        return;
      }
      // Validação de tipo
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        setError('Formato inválido. Use PNG, JPG ou WebP.');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      clearMessages();
    }
  };

  const handleEdit = (product: Product) => {
    clearMessages();
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description || '',
      category_id: product.category_id || '',
      tags: (product.tags || []).join(', '),
      active: product.active,
    });
    setImagePreview(product.image_url || null);
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

    // Validação
    if (!form.name.trim()) {
      setError('O nome do produto é obrigatório.');
      return;
    }

    setSaving(true);

    try {
      let imageUrl: string | undefined;

      // Upload da imagem no bucket 'products'
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `${Date.now()}-${form.name.replace(/\s+/g, '-').toLowerCase()}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from('products')
          .upload(path, imageFile, { contentType: imageFile.type });

        if (uploadErr) {
          throw new Error(`Erro ao subir imagem: ${uploadErr.message}`);
        }

        const { data: urlData } = supabase.storage.from('products').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category_id: form.category_id || null,
        tags: form.tags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
        active: form.active,
        ...(imageUrl && { image_url: imageUrl }),
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error: updateErr } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingId);
        if (updateErr) throw new Error(`Erro ao atualizar: ${updateErr.message}`);
        setSuccess('Produto atualizado com sucesso!');
      } else {
        const { error: insertErr } = await supabase
          .from('products')
          .insert(payload);
        if (insertErr) throw new Error(`Erro ao criar: ${insertErr.message}`);
        setSuccess('Produto criado com sucesso!');
      }

      // Fechar modal e recarregar
      handleCloseForm();
      fetchData();

      // Limpar mensagem de sucesso após 3s
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    clearMessages();
    if (!confirm(`Tem certeza que deseja excluir "${name}"?`)) return;

    try {
      const { error: delErr } = await supabase.from('products').delete().eq('id', id);
      if (delErr) throw new Error(delErr.message);
      setSuccess('Produto excluído.');
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err) {
      setError(`Erro ao excluir: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const { error: toggleErr } = await supabase
        .from('products')
        .update({ active: !active })
        .eq('id', id);
      if (toggleErr) throw new Error(toggleErr.message);
      fetchData();
    } catch (err) {
      setError(`Erro ao alterar status: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all text-sm';

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-800">Produtos</h1>
        <button
          onClick={() => { clearMessages(); setShowForm(true); setEditingId(null); setForm(emptyForm); setImagePreview(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-600 rounded-xl transition-all"
        >
          <Plus size={16} /> Novo produto
        </button>
      </div>

      {/* Mensagens globais */}
      {error && !showForm && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400">
          <AlertCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400">
          {success}
        </div>
      )}

      {/* Modal de formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={handleCloseForm}>
          <div
            className="bg-dark-900 border border-dark-800 rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do modal */}
            <div className="flex items-center justify-between">
              <h2 className="font-display font-700 text-lg">
                {editingId ? 'Editar produto' : 'Novo produto'}
              </h2>
              <button onClick={handleCloseForm} className="p-1 rounded-lg hover:bg-dark-800 transition-colors">
                <X size={20} className="text-dark-400" />
              </button>
            </div>

            {/* Erro dentro do modal */}
            {error && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400">
                <AlertCircle size={16} className="flex-shrink-0" /> {error}
              </div>
            )}

            {/* Nome * */}
            <div>
              <label className="block text-sm font-500 text-dark-300 mb-1.5">Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                placeholder="Ex: Farol LED H7"
              />
            </div>

            {/* Imagem */}
            <div>
              <label className="block text-sm font-500 text-dark-300 mb-1.5">Imagem do produto</label>
              <div className="flex items-center gap-4">
                {/* Preview */}
                <div className="w-20 h-20 rounded-xl bg-dark-800 border-2 border-dashed border-dark-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Package size={24} className="text-dark-500" />
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-dark-800 hover:bg-dark-700 rounded-xl cursor-pointer text-sm text-dark-300 transition-all">
                    <Upload size={16} />
                    {imageFile ? 'Trocar imagem' : 'Subir imagem'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                  <p className="text-[11px] text-dark-500 mt-1.5">PNG, JPG ou WebP. Máx 5MB.</p>
                </div>
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-500 text-dark-300 mb-1.5">Categoria</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className={`${inputClass} bg-dark-950`}
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-500 text-dark-300 mb-1.5">Descrição</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Descrição opcional do produto..."
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-500 text-dark-300 mb-1.5">Tags (separadas por vírgula)</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className={inputClass}
                placeholder="led, h7, farol, automotivo"
              />
            </div>

            {/* Ativo */}
            <label className="flex items-center gap-2.5 text-sm text-dark-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 rounded border-dark-600 bg-dark-950 text-brand-600 focus:ring-brand-500/20"
              />
              Produto ativo (visível no catálogo)
            </label>

            {/* Botão salvar */}
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-600 rounded-xl transition-all text-sm"
            >
              {saving ? 'Salvando...' : editingId ? 'Atualizar produto' : 'Criar produto'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de produtos */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-dark-900/60 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-dark-900/40 border border-dark-800/40 rounded-2xl">
          <Package size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400 mb-2">Nenhum produto cadastrado.</p>
          <p className="text-dark-500 text-sm">Clique em "Novo produto" para começar.</p>
        </div>
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="space-y-3 md:hidden">
            {products.map((p) => (
              <div key={p.id} className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-xl bg-dark-800 overflow-hidden flex-shrink-0">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={20} className="text-dark-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-600 truncate">{p.name}</h3>
                    <p className="text-xs text-dark-500">{(p.category as Category)?.name || 'Sem categoria'}</p>
                  </div>
                  <button
                    onClick={() => handleToggleActive(p.id, p.active)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-500 flex-shrink-0 ${
                      p.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-700 text-dark-400'
                    }`}
                  >
                    {p.active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-dark-800 hover:bg-dark-700 rounded-xl text-xs text-dark-300 transition-colors"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-dark-800 hover:bg-red-500/10 rounded-xl text-xs text-dark-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Tabela */}
          <div className="hidden md:block bg-dark-900/60 border border-dark-800/40 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-800/40">
                  <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Produto</th>
                  <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-500 text-dark-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-dark-800/20 hover:bg-dark-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-dark-800 overflow-hidden flex-shrink-0">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={16} className="text-dark-600" />
                            </div>
                          )}
                        </div>
                        <span className="font-500 truncate">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-dark-400">
                      {(p.category as Category)?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(p.id, p.active)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-500 transition-colors ${
                          p.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-700 text-dark-400'
                        }`}
                      >
                        {p.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-2 rounded-lg hover:bg-dark-800 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} className="text-dark-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Excluir"
                        >
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
