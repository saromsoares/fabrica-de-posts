'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Download, Trash2, Clock, Copy, Check } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import type { Generation } from '@/types/database';

export default function HistoryPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('generations')
        .select('*, product:products(name, image_url), template:templates(name, format)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setGenerations(data as Generation[]);
      setLoading(false);
    })();
  }, [supabase]);

  const handleDelete = async (id: string) => {
    await supabase.from('generations').delete().eq('id', id);
    setGenerations(generations.filter((g) => g.id !== id));
  };

  const handleCopy = (id: string, caption: string) => {
    navigator.clipboard.writeText(caption);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-800 tracking-tight">Histórico</h1>
        <p className="text-dark-400 mt-1">Suas artes geradas anteriormente.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-dark-900/60 animate-pulse" />)}
        </div>
      ) : generations.length === 0 ? (
        <div className="text-center py-20">
          <Clock size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400">Nenhuma arte gerada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {generations.map((gen) => (
            <div key={gen.id} className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-4 flex gap-4 group">
              {/* Thumbnail */}
              <div className="w-20 h-20 rounded-xl bg-dark-800 flex-shrink-0 overflow-hidden">
                {gen.image_url ? (
                  <img src={gen.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Clock size={20} className="text-dark-600" /></div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-600 text-sm truncate">{(gen.product as {name?: string})?.name || 'Produto'}</h3>
                <p className="text-[11px] text-dark-500 mt-0.5">
                  {(gen.template as {name?: string})?.name || 'Template'} · {gen.format} · {timeAgo(gen.created_at)}
                </p>
                {gen.caption && <p className="text-xs text-dark-400 mt-1 line-clamp-2">{gen.caption}</p>}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {gen.image_url && (
                  <a href={gen.image_url} download className="p-2 rounded-lg hover:bg-dark-800 transition-colors">
                    <Download size={14} className="text-dark-400" />
                  </a>
                )}
                {gen.caption && (
                  <button onClick={() => handleCopy(gen.id, gen.caption!)} className="p-2 rounded-lg hover:bg-dark-800 transition-colors">
                    {copiedId === gen.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-dark-400" />}
                  </button>
                )}
                <button onClick={() => handleDelete(gen.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                  <Trash2 size={14} className="text-dark-500 hover:text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
