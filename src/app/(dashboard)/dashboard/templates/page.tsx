'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { LayoutTemplate } from 'lucide-react';
import Link from 'next/link';
import type { Template } from '@/types/database';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filter, setFilter] = useState<'all' | 'feed' | 'story'>('all');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('templates').select('id, name, format, preview_url, active, created_at').eq('active', true).order('name');
      if (data) setTemplates(data as Template[]);
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = filter === 'all' ? templates : templates.filter((t) => t.format === filter);

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-800 tracking-tight">Templates</h1>
        <p className="text-dark-400 mt-1">Escolha um layout para sua arte.</p>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'feed', 'story'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-500 transition-all capitalize ${filter === f ? 'bg-brand-600 text-white' : 'bg-dark-800/60 text-dark-300 hover:bg-dark-800'}`}>
            {f === 'all' ? 'Todos' : f === 'feed' ? 'Feed (1080×1080)' : 'Story (1080×1920)'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-square rounded-2xl bg-dark-900/60 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <LayoutTemplate size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400">Nenhum template disponível.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((tpl) => (
            <Link key={tpl.id} href={`/generate?template=${tpl.id}`}
              className="group bg-dark-900/60 border border-dark-800/40 rounded-2xl overflow-hidden hover:border-brand-500/30 transition-all">
              <div className={`${tpl.format === 'story' ? 'aspect-[9/16]' : 'aspect-square'} bg-dark-800 flex items-center justify-center overflow-hidden`}>
                {tpl.preview_url ? (
                  <img src={tpl.preview_url} alt={tpl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <LayoutTemplate size={32} className="text-dark-600" />
                )}
              </div>
              <div className="p-3">
                <h3 className="font-display font-600 text-sm truncate">{tpl.name}</h3>
                <p className="text-[11px] text-dark-500 mt-0.5 uppercase">{tpl.format} · {tpl.format === 'feed' ? '1080×1080' : '1080×1920'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
