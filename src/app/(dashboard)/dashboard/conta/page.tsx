'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { User, Check } from 'lucide-react';
import { PLAN_LABELS } from '@/lib/utils';
import type { Profile, UsageInfo } from '@/types/database';

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState('');
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || '');
      const [{ data: prof }, { data: usageData }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, role, plan, onboarding_complete, created_at').eq('id', user.id).single(),
        supabase.rpc('get_usage', { p_user_id: user.id }),
      ]);
      if (prof) { setProfile(prof as Profile); setFullName(prof.full_name || ''); }
      if (usageData) setUsage(usageData as UsageInfo);
    })();
  }, [supabase]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    await supabase.from('profiles').update({ full_name: fullName, updated_at: new Date().toISOString() }).eq('id', profile.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const inputClass = 'w-full px-4 py-3 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all';

  return (
    <div className="max-w-2xl animate-fade-in-up">
      <div className="flex items-center gap-3 mb-8">
        <User size={28} className="text-brand-400" />
        <h1 className="font-display text-3xl font-800 tracking-tight">Conta</h1>
      </div>

      {/* Profile */}
      <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 mb-6 space-y-4">
        <h2 className="font-display font-700">Dados pessoais</h2>
        <div>
          <label className="block text-sm text-dark-300 mb-1.5">Nome</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm text-dark-300 mb-1.5">E-mail</label>
          <input type="email" value={email} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
        </div>
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-600 rounded-xl transition-all text-sm flex items-center gap-2">
          {saved ? <><Check size={16} /> Salvo!</> : 'Salvar'}
        </button>
      </div>

      {/* Plan & Usage */}
      <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-700">Plano e uso</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-dark-950/50 rounded-xl p-4">
            <p className="text-xs text-dark-400 mb-1">Plano atual</p>
            <p className="font-display text-xl font-800 capitalize">{PLAN_LABELS[profile?.plan || 'free']}</p>
          </div>
          <div className="bg-dark-950/50 rounded-xl p-4">
            <p className="text-xs text-dark-400 mb-1">Uso este mês</p>
            <p className="font-display text-xl font-800">{usage?.count ?? 0}<span className="text-sm text-dark-500">/{usage?.limit ?? 5}</span></p>
          </div>
        </div>
        <p className="text-xs text-dark-500">Pagamento será implementado em breve. Contate o admin para upgrade de plano.</p>
      </div>
    </div>
  );
}
