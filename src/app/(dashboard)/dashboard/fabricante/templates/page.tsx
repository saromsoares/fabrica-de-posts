'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Plus, Pencil, Trash2, LayoutTemplate, X, Check, Upload, Image as ImageIcon, Eye } from 'lucide-react';
import { validateTemplate } from '@/lib/validators/image-validator';
import type { Template, Factory } from '@/types/database';

export default function FabricanteTemplatesPage() {
  const supabase = createClient();
  const [factory, setFactory] = useState<Factory | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formFormat, setFormFormat] = useState<'feed' | 'story'>('feed');
  const [formDescription, setFormDescription] = useState('');
  const [formLayout, setFormLayout] = useState('promo_highlight');
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview modal
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const LAYOUTS = {
    feed: [
      { value: 'promo_highlight', label: 'Promoção Destaque', emoji: '🔥' },
      { value: 'launch_elegant', label: 'Lançamento Elegante', emoji: '✨' },
      { value: 'before_after', label: 'Comparativo', emoji: '↔️' },
      { value: 'info_carousel', label: 'Carrossel Informativo', emoji: '📊' },
      { value: 'testimonial', label: 'Depoimento Cliente', emoji: '⭐' },
    ],
    story: [
      { value: 'flash_sale_story', label: 'Oferta Relâmpago', emoji: '⚡' },
      { value: 'new_arrival_story', label: 'Novidade', emoji: '🆕' },
      { value: 'poll_story', label: 'Enquete/Interação', emoji: '📊' },
      { value: 'behind_scenes_story', label: 'Bastidores', emoji: '📸' },
      { value: 'quick_tip_story', label: 'Dica Rápida', emoji: '💡' },
    ],
  };

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: factoryData } = await supabase
      .from('factories')
      .select('id, name, logo_url')
      .eq('user_id', user.id)
      .single();

    if (!factoryData) { setLoading(false); return; }
    setFactory(factoryData as Factory);

    const { data: tpls } = await supabase
      .from('templates')
      .select('*')
      .eq('factory_id', factoryData.id)
      .order('created_at', { ascending: false });

    if (tpls) setTemplates(tpls as Template[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 15MB.');
      return;
    }

    const validation = await validateTemplate(file);
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }

    // Auto-detectar formato pelo tamanho da imagem
    if (validation.format) {
      setFormFormat(validation.format);
    }

    setFormImageFile(file);
    setFormImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const handleSave = async () => {
    if (!formName.trim() || !factory) return;
    setSaving(true);
    setError('');

    let imageUrl: string | null = null;

    // Upload da imagem se houver
    if (formImageFile) {
      const ext = formImageFile.name.split('.').pop();
      const path = `templates/${factory.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('templates')
        .upload(path, formImageFile, { contentType: formImageFile.type });

      if (uploadErr) {
        // Fallback: tentar bucket 'assets'
        const { error: uploadErr2 } = await supabase.storage
          .from('assets')
          .upload(path, formImageFile, { contentType: formImageFile.type });
        if (uploadErr2) {
          setError(`Erro no upload: ${uploadErr2.message}`);
          setSaving(false);
          return;
        }
        const { data: urlData } = supabase.storage.from('assets').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      } else {
        const { data: urlData } = supabase.storage.from('templates').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    const dimensions = formFormat === 'feed'
      ? { width: 1080, height: 1080 }
      : { width: 1080, height: 1920 };

    const productZone = formFormat === 'feed'
      ? { x: 190, y: 80, width: 700, height: 700, z_index: 1 }
      : { x: 140, y: 250, width: 800, height: 800, z_index: 1 };

    const logoZone = formFormat === 'feed'
      ? { x: 880, y: 880, width: 150, height: 150, z_index: 2 }
      : { x: 465, y: 1780, width: 150, height: 100, z_index: 2 };

    const configJson = {
      layout: formLayout,
      description: formDescription || formName,
    };

    if (editingId) {
      const updateData: Record<string, unknown> = {
        name: formName.trim(),
        format: formFormat,
        config_json: configJson,
        dimensions,
        product_zone: productZone,
        logo_zone: logoZone,
      };
      if (imageUrl) updateData.image_url = imageUrl;

      const { error: err } = await supabase
        .from('templates')
        .update(updateData)
        .eq('id', editingId);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase
        .from('templates')
        .insert({
          name: formName.trim(),
          format: formFormat,
          factory_id: factory.id,
          image_url: imageUrl,
          config_json: configJson,
          dimensions,
          product_zone: productZone,
          logo_zone: logoZone,
          active: true,
        });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    resetForm();
    setSaving(false);
    await loadData();
  };

  const handleEdit = (tpl: Template) => {
    setEditingId(tpl.id);
    setFormName(tpl.name);
    setFormFormat(tpl.format);
    setFormDescription((tpl.config_json as Record<string, string>)?.description || '');
    setFormLayout((tpl.config_json as Record<string, string>)?.layout || 'promo_highlight');
    setFormImagePreview(tpl.image_url);
    setFormImageFile(null);
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este template?')) return;
    await supabase.from('templates').delete().eq('id', id);
    await loadData();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName('');
    setFormFormat('feed');
    setFormDescription('');
    setFormLayout('promo_highlight');
    setFormImageFile(null);
    setFormImagePreview(null);
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
        <LayoutTemplate size={48} className="mx-auto text-dark-700 mb-4" />
        <p className="text-dark-400">Nenhuma fábrica associada à sua conta.</p>
      </div>
    );
  }

  const feedTemplates = templates.filter(t => t.format === 'feed');
  const storyTemplates = templates.filter(t => t.format === 'story');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-800 tracking-tight">Templates</h1>
          <p className="text-dark-400 mt-1">Gerencie os templates de post da {factory.name}.</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-700 transition-colors"
        >
          <Plus size={16} /> Novo Template
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 space-y-5">
          <h3 className="font-700">{editingId ? 'Editar Template' : 'Novo Template'}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-700 text-dark-400 mb-1.5 block">Nome</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Promoção Black Friday"
                className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-700 text-dark-400 mb-1.5 block">Formato</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormFormat('feed')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-700 transition-colors border ${
                    formFormat === 'feed' ? 'bg-brand-600/10 border-brand-500/30 text-brand-400' : 'bg-dark-800 border-dark-700 text-dark-400'
                  }`}
                >
                  Feed (1:1)
                </button>
                <button
                  onClick={() => setFormFormat('story')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-700 transition-colors border ${
                    formFormat === 'story' ? 'bg-brand-600/10 border-brand-500/30 text-brand-400' : 'bg-dark-800 border-dark-700 text-dark-400'
                  }`}
                >
                  Story (9:16)
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-700 text-dark-400 mb-1.5 block">Descrição</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Descrição curta do template..."
              className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50"
            />
          </div>

          <div>
            <label className="text-xs font-700 text-dark-400 mb-1.5 block">Layout</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LAYOUTS[formFormat].map((l) => (
                <button
                  key={l.value}
                  onClick={() => setFormLayout(l.value)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-700 transition-colors border text-left ${
                    formLayout === l.value ? 'bg-brand-600/10 border-brand-500/30 text-brand-400' : 'bg-dark-800 border-dark-700 text-dark-400 hover:border-dark-600'
                  }`}
                >
                  {l.emoji} {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Upload imagem */}
          <div>
            <label className="text-xs font-700 text-dark-400 mb-1.5 block">Imagem de Fundo (opcional)</label>
            <div className="flex items-center gap-4">
              {formImagePreview ? (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-dark-700">
                  <img src={formImagePreview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setFormImageFile(null); setFormImagePreview(null); }}
                    className="absolute top-1 right-1 w-5 h-5 bg-dark-900/80 rounded-full flex items-center justify-center text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-dark-700 flex flex-col items-center justify-center text-dark-500 hover:border-brand-500/30 hover:text-brand-400 transition-colors"
                >
                  <Upload size={20} />
                  <span className="text-[10px] mt-1">Upload</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="text-xs text-dark-500">
                <p>PNG ou JPEG, 1080x1080 (Feed) ou 1080x1920 (Story)</p>
                <p>Máximo 15MB</p>
              </div>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Salvar
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-1.5 bg-dark-800 hover:bg-dark-700 text-dark-300 px-5 py-2.5 rounded-xl text-sm font-700 transition-colors"
            >
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Templates Feed */}
      <div>
        <h2 className="text-lg font-700 mb-4">Feed ({feedTemplates.length})</h2>
        {feedTemplates.length === 0 ? (
          <p className="text-dark-500 text-sm">Nenhum template de feed criado.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {feedTemplates.map((tpl) => (
              <TemplateCard key={tpl.id} template={tpl} onEdit={handleEdit} onDelete={handleDelete} onPreview={setPreviewTemplate} />
            ))}
          </div>
        )}
      </div>

      {/* Templates Story */}
      <div>
        <h2 className="text-lg font-700 mb-4">Story ({storyTemplates.length})</h2>
        {storyTemplates.length === 0 ? (
          <p className="text-dark-500 text-sm">Nenhum template de story criado.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            {storyTemplates.map((tpl) => (
              <TemplateCard key={tpl.id} template={tpl} onEdit={handleEdit} onDelete={handleDelete} onPreview={setPreviewTemplate} />
            ))}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewTemplate(null)}>
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-700">{previewTemplate.name}</h3>
              <button onClick={() => setPreviewTemplate(null)} className="text-dark-500 hover:text-white"><X size={20} /></button>
            </div>
            {previewTemplate.image_url ? (
              <img src={previewTemplate.image_url} alt="" className="w-full rounded-xl" />
            ) : (
              <div className="aspect-square bg-dark-800 rounded-xl flex items-center justify-center">
                <ImageIcon size={48} className="text-dark-600" />
              </div>
            )}
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="text-dark-500">Formato:</span> <span className="text-white font-700">{previewTemplate.format}</span></p>
              <p><span className="text-dark-500">Layout:</span> <span className="text-white font-700">{(previewTemplate.config_json as Record<string, string>)?.layout || '—'}</span></p>
              <p><span className="text-dark-500">Descrição:</span> <span className="text-white">{(previewTemplate.config_json as Record<string, string>)?.description || '—'}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component
function TemplateCard({
  template,
  onEdit,
  onDelete,
  onPreview,
}: {
  template: Template;
  onEdit: (t: Template) => void;
  onDelete: (id: string) => void;
  onPreview: (t: Template) => void;
}) {
  const layout = (template.config_json as Record<string, string>)?.layout || '';
  const desc = (template.config_json as Record<string, string>)?.description || template.name;

  return (
    <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden group hover:border-dark-700 transition-colors">
      {/* Preview */}
      <div
        className={`bg-dark-800 flex items-center justify-center cursor-pointer relative ${
          template.format === 'feed' ? 'aspect-square' : 'aspect-[9/16]'
        }`}
        onClick={() => onPreview(template)}
      >
        {template.image_url ? (
          <img src={template.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <LayoutTemplate size={32} className="text-dark-600" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <Eye size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-700 text-white truncate">{template.name}</p>
        <p className="text-[10px] text-dark-500 truncate mt-0.5">{desc}</p>
        <div className="flex items-center gap-1 mt-2">
          <button onClick={() => onEdit(template)} className="p-1.5 text-dark-500 hover:text-brand-400 rounded-lg transition-colors">
            <Pencil size={12} />
          </button>
          <button onClick={() => onDelete(template.id)} className="p-1.5 text-dark-500 hover:text-red-400 rounded-lg transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
