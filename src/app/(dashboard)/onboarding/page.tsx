'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import {
  Factory, Store, Upload, Check, ArrowRight,
  Loader2, Globe, Phone, FileText, Sparkles,
  CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import type { Profile, Factory as FactoryType } from '@/types/database';

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */

interface FactoryWithFollowInfo extends FactoryType {
  follow_status: 'pending' | 'approved' | 'rejected' | null;
}

/* ═══════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════ */

export default function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        const p = data as Profile;
        if (p.onboarding_complete) {
          router.push('/dashboard');
          return;
        }
        setProfile(p);
      }
      setLoading(false);
    })();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="animate-fade-in-up max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600/10 border border-brand-500/20 rounded-full mb-4">
          <Sparkles size={14} className="text-brand-400" />
          <span className="text-xs font-700 text-brand-400 uppercase tracking-wider">Bem-vindo</span>
        </div>
        <h1 className="font-display text-3xl font-800 tracking-tight mb-2">
          Vamos configurar sua conta
        </h1>
        <p className="text-dark-400 text-sm">
          {profile.role === 'fabricante'
            ? 'Crie sua fábrica para começar a disponibilizar produtos.'
            : 'Siga fábricas para acessar os produtos e criar posts.'}
        </p>
      </div>

      {/* Role badge */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2 px-4 py-2 bg-dark-900/80 border border-dark-800/50 rounded-full">
          {profile.role === 'fabricante' ? (
            <>
              <Factory size={14} className="text-blue-400" />
              <span className="text-xs font-700 text-blue-400 uppercase tracking-wider">Fabricante</span>
            </>
          ) : (
            <>
              <Store size={14} className="text-brand-400" />
              <span className="text-xs font-700 text-brand-400 uppercase tracking-wider">Lojista</span>
            </>
          )}
        </div>
      </div>

      {/* Content based on role */}
      {profile.role === 'fabricante' ? (
        <FabricanteOnboarding supabase={supabase} router={router} userId={profile.id} />
      ) : (
        <LojistaOnboarding supabase={supabase} router={router} userId={profile.id} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   FABRICANTE ONBOARDING
   ═══════════════════════════════════════ */

function FabricanteOnboarding({
  supabase,
  router,
  userId,
}: {
  supabase: ReturnType<typeof createClient>;
  router: ReturnType<typeof import('next/navigation').useRouter>;
  userId: string;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Nome da fábrica é obrigatório.'); return; }

    setSaving(true);
    setError(null);

    try {
      // Create factory
      const { error: factoryError } = await supabase
        .from('factories')
        .insert({
          name: name.trim(),
          user_id: userId,
          description: description.trim() || null,
          website: website.trim() || null,
          whatsapp: whatsapp.trim() || null,
          logo_url: logoUrl.trim() || null,
          active: true,
        });

      if (factoryError) throw factoryError;

      // Mark onboarding complete
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ onboarding_complete: true, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (profileError) throw profileError;

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar fábrica.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-dark-900/60 border border-dark-800/40 rounded-3xl p-6 sm:p-8 space-y-6">
      <h2 className="font-display text-lg font-800 flex items-center gap-2">
        <Factory size={20} className="text-blue-400" />
        Dados da Fábrica
      </h2>

      {/* Nome */}
      <div>
        <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">
          Nome da Fábrica *
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: ASX Iluminação"
          className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
        />
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">
          <FileText size={12} className="inline mr-1" />
          Descrição
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Breve descrição da sua fábrica e produtos..."
          rows={3}
          className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm resize-none"
        />
      </div>

      {/* Logo URL */}
      <div>
        <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">
          <Upload size={12} className="inline mr-1" />
          URL do Logo
        </label>
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://exemplo.com/logo.png"
          className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
        />
        {logoUrl && (
          <div className="mt-3 w-20 h-20 bg-white rounded-xl flex items-center justify-center p-2 border border-dark-800/30">
            <img src={logoUrl} alt="Preview" className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
      </div>

      {/* Website + WhatsApp */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">
            <Globe size={12} className="inline mr-1" />
            Website
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://suafabrica.com"
            className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-700 text-dark-400 uppercase tracking-wider mb-2">
            <Phone size={12} className="inline mr-1" />
            WhatsApp
          </label>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+34 600 000 000"
            className="w-full px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            <Check size={18} />
            Criar Fábrica e Continuar
          </>
        )}
      </button>
    </form>
  );
}

/* ═══════════════════════════════════════
   LOJISTA ONBOARDING
   ═══════════════════════════════════════ */

function LojistaOnboarding({
  supabase,
  router,
  userId,
}: {
  supabase: ReturnType<typeof createClient>;
  router: ReturnType<typeof import('next/navigation').useRouter>;
  userId: string;
}) {
  const [factories, setFactories] = useState<FactoryWithFollowInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFollowed = factories.some((f) => f.follow_status === 'pending' || f.follow_status === 'approved');

  const fetchFactories = useCallback(async () => {
    setLoading(true);

    // Fetch all active factories
    const { data: factoriesData } = await supabase
      .from('factories')
      .select('*')
      .eq('active', true)
      .order('name');

    // Fetch user's follow statuses
    const { data: followsData } = await supabase
      .from('factory_followers')
      .select('factory_id, status')
      .eq('lojista_id', userId);

    const followMap = new Map<string, 'pending' | 'approved' | 'rejected'>();
    if (followsData) {
      followsData.forEach((f: { factory_id: string; status: string }) => {
        followMap.set(f.factory_id, f.status as 'pending' | 'approved' | 'rejected');
      });
    }

    const enriched: FactoryWithFollowInfo[] = ((factoriesData || []) as FactoryType[]).map((f) => ({
      ...f,
      follow_status: followMap.get(f.id) || null,
    }));

    setFactories(enriched);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      await fetchFactories();
    }
    run();
    return () => { cancelled = true; };
  }, [fetchFactories, supabase]);

  const handleFollow = async (factoryId: string) => {
    setActionLoading(factoryId);
    setError(null);

    try {
      // SESSION GUARD: verificar sessão antes de chamar Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[onboarding] Sem sessão ativa para chamar manage-followers');
        setError('Sessão expirada. Faça login novamente.');
        setActionLoading(null);
        return;
      }

      const { error: fnError } = await supabase.functions.invoke('manage-followers', {
        body: { action: 'follow', factory_id: factoryId },
      });

      if (fnError) throw fnError;

      // Update local state
      setFactories((prev) =>
        prev.map((f) =>
          f.id === factoryId ? { ...f, follow_status: 'pending' } : f
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar acesso.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    setError(null);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ onboarding_complete: true, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (profileError) throw profileError;

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao concluir onboarding.');
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-dark-900/60 border border-dark-800/40 rounded-3xl p-6 sm:p-8">
        <h2 className="font-display text-lg font-800 flex items-center gap-2 mb-2">
          <Store size={20} className="text-brand-400" />
          Escolha suas Fábricas
        </h2>
        <p className="text-dark-400 text-sm mb-6">
          Solicite acesso para ver os produtos e criar posts. Você precisa seguir pelo menos 1 fábrica.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          </div>
        ) : factories.length === 0 ? (
          <div className="text-center py-12">
            <Factory size={48} className="mx-auto text-dark-600 mb-4" />
            <p className="text-dark-400 text-sm">Nenhuma fábrica disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {factories.map((factory) => (
              <div
                key={factory.id}
                className="flex items-center gap-4 p-4 bg-dark-950/50 border border-dark-800/30 rounded-2xl hover:border-dark-700/50 transition-all"
              >
                {/* Logo */}
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center p-2 flex-shrink-0">
                  {factory.logo_url ? (
                    <img src={factory.logo_url} alt={factory.name} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Factory size={24} className="text-slate-300" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-700 text-white truncate">{factory.name}</p>
                  {factory.description && (
                    <p className="text-xs text-dark-400 mt-0.5 line-clamp-1">{factory.description}</p>
                  )}
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                  {factory.follow_status === 'approved' ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-xs font-700">
                      <CheckCircle2 size={14} /> Aprovado
                    </span>
                  ) : factory.follow_status === 'pending' ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-700">
                      <Clock size={14} /> Pendente
                    </span>
                  ) : (
                    <button
                      onClick={() => handleFollow(factory.id)}
                      disabled={actionLoading === factory.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600/20 border border-brand-500/30 rounded-lg text-brand-400 text-xs font-700 hover:bg-brand-600/30 transition-all disabled:opacity-50"
                    >
                      {actionLoading === factory.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <>
                          <ArrowRight size={14} /> Solicitar
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Complete button */}
      <button
        onClick={handleComplete}
        disabled={!hasFollowed || completing}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-700 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {completing ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            <Check size={18} />
            Concluir e Acessar o Dashboard
          </>
        )}
      </button>

      {!hasFollowed && (
        <p className="text-center text-dark-500 text-xs">
          Solicite acesso a pelo menos 1 fábrica para continuar.
        </p>
      )}
    </div>
  );
}
