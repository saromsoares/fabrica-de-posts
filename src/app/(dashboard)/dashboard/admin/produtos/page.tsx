'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Plus, Pencil, Trash2, Upload, AlertCircle, Package } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import type { Product, Category, Factory } from '@/types/database';

type ProductForm = { name: string; description: string; category_id: string; factory_id: string; tags: string; active: boolean };
const emptyForm: ProductForm = { name: '', description: '', category_id: '', factory_id: '', tags: '', active: true };

export default function AdminProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
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
  const supabase = createClient();
  const { addToast } = useToast();

  const fetchData = async () => {
    try {
      const [{ data: prods, error: e1 }, { data: cats, error: e2 }, { data: facs, error: e3 }] = await Promise.all([
        supabase.from('products').select('*, category:categories(*), factory:factories(*)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
        supabase.from('factories').select('*').eq('active', true).order('name'),
      ]);
      if (e1) throw e1; if (e2) throw e2; if (e3) throw e3;
      if (prods) setProducts(prods as Product[]);
      if (cats) setCategories(cats as Category[]);
      if (facs) setFactories(facs as Factory[]);
    } catch (err) {
      addToast(`Erro ao carregar dados: ${err instanceof Error ? err.message : 'Erro desconhecido'}`, 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { setError('Imagem muito grande. Máx 5MB.'); return; }
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Formato inválido.'); return; }
      setImageFile(file); setImagePreview(URL.createObjectURL(file)); setError(null);
    }
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description || '', category_id: p.category_id || '', factory_id: p.factory_id || '', tags: (p.tags || []).join(', '), active: p.active });
    setImagePreview(p.image_url || null); setImageFile(null); setError(null); setShowForm(true);
  };

  const handleCloseForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); setImageFile(null); setImagePreview(null); setError(null); };

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) { setError('Nome obrigatório.'); return; }
    if (!form.factory_id) { setError('Selecione uma fábrica.'); return; }
    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `${Date.now()}-${form.name.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('products').upload(path, imageFile, { contentType: imageFile.type });
        if (upErr) throw new Error(`Upload: ${upErr.message}`);
        const { data: urlData } = supabase.storage.from('products').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      const payload = {
        name: form.name.trim(), description: form.description.trim() || null,
        category_id: form.category_id || null, factory_id: form.factory_id || null,
        tags: form.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
        active: form.active, ...(imageUrl && { image_url: imageUrl }), updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error: err } = await supabase.from('products').update(payload).eq('id', editingId);
        if (err) throw new Error(err.message);
        addToast('Produto atualizado!', 'success');
      } else {
        const { error: err } = await supabase.from('products').insert(payload);
        if (err) throw new Error(err.message);
        addToast('Produto criado!', 'success');
      }
      handleCloseForm(); fetchData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro inesperado.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    try {
      const { error: err } = await supabase.from('products').delete().eq('id', id);
      if (err) throw new Error(err.message);
      addToast('Produto excluído.', 'success');
      fetchData();
    } catch (err) { addToast(`Erro: ${err instanceof Error ? err.message : 'Desconhecido'}`, 'error'); }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all text-sm';

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-800">Produtos</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setImagePreview(null); setError(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-600 rounded-xl transition-all">
          <Plus size={16} /> Novo produto
        </button>
      </div>

      {/* Modal com componente reutilizável */}
      <Modal isOpen={showForm} onClose={handleCloseForm} title={editingId ? 'Editar produto' : 'Novo produto'}>
        {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400"><AlertCircle size={16} className="flex-shrink-0" /> {error}</div>}

        <div><label className="block text-sm font-500 text-dark-300 mb-1.5">Nome *</label>
          <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputClass} placeholder="Farol LED H7" /></div>

        <div><label className="block text-sm font-500 text-dark-300 mb-1.5">Fábrica *</label>
          <select value={form.factory_id} onChange={e => setForm({...form, factory_id: e.target.value})} className={`${inputClass} bg-dark-950`}>
            <option value="">Selecione a fábrica</option>
            {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {factories.length === 0 && <p className="text-[11px] text-amber-400 mt-1">Cadastre fábricas primeiro em Admin &rarr; Fábricas.</p>}
        </div>

        <div><label className="block text-sm font-500 text-dark-300 mb-1.5">Imagem</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-dark-800 border-2 border-dashed border-dark-600 flex items-center justify-center overflow-hidden flex-shrink-0">
              {imagePreview ? <img src={imagePreview} alt="" className="w-full h-full object-cover" /> : <Package size={24} className="text-dark-500" />}
            </div>
            <div>
              <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-dark-800 hover:bg-dark-700 rounded-xl cursor-pointer text-sm text-dark-300 transition-all">
                <Upload size={16} /> {imageFile ? 'Trocar' : 'Subir imagem'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              <p className="text-[11px] text-dark-500 mt-1.5">PNG, JPG, WebP. Máx 5MB.</p>
            </div>
          </div>
        </div>

        <div><label className="block text-sm font-500 text-dark-300 mb-1.5">Categoria</label>
          <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className={`${inputClass} bg-dark-950`}>
            <option value="">Selecione</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>

        <div><label className="block text-sm font-500 text-dark-300 mb-1.5">Descrição</label>
          <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={`${inputClass} resize-none`} rows={2} /></div>

        <div><label className="block text-sm font-500 text-dark-300 mb-1.5">Tags (vírgula)</label>
          <input type="text" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className={inputClass} placeholder="led, h7" /></div>

        <label className="flex items-center gap-2.5 text-sm text-dark-300 cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} className="w-4 h-4 rounded" /> Ativo
        </label>

        <button onClick={handleSave} disabled={saving || !form.name.trim()}
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-display font-600 rounded-xl transition-all text-sm">
          {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar produto'}
        </button>
      </Modal>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-dark-900/60 animate-pulse" />)}</div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-dark-900/40 border border-dark-800/40 rounded-2xl">
          <Package size={48} className="mx-auto text-dark-600 mb-4" /><p className="text-dark-400">Nenhum produto cadastrado.</p></div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {products.map(p => (
              <div key={p.id} className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-xl bg-dark-800 overflow-hidden flex-shrink-0">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-dark-600" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-600 truncate">{p.name}</h3>
                    <p className="text-xs text-dark-500">{(p.factory as Factory)?.name || '—'} · {(p.category as Category)?.name || '—'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-500 flex-shrink-0 ${p.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-700 text-dark-400'}`}>{p.active ? 'Ativo' : 'Off'}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(p)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-dark-800 hover:bg-dark-700 rounded-xl text-xs text-dark-300"><Pencil size={12} /> Editar</button>
                  <button onClick={() => handleDelete(p.id, p.name)} className="px-4 py-2 bg-dark-800 hover:bg-red-500/10 rounded-xl text-xs text-dark-400 hover:text-red-400"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block bg-dark-900/60 border border-dark-800/40 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-dark-800/40">
                <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Produto</th>
                <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Fábrica</th>
                <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-500 text-dark-400">Status</th>
                <th className="text-right px-4 py-3 text-xs font-500 text-dark-400">Ações</th>
              </tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b border-dark-800/20 hover:bg-dark-800/20">
                    <td className="px-4 py-3"><div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-dark-800 overflow-hidden flex-shrink-0">{p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-dark-600" /></div>}</div>
                      <span className="font-500 truncate">{p.name}</span></div></td>
                    <td className="px-4 py-3 text-dark-400">{(p.factory as Factory)?.name || '—'}</td>
                    <td className="px-4 py-3 text-dark-400">{(p.category as Category)?.name || '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-[11px] font-500 ${p.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-700 text-dark-400'}`}>{p.active ? 'Ativo' : 'Off'}</span></td>
                    <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(p)} className="p-2 rounded-lg hover:bg-dark-800"><Pencil size={14} className="text-dark-400" /></button>
                      <button onClick={() => handleDelete(p.id, p.name)} className="p-2 rounded-lg hover:bg-red-500/10"><Trash2 size={14} className="text-dark-500" /></button>
                    </div></td>
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
