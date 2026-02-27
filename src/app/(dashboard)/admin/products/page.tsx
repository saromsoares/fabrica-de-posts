'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Plus, Pencil, Trash2, X, Upload, Check } from 'lucide-react';
import type { Product, Category } from '@/types/database';

type ProductForm = { name: string; description: string; category_id: string; tags: string; active: boolean };
const emptyForm: ProductForm = { name: '', description: '', category_id: '', tags: '', active: true };

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchData = async () => {
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('products').select('*, category:categories(*)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
    ]);
    if (prods) setProducts(prods as Product[]);
    if (cats) setCategories(cats as Category[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({ name: product.name, description: product.description || '', category_id: product.category_id || '', tags: (product.tags || []).join(', '), active: product.active });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    let imageUrl: string | undefined;

    if (imageFile) {
      const path = `products/${Date.now()}-${imageFile.name}`;
      const { error } = await supabase.storage.from('product-images').upload(path, imageFile);
      if (!error) {
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
    }

    const payload = {
      name: form.name,
      description: form.description || null,
      category_id: form.category_id || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      active: form.active,
      ...(imageUrl && { image_url: imageUrl }),
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      await supabase.from('products').update(payload).eq('id', editingId);
    } else {
      await supabase.from('products').insert(payload);
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setSaving(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchData();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from('products').update({ active: !active }).eq('id', id);
    fetchData();
  };

  const inputClass = 'w-full px-4 py-2.5 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm';

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-800">Produtos</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-600 rounded-xl transition-all">
          <Plus size={16} /> Novo produto
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display font-700">{editingId ? 'Editar' : 'Novo'} produto</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-dark-400" /></button>
            </div>

            <div>
              <label className="block text-sm text-dark-300 mb-1">Nome *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Ex: Farol LED H7" />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Descrição</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} resize-none`} rows={3} />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Categoria</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className={`${inputClass} bg-dark-950`}>
                <option value="">Selecione</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Tags (separadas por vírgula)</label>
              <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={inputClass} placeholder="led, h7, farol" />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Imagem</label>
              <label className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 hover:bg-dark-700 rounded-xl cursor-pointer text-sm text-dark-300 transition-all">
                <Upload size={16} /> {imageFile ? imageFile.name : 'Escolher imagem'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-dark-300">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded" /> Ativo
            </label>
            <button onClick={handleSave} disabled={saving || !form.name}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-600 rounded-xl transition-all text-sm">
              {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar produto'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-dark-900/60 animate-pulse" />)}</div>
      ) : (
        <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-800/40">
                  <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Produto</th>
                  <th className="text-left px-4 py-3 text-xs font-500 text-dark-400 hidden md:table-cell">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-500 text-dark-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-dark-800/20 hover:bg-dark-800/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-dark-800 overflow-hidden flex-shrink-0">
                          {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <span className="font-500 truncate">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-dark-400 hidden md:table-cell">{(p.category as Category)?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleActive(p.id, p.active)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-500 ${p.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-700 text-dark-400'}`}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(p)} className="p-2 rounded-lg hover:bg-dark-800 transition-colors"><Pencil size={14} className="text-dark-400" /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"><Trash2 size={14} className="text-dark-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
