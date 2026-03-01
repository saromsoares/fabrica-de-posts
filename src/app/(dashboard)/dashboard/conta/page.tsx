'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import {
  User, Check, Loader2, AlertCircle, Palette, Store,
  Instagram, Phone, MapPin, Globe, Megaphone, Users,
  Factory, Building2, ShoppingBag, Wrench, Package, LayoutGrid,
} from 'lucide-react';
import { PLAN_LABELS } from '@/lib/utils';
import { getPlanLimit } from '@/lib/plan-limits';
import type { Profile, BrandKit, Factory as FactoryType, UsageInfo } from '@/types/database';

const STORE_TYPE_OPTIONS = [
  { value: 'loja_fisica', label: 'Loja Física', icon: Building2 },
  { value: 'ecommerce', label: 'E-commerce', icon: ShoppingBag },
  { value: 'oficina', label: 'Oficina / Serviço', icon: Wrench },
  { value: 'revenda', label: 'Revenda / Distribuição', icon: Package },
  { value: 'marketplace', label: 'Marketplace', icon: LayoutGrid },
];

const STORE_VOICE_OPTIONS = [
  { value: 'informal', label: 'Informal e direto' },
  { value: 'tecnico', label: 'Técnico e detalhista' },
  { value: 'divertido', label: 'Divertido e descontraído' },
  { value: 'sofisticado', label: 'Sofisticado e premium' },
  { value: 'profissional', label: 'Profissional e corporativo' },
];

const BRAND_VOICE_OPTIONS = [
  { value: 'tecnico', label: 'Técnico e profissional' },
  { value: 'descontraido', label: 'Descontraído e jovem' },
  { value: 'premium', label: 'Premium e sofisticado' },
  { value: 'popular', label: 'Popular e acessível' },
  { value: 'personalizado', label: 'Personalizado' },
];

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const inputClass = 'w-full px-4 py-3 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm';
const selectClass = `${inputClass} appearance-none`;

export default function AccountPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [factory, setFactory] = useState<FactoryType | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  // Dados pessoais
  const [fullName, setFullName] = useState('');

  // Brand Kit (lojista)
  const [storeName, setStoreName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#e85d75');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [storeType, setStoreType] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [storeVoice, setStoreVoice] = useState('informal');

  // Fábrica (fabricante)
  const [factoryName, setFactoryName] = useState('');
  const [factoryDescription, setFactoryDescription] = useState('');
  const [factoryWebsite, setFactoryWebsite] = useState('');
  const [factoryWhatsapp, setFactoryWhatsapp] = useState('');
  const [factoryNiche, setFactoryNiche] = useState('');
  const [factoryDifferentials, setFactoryDifferentials] = useState('');
  const [factoryBrandVoice, setFactoryBrandVoice] = useState('tecnico');
  const [factoryTargetAudience, setFactoryTargetAudience] = useState('');

  // Saving states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [savingBrandKit, setSavingBrandKit] = useState(false);
  const [savedBrandKit, setSavedBrandKit] = useState(false);
  const [savingFactory, setSavingFactory] = useState(false);
  const [savedFactory, setSavedFactory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email || '');

    const [{ data: prof }, { data: usageData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.rpc('get_usage', { p_user_id: user.id }),
    ]);

    if (prof) {
      const p = prof as Profile;
      setProfile(p);
      setFullName(p.full_name || '');
      setStoreType(p.store_type || '');
      setLocationCity(p.location_city || '');
      setLocationState(p.location_state || '');
      setStoreVoice(p.store_voice || 'informal');
    }

    if (usageData) {
      const usageInfo = usageData as UsageInfo;
      // Se o RPC não retornar o limite, buscar da tabela plan_limits
      if (!usageInfo.limit || usageInfo.limit <= 0) {
        const planLimitData = await getPlanLimit(prof?.plan || 'free');
        usageInfo.limit = planLimitData.monthly_generations;
      }
      setUsage(usageInfo);
    }

    // Brand Kit (lojista)
    const { data: bk } = await supabase.from('brand_kits').select('*').eq('user_id', user.id).single();
    if (bk) {
      const kit = bk as BrandKit;
      setBrandKit(kit);
      setStoreName(kit.store_name || '');
      setPrimaryColor(kit.primary_color || '#e85d75');
      setSecondaryColor(kit.secondary_color || '#ffffff');
      setInstagram(kit.instagram_handle || '');
      setWhatsapp(kit.whatsapp || '');
    }

    // Fábrica (fabricante)
    const { data: fac } = await supabase.from('factories').select('*').eq('user_id', user.id).single();
    if (fac) {
      const f = fac as FactoryType;
      setFactory(f);
      setFactoryName(f.name || '');
      setFactoryDescription(f.description || '');
      setFactoryWebsite(f.website || '');
      setFactoryWhatsapp(f.whatsapp || '');
      setFactoryNiche(f.niche || '');
      setFactoryDifferentials(f.brand_differentials || '');
      setFactoryBrandVoice(f.brand_voice || 'tecnico');
      setFactoryTargetAudience(f.target_audience || '');
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    loadData().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [loadData]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('profiles').update({
        full_name: fullName,
        store_type: storeType || null,
        location_city: locationCity.trim() || null,
        location_state: locationState || null,
        store_voice: storeVoice,
        updated_at: new Date().toISOString(),
      }).eq('id', profile.id);
      if (err) throw err;
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar perfil.');
    }
    setSavingProfile(false);
  };

  const handleSaveBrandKit = async () => {
    if (!profile) return;
    setSavingBrandKit(true);
    setError(null);
    try {
      const payload = {
        store_name: storeName.trim() || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        instagram_handle: instagram.replace('@', '').trim() || null,
        whatsapp: whatsapp.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (brandKit?.id) {
        const { error: err } = await supabase.from('brand_kits').update(payload).eq('id', brandKit.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('brand_kits').insert({ ...payload, user_id: profile.id });
        if (err) throw err;
      }
      setSavedBrandKit(true);
      setTimeout(() => setSavedBrandKit(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar Brand Kit.');
    }
    setSavingBrandKit(false);
  };

  const handleSaveFactory = async () => {
    if (!factory) return;
    setSavingFactory(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('factories').update({
        name: factoryName.trim(),
        description: factoryDescription.trim() || null,
        website: factoryWebsite.trim() || null,
        whatsapp: factoryWhatsapp.trim() || null,
        niche: factoryNiche.trim() || null,
        brand_differentials: factoryDifferentials.trim() || null,
        brand_voice: factoryBrandVoice,
        target_audience: factoryTargetAudience.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', factory.id);
      if (err) throw err;
      setSavedFactory(true);
      setTimeout(() => setSavedFactory(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar dados da fábrica.');
    }
    setSavingFactory(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-400" size={32} />
      </div>
    );
  }

  const isFabricante = profile?.role === 'fabricante' || profile?.role === 'admin' || profile?.is_super_admin;
  const isLojista = profile?.role === 'lojista' || (!isFabricante);

  return (
    <div className="max-w-2xl animate-fade-in-up space-y-6">
      <div className="flex items-center gap-3">
        <User size={28} className="text-brand-400" />
        <h1 className="font-display text-3xl font-800 tracking-tight">Conta</h1>
      </div>

      {/* Error global */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* ── Dados Pessoais ── */}
      <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-700 flex items-center gap-2">
          <User size={16} className="text-brand-400" />
          Dados Pessoais
        </h2>

        <div>
          <label className="block text-sm text-dark-300 mb-1.5">Nome completo</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Seu nome" />
        </div>
        <div>
          <label className="block text-sm text-dark-300 mb-1.5">E-mail</label>
          <input type="email" value={email} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
        </div>

        {/* Campos de lojista no perfil */}
        {isLojista && (
          <>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Tipo de Loja</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STORE_TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStoreType(opt.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-600 transition-all ${
                        storeType === opt.value
                          ? 'bg-brand-600/20 border-brand-500/50 text-brand-400'
                          : 'bg-dark-950/50 border-dark-800/50 text-dark-400 hover:border-dark-700'
                      }`}
                    >
                      <Icon size={14} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">
                  <MapPin size={12} className="inline mr-1" />Cidade
                </label>
                <input
                  type="text"
                  value={locationCity}
                  onChange={(e) => setLocationCity(e.target.value)}
                  className={inputClass}
                  placeholder="Ex: Fortaleza"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Estado (UF)</label>
                <select value={locationState} onChange={(e) => setLocationState(e.target.value)} className={selectClass}>
                  <option value="">Selecione...</option>
                  {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-dark-300 mb-1.5">
                <Megaphone size={12} className="inline mr-1" />Tom de Comunicação
              </label>
              <select value={storeVoice} onChange={(e) => setStoreVoice(e.target.value)} className={selectClass}>
                {STORE_VOICE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-600 rounded-xl transition-all text-sm flex items-center gap-2"
        >
          {savingProfile ? <Loader2 size={16} className="animate-spin" /> : savedProfile ? <><Check size={16} /> Salvo!</> : 'Salvar Perfil'}
        </button>
      </div>

      {/* ── Brand Kit (lojista) ── */}
      {isLojista && (
        <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-4">
          <h2 className="font-display font-700 flex items-center gap-2">
            <Palette size={16} className="text-brand-400" />
            Brand Kit da Loja
          </h2>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">
              <Store size={12} className="inline mr-1" />Nome da Loja
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className={inputClass}
              placeholder="Ex: JLEDS Autopeças"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Cor Primária</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-dark-800/50 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 bg-dark-950 border border-dark-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Cor Secundária</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-dark-800/50 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 bg-dark-950 border border-dark-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50"
                />
              </div>
            </div>
          </div>

          {/* Preview de cores */}
          <div className="flex items-center gap-3 p-3 bg-dark-950/50 rounded-xl">
            <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: primaryColor }} />
            <div className="w-8 h-8 rounded-lg border border-dark-700" style={{ backgroundColor: secondaryColor }} />
            <span className="text-sm font-700" style={{ color: primaryColor }}>{storeName || 'Sua Loja'}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">
                <Instagram size={12} className="inline mr-1" />Instagram
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className={inputClass}
                placeholder="@sujaloja"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">
                <Phone size={12} className="inline mr-1" />WhatsApp
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className={inputClass}
                placeholder="+55 11 99999-9999"
              />
            </div>
          </div>

          <button
            onClick={handleSaveBrandKit}
            disabled={savingBrandKit}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-600 rounded-xl transition-all text-sm flex items-center gap-2"
          >
            {savingBrandKit ? <Loader2 size={16} className="animate-spin" /> : savedBrandKit ? <><Check size={16} /> Salvo!</> : 'Salvar Brand Kit'}
          </button>
        </div>
      )}

      {/* ── Dados da Fábrica (fabricante) ── */}
      {isFabricante && factory && (
        <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-4">
          <h2 className="font-display font-700 flex items-center gap-2">
            <Factory size={16} className="text-blue-400" />
            Dados da Fábrica
          </h2>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Nome da Fábrica</label>
            <input
              type="text"
              value={factoryName}
              onChange={(e) => setFactoryName(e.target.value)}
              className={inputClass}
              placeholder="Ex: ASX Iluminação"
            />
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Descrição</label>
            <textarea
              value={factoryDescription}
              onChange={(e) => setFactoryDescription(e.target.value)}
              className={`${inputClass} resize-none`}
              rows={3}
              placeholder="Breve descrição da sua fábrica..."
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">
                <Globe size={12} className="inline mr-1" />Website
              </label>
              <input
                type="url"
                value={factoryWebsite}
                onChange={(e) => setFactoryWebsite(e.target.value)}
                className={inputClass}
                placeholder="https://suafabrica.com"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">
                <Phone size={12} className="inline mr-1" />WhatsApp
              </label>
              <input
                type="tel"
                value={factoryWhatsapp}
                onChange={(e) => setFactoryWhatsapp(e.target.value)}
                className={inputClass}
                placeholder="+55 11 99999-9999"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Nicho de Mercado</label>
            <input
              type="text"
              value={factoryNiche}
              onChange={(e) => setFactoryNiche(e.target.value)}
              className={inputClass}
              placeholder="Ex: Iluminação automotiva LED"
            />
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Diferenciais da Marca</label>
            <textarea
              value={factoryDifferentials}
              onChange={(e) => setFactoryDifferentials(e.target.value)}
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="Ex: Alta durabilidade, tecnologia alemã, 3 anos de garantia"
            />
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">
              <Megaphone size={12} className="inline mr-1" />Tom da Comunicação (Brand Voice)
            </label>
            <select value={factoryBrandVoice} onChange={(e) => setFactoryBrandVoice(e.target.value)} className={selectClass}>
              {BRAND_VOICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">
              <Users size={12} className="inline mr-1" />Público-Alvo
            </label>
            <textarea
              value={factoryTargetAudience}
              onChange={(e) => setFactoryTargetAudience(e.target.value)}
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="Ex: Lojistas de autopeças, oficinas mecânicas, revendedores"
            />
          </div>

          <button
            onClick={handleSaveFactory}
            disabled={savingFactory}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-600 rounded-xl transition-all text-sm flex items-center gap-2"
          >
            {savingFactory ? <Loader2 size={16} className="animate-spin" /> : savedFactory ? <><Check size={16} /> Salvo!</> : 'Salvar Dados da Fábrica'}
          </button>
        </div>
      )}

      {/* ── Plano e Uso ── */}
      <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-700">Plano e Uso</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-dark-950/50 rounded-xl p-4">
            <p className="text-xs text-dark-400 mb-1">Plano atual</p>
            <p className="font-display text-xl font-800 capitalize">{PLAN_LABELS[profile?.plan || 'free']}</p>
          </div>
          <div className="bg-dark-950/50 rounded-xl p-4">
            <p className="text-xs text-dark-400 mb-1">Uso este mês</p>
            <p className="font-display text-xl font-800">
              {usage?.count ?? 0}
              <span className="text-sm text-dark-500">/{usage?.limit === 999999 ? '\u221e' : (usage?.limit ?? '...')}</span>
            </p>
          </div>
        </div>

        {/* Barra de progresso */}
        {usage && (
          <div>
            <div className="flex justify-between text-xs text-dark-500 mb-1">
              <span>Gerações usadas</span>
              <span>{usage.count}/{usage.limit}</span>
            </div>
            <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usage.count >= usage.limit ? 'bg-red-500' :
                  usage.count >= usage.limit * 0.8 ? 'bg-yellow-500' :
                  'bg-brand-500'
                }`}
                style={{ width: `${Math.min(100, (usage.count / usage.limit) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <p className="text-xs text-dark-500">
          Para upgrade de plano, entre em contato com o administrador.
        </p>
      </div>
    </div>
  );
}
