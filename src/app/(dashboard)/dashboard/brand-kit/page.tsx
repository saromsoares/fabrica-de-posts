'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { FileUpload } from '@/components/ui/FileUpload';
import { useRouter } from 'next/navigation';
import { Check, Palette } from 'lucide-react';
import type { BrandKit } from '@/types/database';
import { createLogger } from '@/lib/logger';

const log = createLogger('BrandKit');

export default function BrandKitPage() {
  const [brandKit, setBrandKit] = useState<Partial<BrandKit>>({
    primary_color: '#000000', secondary_color: '#FFFFFF',
    store_name: '', instagram_handle: '', whatsapp: '',
  });
  const [logoUploadedUrl, setLogoUploadedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // SESSION GUARD
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase.from('brand_kits').select('*').eq('user_id', user.id).single();
      if (!cancelled) {
        if (data) {
          setBrandKit(data);
          setIsNew(false);
          if (data.logo_url) setLogoUploadedUrl(data.logo_url);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  const [logoError, setLogoError] = useState<string | null>(null);
  // handleLogoChange removido — substituído por FileUpload component

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const logoUrl = logoUploadedUrl || brandKit.logo_url;

      const payload = {
        user_id: user.id,
        logo_url: logoUrl,
        primary_color: brandKit.primary_color,
        secondary_color: brandKit.secondary_color,
        store_name: brandKit.store_name,
        instagram_handle: brandKit.instagram_handle,
        whatsapp: brandKit.whatsapp,
        updated_at: new Date().toISOString(),
      };

      if (isNew) {
        await supabase.from('brand_kits').insert(payload);
      } else {
        await supabase.from('brand_kits').update(payload).eq('user_id', user.id);
      }

      // Marca onboarding como completo
      await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user.id);

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        if (isNew) router.push('/dashboard');
      }, 1500);
    } catch (err) {
      log.error('Save failed', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all';

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl animate-fade-in-up">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Palette size={28} className="text-brand-400" />
          <h1 className="font-display text-3xl font-800 tracking-tight">Brand Kit</h1>
        </div>
        <p className="text-dark-400">{isNew ? 'Configure sua marca para começar a gerar artes.' : 'Atualize os dados da sua marca.'}</p>
      </div>

      <div className="bg-dark-900/60 border border-dark-800/40 rounded-3xl p-6 md:p-8 space-y-6">
        {/* Logo */}
        <div>
          <label className="block text-sm font-500 text-dark-300 mb-3">Logo da loja</label>
          <FileUpload
            type="brand-logo"
            currentUrl={logoUploadedUrl}
            onUploadComplete={(url) => { setLogoUploadedUrl(url); setLogoError(null); }}
            onError={(msg) => setLogoError(msg)}
          />
          {logoError && <p className="text-xs text-red-400 mt-1">{logoError}</p>}
        </div>

        {/* Cores */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-500 text-dark-300 mb-2">Cor primária</label>
            <div className="flex items-center gap-3">
              <input type="color" value={brandKit.primary_color || '#000000'}
                onChange={(e) => setBrandKit({ ...brandKit, primary_color: e.target.value })}
                className="w-12 h-12 rounded-xl border border-dark-700 cursor-pointer bg-transparent" />
              <input type="text" value={brandKit.primary_color || ''} onChange={(e) => setBrandKit({ ...brandKit, primary_color: e.target.value })}
                className={inputClass} placeholder="#000000" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-500 text-dark-300 mb-2">Cor secundária</label>
            <div className="flex items-center gap-3">
              <input type="color" value={brandKit.secondary_color || '#FFFFFF'}
                onChange={(e) => setBrandKit({ ...brandKit, secondary_color: e.target.value })}
                className="w-12 h-12 rounded-xl border border-dark-700 cursor-pointer bg-transparent" />
              <input type="text" value={brandKit.secondary_color || ''} onChange={(e) => setBrandKit({ ...brandKit, secondary_color: e.target.value })}
                className={inputClass} placeholder="#FFFFFF" />
            </div>
          </div>
        </div>

        {/* Nome da loja */}
        <div>
          <label className="block text-sm font-500 text-dark-300 mb-2">Nome da loja (opcional)</label>
          <input type="text" value={brandKit.store_name || ''} onChange={(e) => setBrandKit({ ...brandKit, store_name: e.target.value })}
            className={inputClass} placeholder="Minha Loja" />
        </div>

        {/* Instagram */}
        <div>
          <label className="block text-sm font-500 text-dark-300 mb-2">@Instagram</label>
          <input
            type="text"
            value={brandKit.instagram_handle || ''}
            onChange={(e) => {
              let v = e.target.value.replace(/\s/g, '');
              if (v && !v.startsWith('@')) v = '@' + v;
              setBrandKit({ ...brandKit, instagram_handle: v });
            }}
            className={inputClass}
            placeholder="@minhaloja"
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-500 text-dark-300 mb-2">WhatsApp</label>
          <input
            type="tel"
            value={brandKit.whatsapp || ''}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
              let formatted = digits;
              if (digits.length > 2) formatted = '+' + digits.slice(0, 2) + ' ' + digits.slice(2);
              if (digits.length > 4) formatted = '+' + digits.slice(0, 2) + ' ' + digits.slice(2, 4) + ' ' + digits.slice(4);
              if (digits.length > 9) formatted = '+' + digits.slice(0, 2) + ' ' + digits.slice(2, 4) + ' ' + digits.slice(4, 9) + '-' + digits.slice(9);
              setBrandKit({ ...brandKit, whatsapp: formatted });
            }}
            className={inputClass}
            placeholder="+55 11 99999-9999"
          />
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-display font-600 rounded-xl transition-all duration-300 flex items-center justify-center gap-2">
          {saved ? <><Check size={18} /> Salvo!</> : saving ? 'Salvando...' : isNew ? 'Salvar e continuar' : 'Atualizar Brand Kit'}
        </button>
      </div>
    </div>
  );
}
