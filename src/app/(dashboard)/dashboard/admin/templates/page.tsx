'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Plus, Pencil, Trash2, Upload, AlertCircle, LayoutTemplate } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import type { Template, TemplateConfig } from '@/types/database';

const defaultConfig: TemplateConfig = {
  productImage: { x: 50, y: 15, width: 80, height: 45 },
  logo: { x: 3, y: 3, width: 15, height: 8 },
  productName: { x: 5, y: 65, fontSize: 18, color: '#FFFFFF', fontWeight: 'bold' },
  price: { x: 5, y: 75, fontSize: 28, color: '#FFD700', fontWeight: 'bold' },
  cta: { x: 5, y: 88, fontSize: 12, color: '#FFFFFF' },
  contact: { x: 70, y: 3, fontSize: 9, color: '#FFFFFF' },
  background: { type: 'gradient', value: 'linear-gradient(135deg, #1a1b2e, #0f1020)' },
};

type TemplateForm = { name: string; format: 'feed' | 'story'; config_json: string; active: boolean };
const emptyForm: TemplateForm = { name: '', format: 'feed', config_json: JSON.stringify(defaultConfig, null, 2), active: true };

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { addToast } = useToast();

  const fetchData = async () => {
    try {
      const { data, error: fetchErr } = await supabase.from('templates').select('*').order('created_at', { ascending: false });
      if (fetchErr) throw fetchErr;
      if (data) setTemplates(data as Template[]);
    } catch (err) {
      addToast(`Erro ao carregar templates: ${err instanceof Error ? err.message : 'Erro desconhecido'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleEdit = (tpl: Template) => {
    setEditingId(tpl.id);
    setForm({ name: tpl.name, format: tpl.format, config_json: JSON.stringify(tpl.config_json, null, 2), active: tpl.active });
    setError(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setPreviewFile(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Nome obrigatório.'); return; }
    setSaving(true);
    setError(null);

    try {
      let previewUrl: string | undefined;

      if (previewFile) {
        const path = `templates/${Date.now()}-${previewFile.name}`;
        const { error: upErr } = await supabase.storage.from('template-previews').upload(path, previewFile);
        if (upErr) throw new Error(`Upload: ${upErr.message}`);
        const { data } = supabase.storage.from('template-previews').getPublicUrl(path);
        previewUrl = data.publicUrl;
      }

      let configJson;
      try { configJson = JSON.parse(form.config_json); } catch { configJson = defaultConfig; }

      const payload = {
        name: form.name,
        format: form.format,
        config_json: configJson,
        active: form.active,
        ...(previewUrl && { preview_url: previewUrl }),
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error: err } = await supabase.from('templates').update(payload).eq('id', editingId);
        if (err) throw new Error(err.message);
        addToast('Template atualizado!', 'success');
      } else {
        const { error: err } = await supabase.from('templates').insert(payload);
        if (err) throw new Error(err.message);
        addToast('Template criado!', 'success');
      }

      handleCloseForm();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este template?')) return;
    try {
      const { error: err } = await supabase.from('templates').delete().eq('id', id);
      if (err) throw new Error(err.message);
      addToast('Template excluído.', 'success');
      fetchData();
    } catch (err) {
      addToast(`Erro ao excluir: ${err instanceof Error ? err.message : 'Desconhecido'}`, 'error');
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm';

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-800">Templates</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setError(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-600 rounded-xl transition-all">
          <Plus size={16} /> Novo template
        </button>
      </div>

      {/* Modal com componente reutilizável */}
      <Modal isOpen={showForm} onClose={handleCloseForm} title={editingId ? 'Editar template' : 'Novo template'}>
        {error && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400">
            <AlertCircle size={16} className="flex-shrink-0" /> {error}
          </div>
        )}

        <div>
          <label className="block text-sm text-dark-300 mb-1">Nome *</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Ex: Oferta Neon" />
        </div>
        <div>
          <label className="block text-sm text-dark-300 mb-1">Formato *</label>
          <div className="flex gap-2">
            {(['feed', 'story'] as const).map((f) => (
              <button key={f} onClick={() => setForm({ ...form, format: f })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-500 transition-all ${form.format === f ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' : 'bg-dark-800 text-dark-400 border border-transparent'}`}>
                {f === 'feed' ? 'Feed (1080x1080)' : 'Story (1080x1920)'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm text-dark-300 mb-1">Preview</label>
          <label className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 hover:bg-dark-700 rounded-xl cursor-pointer text-sm text-dark-300 transition-all">
            <Upload size={16} /> {previewFile ? previewFile.name : 'Escolher imagem'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setPreviewFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <div>
          <label className="block text-sm text-dark-300 mb-1">Config JSON</label>
          <textarea value={form.config_json} onChange={(e) => setForm({ ...form, config_json: e.target.value })}
            className={`${inputClass} font-mono text-xs resize-none`} rows={12} />
        </div>
        <label className="flex items-center gap-2 text-sm text-dark-300">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo
        </label>
        <button onClick={handleSave} disabled={saving || !form.name}
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-600 rounded-xl transition-all text-sm">
          {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar template'}
        </button>
      </Modal>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-square rounded-2xl bg-dark-900/60 animate-pulse" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 bg-dark-900/40 border border-dark-800/40 rounded-2xl">
          <LayoutTemplate size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400 mb-2">Nenhum template cadastrado.</p>
          <p className="text-dark-500 text-sm">Clique em &quot;Novo template&quot; para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-dark-900/60 border border-dark-800/40 rounded-2xl overflow-hidden group">
              <div className={`${tpl.format === 'story' ? 'aspect-[9/16]' : 'aspect-square'} bg-dark-800 relative`}>
                {tpl.preview_url && <img src={tpl.preview_url} alt={tpl.name} className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => handleEdit(tpl)} className="p-2 bg-dark-900/80 rounded-lg"><Pencil size={14} className="text-white" /></button>
                  <button onClick={() => handleDelete(tpl.id)} className="p-2 bg-dark-900/80 rounded-lg"><Trash2 size={14} className="text-red-400" /></button>
                </div>
              </div>
              <div className="p-3 flex items-center justify-between">
                <div>
                  <h3 className="font-600 text-sm truncate">{tpl.name}</h3>
                  <p className="text-[10px] text-dark-500 uppercase">{tpl.format}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${tpl.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-dark-700 text-dark-400'}`}>
                  {tpl.active ? 'Ativo' : 'Off'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
