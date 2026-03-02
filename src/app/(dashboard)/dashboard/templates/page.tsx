'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { LayoutTemplate, Lock, Crown, Zap, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Template } from '@/types/database';

// Hierarquia de planos: índice mais alto = plano mais avançado
const PLAN_RANK: Record<string, number> = {
  free: 0, gratis: 0,
  basico: 1, loja: 1,
  intermediario: 2, pro: 2,
  premium: 3,
  super_premium: 4,
};

// Nível mínimo de plano para acessar cada nível de template
const LEVEL_RANK: Record<string, number> = {
  basico: 1, loja: 1,
  intermediario: 2, pro: 2,
  premium: 3,
  super_premium: 4,
};

const LEVEL_META: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  basico:        { label: 'Básico',        cls: 'text-blue-300 bg-blue-900/60 border-blue-700/40',       icon: Zap },
  loja:          { label: 'Loja',           cls: 'text-blue-300 bg-blue-900/60 border-blue-700/40',       icon: Zap },
  intermediario: { label: 'Intermediário', cls: 'text-purple-300 bg-purple-900/60 border-purple-700/40', icon: Crown },
  pro:           { label: 'Pro',            cls: 'text-purple-300 bg-purple-900/60 border-purple-700/40', icon: Crown },
  premium:       { label: 'Premium',        cls: 'text-amber-300 bg-amber-900/60 border-amber-700/40',   icon: Crown },
  super_premium: { label: 'Super',          cls: 'text-yellow-200 bg-yellow-900/60 border-yellow-600/40', icon: Crown },
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filter, setFilter] = useState<'all' | 'feed' | 'story'>('all');
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<string>('free');
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      // Buscar plano do usuário
      const { data: profileData } = await supabase
        .from('profiles').select('plan').eq('id', session.user.id).single();
      if (!cancelled && profileData?.plan) setUserPlan(profileData.plan);

      // Buscar templates com campo level
      const { data } = await supabase
        .from('templates')
        .select('id, name, format, preview_url, active, created_at, level')
        .eq('active', true).order('name');

      if (!cancelled) {
        if (data) setTemplates(data as Template[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  const filtered = filter === 'all' ? templates : templates.filter((t) => t.format === filter);
  const userRank = PLAN_RANK[userPlan] ?? 0;

  function isLocked(tpl: Template): boolean {
    if (!tpl.level) return false;
    return userRank < (LEVEL_RANK[tpl.level] ?? 0);
  }

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
          {filtered.map((tpl) => {
            const locked = isLocked(tpl);
            const levelMeta = tpl.level ? LEVEL_META[tpl.level] : null;
            const LevelIcon = levelMeta?.icon ?? Sparkles;

            return locked ? (
              <div key={tpl.id} className="group relative bg-dark-900/60 border border-dark-800/40 rounded-2xl overflow-hidden cursor-not-allowed opacity-75">
                <div className={`${tpl.format === 'story' ? 'aspect-[9/16]' : 'aspect-square'} relative bg-dark-800 overflow-hidden`}>
                  {tpl.preview_url ? (
                    <Image src={tpl.preview_url} alt={tpl.name} fill className="object-cover blur-[2px] scale-105" sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <LayoutTemplate size={32} className="text-dark-600" />
                    </div>
                  )}
                  {/* Overlay de cadeado */}
                  <div className="absolute inset-0 bg-dark-950/60 flex flex-col items-center justify-center gap-2">
                    <div className="p-3 rounded-2xl bg-dark-900/80 border border-dark-700/40">
                      <Lock size={20} className="text-dark-400" />
                    </div>
                    {levelMeta && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-700 uppercase tracking-wider border ${levelMeta.cls}`}>
                        <LevelIcon size={9} />
                        {levelMeta.label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-display font-600 text-sm truncate text-dark-500">{tpl.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[11px] text-dark-600 uppercase">{tpl.format} · {tpl.format === 'feed' ? '1080×1080' : '1080×1920'}</p>
                    <Link href="/planos" className="text-[10px] font-700 text-brand-400 hover:text-brand-300 transition-colors">Upgrade →</Link>
                  </div>
                </div>
              </div>
            ) : (
              <Link key={tpl.id} href={`/generate?template=${tpl.id}`}
                className="group bg-dark-900/60 border border-dark-800/40 rounded-2xl overflow-hidden hover:border-brand-500/30 transition-all">
                <div className={`${tpl.format === 'story' ? 'aspect-[9/16]' : 'aspect-square'} relative bg-dark-800 overflow-hidden`}>
                  {tpl.preview_url ? (
                    <Image src={tpl.preview_url} alt={tpl.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <LayoutTemplate size={32} className="text-dark-600" />
                    </div>
                  )}
                  {/* Badge de nível (acessível) */}
                  {levelMeta && (
                    <div className="absolute top-2 right-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-700 uppercase tracking-wider border ${levelMeta.cls}`}>
                        <LevelIcon size={9} />
                        {levelMeta.label}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-display font-600 text-sm truncate">{tpl.name}</h3>
                  <p className="text-[11px] text-dark-500 mt-0.5 uppercase">{tpl.format} · {tpl.format === 'feed' ? '1080×1080' : '1080×1920'}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
