'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import {
  Clock, Copy, Check, Trash2, Sparkles,
  Filter, Image as ImageIcon, AlertTriangle, RefreshCw,
  Eye, X, Zap, Pencil, Save, Loader2,
} from 'lucide-react';
import ShareButtons from '@/components/ShareButtons';

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */

interface Generation {
  id: string;
  user_id: string;
  product_id: string | null;
  template_id: string | null;
  image_url: string | null;
  caption: string | null;
  fields_data: { price?: string; condition?: string; cta?: string } | null;
  format: 'feed' | 'story';
  created_at: string;
  product?: { id: string; name: string; image_url: string | null } | null;
}

type FilterFormat = 'all' | 'feed' | 'story';

/* ═══════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════ */

export default function HistoricoPage() {
  const supabase = createClient();

  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterFormat>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewGen, setPreviewGen] = useState<Generation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Caption editing state
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editCaptionText, setEditCaptionText] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);

  /* ── Fetch generations ── */
  const fetchGenerations = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('generations')
      .select('id, user_id, product_id, template_id, image_url, caption, fields_data, format, created_at, product:products(id, name, image_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('format', filter);
    }

    const { data, error } = await query;
    if (!error && data) {
      setGenerations(data as unknown as Generation[]);
    }
    setLoading(false);
  }, [supabase, filter]);

  useEffect(() => { fetchGenerations(); }, [fetchGenerations]);

  /* ── Delete ── */
  const handleDelete = async (id: string) => {
    setDeleting(true);
    const { error } = await supabase.from('generations').delete().eq('id', id);
    if (!error) {
      setGenerations(prev => prev.filter(g => g.id !== id));
      if (previewGen?.id === id) setPreviewGen(null);
    }
    setDeleteId(null);
    setDeleting(false);
  };

  /* ── Copy caption ── */
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /* ── Edit caption ── */
  const startEditCaption = (gen: Generation) => {
    setEditingCaptionId(gen.id);
    setEditCaptionText(gen.caption || '');
  };

  const cancelEditCaption = () => {
    setEditingCaptionId(null);
    setEditCaptionText('');
  };

  const saveCaption = async (genId: string) => {
    setSavingCaption(true);

    const { error } = await supabase
      .from('generations')
      .update({ caption: editCaptionText, updated_at: new Date().toISOString() })
      .eq('id', genId);

    if (!error) {
      // Update local state
      setGenerations((prev) =>
        prev.map((g) =>
          g.id === genId ? { ...g, caption: editCaptionText } : g
        )
      );
      // Update preview if open
      if (previewGen?.id === genId) {
        setPreviewGen((prev) => prev ? { ...prev, caption: editCaptionText } : null);
      }
    }

    setEditingCaptionId(null);
    setEditCaptionText('');
    setSavingCaption(false);
  };

  /* ── Format date ── */
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const fmtDateShort = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-800 tracking-tight">
            <Clock className="inline -mt-1 mr-2 text-brand-400" size={24} />
            Minhas Artes
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            {generations.length} arte{generations.length !== 1 ? 's' : ''} gerada{generations.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filtro por formato */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-dark-500" />
          {(['all', 'feed', 'story'] as FilterFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-600 transition-all ${
                filter === f
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'bg-dark-800/50 text-dark-400 hover:text-white hover:bg-dark-800'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'feed' ? 'Feed' : 'Story'}
            </button>
          ))}

          <button
            onClick={fetchGenerations}
            className="p-1.5 rounded-lg bg-dark-800/50 text-dark-400 hover:text-white hover:bg-dark-800 transition-all ml-2"
            title="Atualizar"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!loading && generations.length === 0 && (
        <div className="text-center py-16 bg-dark-900/40 border border-dark-800/30 rounded-3xl">
          <ImageIcon size={48} className="mx-auto text-dark-600 mb-4" />
          <h2 className="text-lg font-600 text-dark-300 mb-2">Nenhuma arte encontrada</h2>
          <p className="text-dark-500 text-sm mb-6">
            {filter !== 'all'
              ? `Sem artes no formato "${filter}". Tente mudar o filtro.`
              : 'Acesse um produto e gere sua primeira arte no Estúdio!'}
          </p>
          <Link
            href="/dashboard/produtos"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-600 hover:bg-brand-700 transition-all"
          >
            <Sparkles size={16} /> Ir para Produtos
          </Link>
        </div>
      )}

      {/* Grid de artes */}
      {!loading && generations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {generations.map((gen) => (
            <div
              key={gen.id}
              className="group bg-dark-900/60 border border-dark-800/40 rounded-3xl overflow-hidden hover:border-brand-500/30 hover:shadow-[0_0_40px_rgba(224,96,78,0.1)] transition-all duration-500"
            >
              {/* Thumbnail */}
              <div
                className="relative aspect-square bg-white flex items-center justify-center p-8 cursor-pointer group-hover:bg-white/95 transition-colors"
                onClick={() => setPreviewGen(gen)}
              >
                {gen.image_url ? (
                  <img
                    src={gen.image_url}
                    alt={gen.product?.name || 'Arte gerada'}
                    className="max-w-[85%] max-h-[85%] object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-md"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-dark-950">
                    <ImageIcon size={32} className="text-dark-700" />
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="p-3 rounded-full bg-dark-900/80 backdrop-blur-md border border-white/10 shadow-2xl">
                    <Eye size={24} className="text-white" />
                  </div>
                </div>

                {/* Badge formato */}
                <span className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-[9px] font-800 uppercase tracking-wider border border-white/10 ${
                  gen.format === 'story'
                    ? 'bg-purple-600/80 text-white'
                    : 'bg-blue-600/80 text-white'
                }`}>
                  {gen.format}
                </span>

                {/* Data */}
                <span className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[9px] font-700 bg-dark-900/60 text-white/80 backdrop-blur-md border border-white/10">
                  {fmtDateShort(gen.created_at)}
                </span>
              </div>

              {/* Info */}
              <div className="p-4 space-y-3 border-t border-dark-800/30">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-white font-800 truncate flex-1">
                    {gen.product?.name || 'Produto removido'}
                  </p>
                </div>

                {gen.fields_data?.price && (
                  <p className="text-xs text-brand-400 font-800">
                    {gen.fields_data.price}
                    {gen.fields_data.condition && (
                      <span className="text-dark-400 font-600 ml-2 text-[10px] uppercase tracking-wider">{gen.fields_data.condition}</span>
                    )}
                  </p>
                )}

                {/* Ações */}
                <div className="flex items-center gap-2 pt-2 border-t border-dark-800/30">
                  {gen.image_url && (
                    <ShareButtons
                      imageUrl={gen.image_url}
                      caption={gen.caption || undefined}
                      productName={gen.product?.name || undefined}
                      compact
                    />
                  )}

                  {/* Copiar legenda */}
                  {gen.caption && (
                    <button
                      onClick={() => handleCopy(gen.id, gen.caption!)}
                      className={`p-2.5 rounded-xl text-xs transition-all border ${
                        copiedId === gen.id
                          ? 'bg-green-600/20 border-green-500/30 text-green-400'
                          : 'bg-dark-800/40 border-dark-700/30 text-dark-400 hover:text-white hover:border-dark-600'
                      }`}
                      title="Copiar legenda"
                    >
                      {copiedId === gen.id ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  )}

                  {/* Editar legenda */}
                  <button
                    onClick={() => startEditCaption(gen)}
                    className="p-2.5 rounded-xl bg-dark-800/40 border border-dark-700/30 text-dark-400 hover:text-blue-400 hover:border-blue-500/30 transition-all"
                    title="Editar legenda"
                  >
                    <Pencil size={16} />
                  </button>

                  {/* Deletar */}
                  <button
                    onClick={() => setDeleteId(gen.id)}
                    className="p-2.5 rounded-xl bg-dark-800/40 border border-dark-700/30 text-dark-400 hover:text-red-400 hover:border-red-500/30 transition-all ml-auto"
                    title="Deletar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Preview */}
      {previewGen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
          <div className="absolute inset-0 bg-dark-950/90 backdrop-blur-xl" onClick={() => { setPreviewGen(null); cancelEditCaption(); }} />
          
          <div className="relative w-full max-w-5xl bg-dark-900 border border-dark-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row max-h-[90vh]">
            {/* Imagem */}
            <div className="lg:flex-1 bg-white flex items-center justify-center p-8 sm:p-12 relative">
              <img
                src={previewGen.image_url!}
                alt=""
                className="max-w-full max-h-full object-contain drop-shadow-2xl"
              />
              <button
                onClick={() => { setPreviewGen(null); cancelEditCaption(); }}
                className="absolute top-4 left-4 p-2 rounded-full bg-dark-900/80 text-white hover:bg-dark-800 transition-all lg:hidden"
              >
                <X size={20} />
              </button>
            </div>

            {/* Info */}
            <div className="w-full lg:w-[400px] p-6 sm:p-8 flex flex-col border-t lg:border-t-0 lg:border-l border-dark-800 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl font-800 text-white">Detalhes da Arte</h3>
                <button
                  onClick={() => { setPreviewGen(null); cancelEditCaption(); }}
                  className="p-2 rounded-full bg-dark-800 text-dark-400 hover:text-white transition-all hidden lg:block"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 flex-1">
                <div>
                  <p className="text-[10px] font-800 uppercase tracking-widest text-dark-500 mb-1">Produto</p>
                  <p className="text-white font-700">{previewGen.product?.name || 'Produto removido'}</p>
                </div>

                <div className="flex gap-8">
                  <div>
                    <p className="text-[10px] font-800 uppercase tracking-widest text-dark-500 mb-1">Formato</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-800 uppercase tracking-wider ${
                      previewGen.format === 'story' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                    }`}>
                      {previewGen.format}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-800 uppercase tracking-widest text-dark-500 mb-1">Data</p>
                    <p className="text-dark-200 text-xs font-600">{fmtDate(previewGen.created_at)}</p>
                  </div>
                </div>

                {/* Caption section with edit */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-800 uppercase tracking-widest text-dark-500">Legenda</p>
                    <div className="flex items-center gap-2">
                      {editingCaptionId === previewGen.id ? (
                        <>
                          <button
                            onClick={cancelEditCaption}
                            className="text-[10px] font-700 text-dark-400 hover:text-white flex items-center gap-1"
                          >
                            <X size={10} /> Cancelar
                          </button>
                          <button
                            onClick={() => saveCaption(previewGen.id)}
                            disabled={savingCaption}
                            className="text-[10px] font-700 text-green-400 hover:text-green-300 flex items-center gap-1 disabled:opacity-50"
                          >
                            {savingCaption ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                            Salvar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditCaption(previewGen)}
                            className="text-[10px] font-700 text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <Pencil size={10} /> Editar
                          </button>
                          {previewGen.caption && (
                            <button
                              onClick={() => handleCopy(previewGen.id, previewGen.caption!)}
                              className="text-[10px] font-700 text-brand-400 hover:text-brand-300 flex items-center gap-1"
                            >
                              {copiedId === previewGen.id ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {editingCaptionId === previewGen.id ? (
                    <textarea
                      value={editCaptionText}
                      onChange={(e) => setEditCaptionText(e.target.value)}
                      rows={6}
                      className="w-full p-4 bg-dark-950/50 border border-blue-500/30 rounded-2xl text-sm text-dark-200 leading-relaxed resize-none focus:outline-none focus:border-blue-500/50 transition-all"
                      placeholder="Digite a legenda..."
                      autoFocus
                    />
                  ) : (
                    <div className="p-4 bg-dark-950/50 border border-dark-800 rounded-2xl">
                      <p className="text-sm text-dark-300 leading-relaxed whitespace-pre-wrap">
                        {previewGen.caption || 'Sem legenda. Clique em "Editar" para adicionar.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-dark-800 space-y-3">
                <ShareButtons
                  imageUrl={previewGen.image_url!}
                  caption={previewGen.caption || undefined}
                  productName={previewGen.product?.name || undefined}
                />
                
                {previewGen.product_id && (
                  <Link
                    href={`/dashboard/estudio/${previewGen.product_id}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-dark-800 hover:bg-dark-700 text-white text-sm font-700 rounded-2xl transition-all"
                  >
                    <Zap size={16} className="text-brand-400" /> Criar Variação
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Legenda (standalone - from grid) */}
      {editingCaptionId && !previewGen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={cancelEditCaption} />
          <div className="relative w-full max-w-lg bg-dark-900 border border-dark-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-800 text-white flex items-center gap-2">
                <Pencil size={18} className="text-blue-400" />
                Editar Legenda
              </h3>
              <button onClick={cancelEditCaption} className="p-2 rounded-full bg-dark-800 text-dark-400 hover:text-white transition-all">
                <X size={18} />
              </button>
            </div>

            <textarea
              value={editCaptionText}
              onChange={(e) => setEditCaptionText(e.target.value)}
              rows={8}
              className="w-full p-4 bg-dark-950/50 border border-dark-800/50 rounded-2xl text-sm text-dark-200 leading-relaxed resize-none focus:outline-none focus:border-blue-500/50 transition-all mb-4"
              placeholder="Digite a legenda..."
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={cancelEditCaption}
                className="flex-1 px-4 py-2.5 bg-dark-800 hover:bg-dark-700 text-white text-sm font-700 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => saveCaption(editingCaptionId)}
                disabled={savingCaption}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-700 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingCaption ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Delete */}
      {deleteId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative w-full max-w-sm bg-dark-900 border border-dark-800 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h3 className="text-lg font-800 text-white mb-2">Excluir Arte?</h3>
            <p className="text-dark-400 text-sm mb-6">
              Esta ação não pode ser desfeita. A imagem será removida permanentemente do seu histórico.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 bg-dark-800 hover:bg-dark-700 text-white text-sm font-700 rounded-xl transition-all"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-700 rounded-xl transition-all flex items-center justify-center gap-2"
                disabled={deleting}
              >
                {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
