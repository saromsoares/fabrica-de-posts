'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Factory, Search, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Factory as FactoryType } from '@/types/database';

export default function ProdutosPage() {
  const [factories, setFactories] = useState<FactoryType[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('factories')
        .select('id, name, logo_url, active, created_at')
        .eq('active', true)
        .order('name');
      if (data) setFactories(data as FactoryType[]);
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = factories.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-800 tracking-tight">Catálogo</h1>
        <p className="text-dark-400 mt-1">Escolha uma fábrica para ver os produtos disponíveis.</p>
      </div>

      {/* Busca */}
      <div className="relative mb-8">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar fábrica..."
          className="w-full pl-10 pr-4 py-3 bg-dark-900/60 border border-dark-800/50 rounded-2xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm shadow-inner"
        />
      </div>

      {/* Grid de fábricas - Padronização Visual 1:1 Fundo Branco */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-2xl bg-dark-900/60 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-dark-900/40 border border-dark-800/30 rounded-3xl">
          <Factory size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400">
            {search ? 'Nenhuma fábrica encontrada.' : 'Nenhuma fábrica disponível ainda.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((factory) => (
            <Link
              key={factory.id}
              href={`/dashboard/produtos/${factory.id}`}
              className="group bg-dark-900/60 border border-dark-800/40 rounded-3xl overflow-hidden hover:border-brand-500/30 hover:shadow-[0_0_40px_rgba(224,96,78,0.1)] transition-all duration-500"
            >
              {/* Logo da fábrica - Padronização Visual: Fundo Branco, 1:1, 80% do logo */}
              <div className="aspect-square bg-white flex items-center justify-center p-8 relative group-hover:bg-white/95 transition-colors">
                {factory.logo_url ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={factory.logo_url}
                      alt={factory.name}
                      fill
                      className="object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-sm"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  </div>
                ) : (
                  <Factory size={48} className="text-dark-200 group-hover:text-brand-400 transition-colors" />
                )}
              </div>

              {/* Nome */}
              <div className="p-5 text-center border-t border-dark-800/30">
                <h3 className="font-display font-800 text-sm group-hover:text-brand-400 transition-colors truncate">
                  {factory.name}
                </h3>
                <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] font-700 uppercase tracking-wider text-dark-500 group-hover:text-brand-400/80 transition-colors">
                  Ver produtos <ArrowRight size={10} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
