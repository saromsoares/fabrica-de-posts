'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import {
  Clock, Copy, Check, Trash2, Sparkles,
  Filter, Image as ImageIcon, AlertTriangle, RefreshCw,
  Eye, X,
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
        <div className="text-center py-16">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {generations.map((gen) => (
            <div
              key={gen.id}
              className="group bg-dark-900/60 border border-dark-800/40 rounded-2xl overflow-hidden hover:border-dark-700/60 transition-all"
            >
              {/* Thumbnail */}
              <div
                className="relative aspect-square bg-dark-950 overflow-hidden cursor-pointer"
                onClick={() => setPreviewGen(gen)}
              >
                {gen.image_url ? (
                  <img
                    src={gen.image_url}
                    alt={gen.product?.name || 'Arte gerada'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={32} className="text-dark-700" />
                  </div>
                )}

                {/* Overlay com ações rápidas */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                    <Eye size={20} className="text-white" />
                  </div>
                </div>

                {/* Badge formato */}
                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-700 uppercase tracking-wider ${
                  gen.format === 'story'
                    ? 'bg-purple-500/80 text-white'
                    : 'bg-blue-500/80 text-white'
                }`}>
                  {gen.format}
                </span>

                {/* Data */}
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-500 bg-black/50 text-white/80 backdrop-blur-sm">
                  {fmtDateShort(gen.created_at)}
                </span>
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                {/* Produto */}
                <div className="flex items-center gap-2">
                  {gen.product?.image_url && (
                    <img
                      src={gen.product.image_url}
                      alt=""
                      className="w-6 h-6 rounded-md object-cover flex-shrink-0"
                    />
                  )}
                  <p className="text-xs text-white font-600 truncate flex-1">
                    {gen.product?.name || 'Produto removido'}
                  </p>
                </div>

                {/* Preço/condição */}
                {gen.fields_data?.price && (
                  <p className="text-xs text-brand-400 font-700">
                    {gen.fields_data.price}
                    {gen.fields_data.condition && (
                      <span className="text-dark-400 font-500 ml-1.5">{gen.fields_data.condition}</span>
                    )}
                  </p>
                )}

                {/* Legenda (truncada) */}
                {gen.caption && (
                  <p className="text-[11px] text-dark-400 line-clamp-2 leading-relaxed">
                    {gen.caption}
                  </p>
                )}

                {/* Ações */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-dark-800/30">
                  {/* Download + WhatsApp (compact) */}
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
                      className={`p-2 rounded-lg text-xs transition-all ${
                        copiedId === gen.id
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-dark-800/50 text-dark-400 hover:text-white hover:bg-dark-800'
                      }`}
                      title="Copiar legenda"
                    >
                      {copiedId === gen.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  )}

                  {/* Criar variação */}
                  {gen.product_id && (
                    <Link
                      href={`/dashboard/estudio/${gen.product_id}`}
                      className="p-2 rounded-lg bg-brand-600/10 text-brand-400 hover:bg-brand-600/20 transition-all"
                      title="Criar variação"
                    >
                      <Sparkles size={14} />
                    </Link>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Deletar */}
                  <button
                    onClick={() => setDeleteId(gen.id)}
                    className="p-2 rounded-lg text-dark-600 hover:text-red-400 hover:bg-red-600/10 transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════ MODAL: Preview Grande ══════ */}
      {previewGen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewGen(null)}
        >
          <div
            className="relative bg-dark-900 border border-dark-800/60 rounded-2xl overflow-hidden max-w-lg w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fechar */}
            <button
              onClick={() => setPreviewGen(null)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/60 text-white/80 hover:bg-black/80 hover:text-white transition-all"
            >
              <X size={16} />
            </button>

            {/* Imagem */}
            <div className="bg-dark-950 flex-shrink-0">
              {previewGen.image_url ? (
                <img
                  src={previewGen.image_url}
                  alt=""
                  className="w-full object-contain max-h-[50vh]"
                />
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <ImageIcon size={48} className="text-dark-700" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-700 uppercase ${
                  previewGen.format === 'story' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {previewGen.format}
                </span>
                <span className="text-xs text-dark-500">{fmtDate(previewGen.created_at)}</span>
              </div>

              <h3 className="text-sm font-700 text-white">
                {previewGen.product?.name || 'Produto'}
              </h3>

              {previewGen.fields_data?.price && (
                <p className="text-brand-400 font-800 text-lg">
                  {previewGen.fields_data.price}
                  {previewGen.fields_data.condition && (
                    <span className="text-dark-400 font-500 text-sm ml-2">{previewGen.fields_data.condition}</span>
                  )}
                </p>
              )}

              {previewGen.caption && (
                <div className="bg-dark-800/50 rounded-xl p-3">
                  <p className="text-xs text-dark-300 leading-relaxed whitespace-pre-wrap">
                    {previewGen.caption}
                  </p>
                  <button
                    onClick={() => handleCopy(previewGen.id, previewGen.caption!)}
                    className={`mt-2 inline-flex items-center gap-1.5 text-[10px] font-600 transition-all ${
                      copiedId === previewGen.id ? 'text-green-400' : 'text-dark-500 hover:text-white'
                    }`}
                  >
                    {copiedId === previewGen.id ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === previewGen.id ? 'Copiado!' : 'Copiar legenda'}
                  </button>
                </div>
              )}

              {/* Share Buttons */}
              {previewGen.image_url && (
                <ShareButtons
                  imageUrl={previewGen.image_url}
                  caption={previewGen.caption || undefined}
                  productName={previewGen.product?.name || undefined}
                />
              )}

              {/* Criar variação */}
              {previewGen.product_id && (
                <Link
                  href={`/dashboard/estudio/${previewGen.product_id}`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-600 hover:bg-brand-700 transition-all"
                  onClick={() => setPreviewGen(null)}
                >
                  <Sparkles size={16} /> Criar Nova Variação
                </Link>
              )}

              {/* Deletar */}
              <button
                onClick={() => { setPreviewGen(null); setDeleteId(previewGen.id); }}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 text-dark-500 hover:text-red-400 text-xs font-500 transition-all"
              >
                <Trash2 size={14} /> Excluir esta arte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ MODAL: Confirmação de Delete ══════ */}
      {deleteId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="bg-dark-900 border border-dark-800/60 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-600/20">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <h3 className="font-700 text-white">Excluir arte?</h3>
            </div>
            <p className="text-sm text-dark-400 mb-6">
              Essa ação não pode ser desfeita. A imagem e a legenda serão removidas permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 bg-dark-800 text-dark-300 rounded-xl text-sm font-500 hover:bg-dark-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-600 hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
