'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Plus, Pencil, Trash2, X, Upload, AlertCircle, Factory } from 'lucide-react';
import { extractError } from '@/lib/utils';
import type { Factory as FactoryType } from '@/types/database';

type FactoryForm = { name: string; active: boolean };
const emptyForm: FactoryForm = { name: '', active: true };

export default function AdminFabricasPage() {
  const [factories, setFactories] = useState<FactoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FactoryForm>(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('factories')
        .select('id, name, logo_url, active, created_at')
        .order('name');
      if (fetchErr) throw fetchErr;
      if (data) setFactories(data as FactoryType[]);
    } catch (err) {
      setError(`Erro ao carregar: ${extractError(err)}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const clearMessages = () => { setError(null); setSuccess(null); };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { setError('Logo muito grande. Máximo: 2MB.'); return; }
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
        setError('Formato inválido. Use PNG, JPG, WebP ou SVG.'); return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      clearMessages();
    }
  };

  const handleEdit = (factory: FactoryType) => {
    clearMessages();
    setEditingId(factory.id);
    setForm({ name: factory.name, active: factory.active });
    setLogoPreview(factory.logo_url || null);
    setLogoFile(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setLogoFile(null);
    setLogoPreview(null);
    clearMessages();
  };

  const handleSave = async () => {
    clearMessages();
    if (!form.name.trim()) { setError('O nome da fábrica é obrigatório.'); return; }
    setSaving(true);

    try {
      let logoUrl: string | undefined;

      if (logoFile) {
        const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `${Date.now()}-${form.name.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('factories')
          .upload(path, logoFile, { contentType: logoFile.type });
        if (uploadErr) throw new Error(`Erro ao subir logo: ${uploadErr.message}`);
        const { data: urlData } = supabase.storage.from('factories').getPublicUrl(path);
        logoUrl = urlData.publicUrl;
      }

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        active: form.active,
        ...(logoUrl && { logo_url: logoUrl }),
      };

      if (editingId) {
        const { error: updateErr } = await supabase.from('factories').update(payload).eq('id', editingId);
        if (updateErr) throw new Error(updateErr.message);
        setSuccess('Fábrica atualizada!');
      } else {
        const { error: insertErr } = await supabase.from('factories').insert(payload);
        if (insertErr) throw new Error(insertErr.message);
        setSuccess('Fábrica criada!');
      }

      handleCloseForm();
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    clearMessages();
    if (!confirm(`Excluir a fábrica "${name}"? Produtos vinculados ficarão sem fábrica.`)) return;
    try {
      const { error: delErr } = await supabase.from('factories').delete().eq('id', id);
      if (delErr) throw new Error(delErr.message);
      setSuccess('Fábrica excluída.');
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err) {
      setError(`Erro ao excluir: ${extractError(err)}`);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all text-sm';

  return (
    <div className="animate-fade-in-up">
      {/* Toast global */}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-emerald-600 text-white text-sm font-500 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in-up">
          ✅ {success}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-800">Fábricas</h1>
        <button onClick={() => { clearMessages(); setShowForm(true); setEditingId(null); setForm(emptyForm); setLogoPreview(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-600 rounded-xl transition-all">
          <Plus size={16} /> Nova fábrica
        </button>
      </div>

      {error && !showForm && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400">
          <AlertCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400">{success}</div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={handleCloseForm}>
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display font-700 text-lg">{editingId ? 'Editar fábrica' : 'Nova fábrica'}</h2>
              <button onClick={handleCloseForm} className="p-1 rounded-lg hover:bg-dark-800 transition-colors"><X size={20} className="text-dark-400" /></button>
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400">
                <AlertCircle size={16} className="flex-shrink-0" /> {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-500 text-dark-300 mb-1.5">Nome da Fábrica *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass} placeholder="Ex: ASX, Philips, Osram..." />
            </div>

            <div>
              <label className="block text-sm font-500 text-dark-300 mb-1.5">Logo da Fábrica</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-dark-800 border-2 border-dashed border-dark-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-2" />
                  ) : (
                    <Factory size={24} className="text-dark-500" />
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-dark-800 hover:bg-dark-700 rounded-xl cursor-pointer text-sm text-dark-300 transition-all">
                    <Upload size={16} /> {logoFile ? 'Trocar logo' : 'Subir logo'}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoChange} />
                  </label>
                  <p className="text-[11px] text-dark-500 mt-1.5">PNG, JPG, WebP ou SVG. Máx 2MB.</p>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-dark-300 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 rounded border-dark-600 bg-dark-950 text-brand-600 focus:ring-brand-500/20" />
              Fábrica ativa (visível para lojistas)
            </label>

            <button onClick={handleSave} disabled={saving || !form.name.trim()}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-600 rounded-xl transition-all text-sm">
              {saving ? 'Salvando...' : editingId ? 'Atualizar fábrica' : 'Criar fábrica'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-dark-900/60 animate-pulse" />)}</div>
      ) : factories.length === 0 ? (
        <div className="text-center py-20 bg-dark-900/40 border border-dark-800/40 rounded-2xl">
          <Factory size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400 mb-2">Nenhuma fábrica cadastrada.</p>
          <p className="text-dark-500 text-sm">Clique em "Nova fábrica" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {factories.map((f) => (
            <div key={f.id} className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-5 hover:border-dark-700/60 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-dark-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {f.logo_url ? (
                    <img src={f.logo_url} alt={f.name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <Factory size={24} className="text-dark-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-700 truncate">{f.name}</h3>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-500 ${f.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-700 text-dark-400'}`}>
                    {f.active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(f)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-dark-800 hover:bg-dark-700 rounded-xl text-xs text-dark-300 transition-colors">
                  <Pencil size={12} /> Editar
                </button>
                <button onClick={() => handleDelete(f.id, f.name)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-dark-800 hover:bg-red-500/10 rounded-xl text-xs text-dark-400 hover:text-red-400 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
