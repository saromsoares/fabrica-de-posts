'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import {
  CheckCircle2, Circle, ChevronRight, User,
} from 'lucide-react';

/* ═══════════════════════════════════════
   PROFILE COMPLETION — Barra de progresso
   Calcula % de preenchimento do perfil e
   mostra os itens pendentes com links diretos.
   ═══════════════════════════════════════ */

interface CompletionItem {
  key: string;
  label: string;
  done: boolean;
  href: string;
}

export default function ProfileCompletion() {
  const supabase = createClient();
  const [items, setItems] = useState<CompletionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) { setLoading(false); return; }

      const [{ data: profile }, { data: brandKit }] = await Promise.all([
        supabase.from('profiles').select('full_name, store_type, location_city, location_state, store_voice, avatar_url').eq('id', session.user.id).single(),
        supabase.from('brand_kits').select('store_name, logo_url, primary_color, instagram_handle, whatsapp').eq('user_id', session.user.id).single(),
      ]);

      if (cancelled) return;

      const checks: CompletionItem[] = [
        { key: 'name', label: 'Nome da loja', done: !!(brandKit?.store_name?.trim()), href: '/dashboard/brand-kit' },
        { key: 'logo', label: 'Logo da loja', done: !!(brandKit?.logo_url), href: '/dashboard/brand-kit' },
        { key: 'colors', label: 'Cores da marca', done: !!(brandKit?.primary_color && brandKit.primary_color !== '#e85d75'), href: '/dashboard/brand-kit' },
        { key: 'voice', label: 'Tom de comunicação', done: !!(profile?.store_voice), href: '/dashboard/brand-kit' },
        { key: 'instagram', label: 'Instagram', done: !!(brandKit?.instagram_handle?.trim()), href: '/dashboard/brand-kit' },
        { key: 'whatsapp', label: 'WhatsApp', done: !!(brandKit?.whatsapp?.trim()), href: '/dashboard/brand-kit' },
        { key: 'location', label: 'Localização', done: !!(profile?.location_city?.trim()), href: '/dashboard/conta' },
        { key: 'avatar', label: 'Foto de perfil', done: !!(profile?.avatar_url), href: '/dashboard/conta' },
      ];

      setItems(checks);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [supabase]);

  if (loading || dismissed) return null;

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const percentage = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  // Se 100% completo, não mostra nada
  if (percentage === 100) return null;

  const pending = items.filter((i) => !i.done);

  return (
    <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-5 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <User size={16} className="text-brand-400" />
          <span className="text-sm font-700 text-white">Complete seu perfil</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-800 ${
            percentage >= 75 ? 'text-green-400' : percentage >= 50 ? 'text-amber-400' : 'text-brand-400'
          }`}>
            {percentage}%
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="text-dark-500 hover:text-dark-300 text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-dark-800/60 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            percentage >= 75 ? 'bg-green-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-brand-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Pending items */}
      <div className="space-y-1.5">
        {pending.slice(0, 3).map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-dark-800/40 transition-all group"
          >
            <Circle size={14} className="text-dark-500 shrink-0" />
            <span className="text-xs text-dark-400 group-hover:text-white transition-colors flex-1">{item.label}</span>
            <ChevronRight size={12} className="text-dark-600 group-hover:text-brand-400 transition-colors" />
          </Link>
        ))}
        {pending.length > 3 && (
          <p className="text-[10px] text-dark-500 pl-3">+{pending.length - 3} itens restantes</p>
        )}
      </div>

      {/* Done items summary */}
      {doneCount > 0 && (
        <div className="mt-3 pt-3 border-t border-dark-800/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={12} className="text-green-500" />
            <span className="text-[10px] text-dark-500">{doneCount} de {total} itens preenchidos</span>
          </div>
        </div>
      )}
    </div>
  );
}
