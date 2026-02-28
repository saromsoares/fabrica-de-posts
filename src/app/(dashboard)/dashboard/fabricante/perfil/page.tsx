'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Check, Factory as FactoryIcon, Globe, Phone, FileText } from 'lucide-react';
import type { Factory, Sector } from '@/types/database';

export default function FabricantePerfilPage() {
  const supabase = createClient();
  const [factory, setFactory] = useState<Factory | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [sectorId, setSectorId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Buscar fábrica
    const { data: factoryData } = await supabase
      .from('factories')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (factoryData) {
      const f = factoryData as Factory;
      setFactory(f);
      setName(f.name || '');
      setDescription(f.description || '');
      setWebsite(f.website || '');
      setWhatsapp(f.whatsapp || '');
      setSectorId(f.sector_id || null);
    }

    // Buscar setores
    const { data: sectorsData } = await supabase
      .from('sectors')
      .select('id, name, slug, icon_svg')
      .order('name');
    if (sectorsData) setSectors(sectorsData);

    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!factory) return;
    setSaving(true);
    setSuccess(false);

    const { error } = await supabase
      .from('factories')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        website: website.trim() || null,
        whatsapp: whatsapp.trim() || null,
        sector_id: sectorId,
      })
      .eq('id', factory.id);

    if (!error) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-400" size={32} />
      </div>
    );
  }

  if (!factory) {
    return (
      <div className="text-center py-16">
        <FactoryIcon size={48} className="mx-auto text-dark-700 mb-4" />
        <p className="text-dark-400">Nenhuma fábrica associada à sua conta.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-800 tracking-tight">Perfil da Fábrica</h1>
        <p className="text-dark-400 mt-1">Atualize as informações da sua fábrica visíveis para os lojistas.</p>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Nome */}
        <div>
          <label className="text-xs font-700 text-dark-400 mb-1.5 flex items-center gap-1.5">
            <FactoryIcon size={12} /> Nome da Fábrica
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-dark-900 border border-dark-800 rounded-xl text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
          />
        </div>

        {/* Setor */}
        <div>
          <label className="text-xs font-700 text-dark-400 mb-1.5 block">Setor</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sectors.map((sector) => (
              <button
                key={sector.id}
                onClick={() => setSectorId(sector.id)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-700 transition-all border ${
                  sectorId === sector.id
                    ? 'bg-brand-600/10 border-brand-500/30 text-brand-400'
                    : 'bg-dark-900 border-dark-800 text-dark-400 hover:border-dark-700'
                }`}
              >
                {sector.icon_svg ? (
                  <div className="w-5 h-5 [&>svg]:w-full [&>svg]:h-full flex-shrink-0" dangerouslySetInnerHTML={{ __html: sector.icon_svg }} />
                ) : null}
                <span className="truncate">{sector.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label className="text-xs font-700 text-dark-400 mb-1.5 flex items-center gap-1.5">
            <FileText size={12} /> Descrição
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Descreva sua fábrica em poucas palavras..."
            className="w-full px-4 py-3 bg-dark-900 border border-dark-800 rounded-xl text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 resize-none"
          />
        </div>

        {/* Website */}
        <div>
          <label className="text-xs font-700 text-dark-400 mb-1.5 flex items-center gap-1.5">
            <Globe size={12} /> Website
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://www.suafabrica.com"
            className="w-full px-4 py-3 bg-dark-900 border border-dark-800 rounded-xl text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label className="text-xs font-700 text-dark-400 mb-1.5 flex items-center gap-1.5">
            <Phone size={12} /> WhatsApp
          </label>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+55 11 99999-9999"
            className="w-full px-4 py-3 bg-dark-900 border border-dark-800 rounded-xl text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-700 transition-all ${
            success
              ? 'bg-green-600 text-white'
              : 'bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50'
          }`}
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : success ? (
            <Check size={16} />
          ) : null}
          {success ? 'Salvo com sucesso!' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}
