'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { Loader2, Search, Grid3X3 } from 'lucide-react';
import type { Sector } from '@/types/database';

export default function SetoresPage() {
  const supabase = createClient();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('sectors')
        .select('id, name, slug, icon_svg')
        .order('name');
      if (data) setSectors(data);
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = sectors.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-800 tracking-tight">Setores</h1>
        <p className="text-dark-400 mt-1">Escolha um setor para explorar as fábricas e seus produtos.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" />
        <input
          type="text"
          placeholder="Buscar setor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-dark-900 border border-dark-800 rounded-xl text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
        />
      </div>

      {/* Grid de setores */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Grid3X3 size={48} className="mx-auto text-dark-700 mb-4" />
          <p className="text-dark-400">Nenhum setor encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((sector) => (
            <Link
              key={sector.id}
              href={`/dashboard/setores/${sector.slug}`}
              className="group bg-dark-900 border border-dark-800 rounded-2xl p-6 flex flex-col items-center gap-4 hover:border-brand-500/40 hover:bg-dark-800/60 transition-all"
            >
              {/* Ícone SVG */}
              <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center text-brand-400 group-hover:bg-brand-600/10 group-hover:border-brand-500/30 transition-all">
                {sector.icon_svg ? (
                  <div
                    className="w-8 h-8 [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: sector.icon_svg }}
                  />
                ) : (
                  <Grid3X3 size={28} />
                )}
              </div>

              {/* Nome */}
              <span className="text-sm font-700 text-center text-white group-hover:text-brand-400 transition-colors">
                {sector.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
