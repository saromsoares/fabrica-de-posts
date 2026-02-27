'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Factory, Search } from 'lucide-react';
import Link from 'next/link';
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
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar fábrica..."
          className="w-full pl-10 pr-4 py-2.5 bg-dark-900/60 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
        />
      </div>

      {/* Grid de fábricas */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-2xl bg-dark-900/60 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Factory size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400">
            {search ? 'Nenhuma fábrica encontrada.' : 'Nenhuma fábrica disponível ainda.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((factory) => (
            <Link
              key={factory.id}
              href={`/dashboard/produtos/${factory.id}`}
              className="group bg-dark-900/60 border border-dark-800/40 rounded-2xl overflow-hidden hover:border-brand-500/30 hover:shadow-[0_0_30px_rgba(224,96,78,0.08)] transition-all duration-300"
            >
              {/* Logo da fábrica */}
              <div className="aspect-square bg-dark-800/50 flex items-center justify-center p-6 group-hover:bg-dark-800/70 transition-colors">
                {factory.logo_url ? (
                  <img
                    src={factory.logo_url}
                    alt={factory.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Factory size={48} className="text-dark-500 group-hover:text-dark-400 transition-colors" />
                )}
              </div>

              {/* Nome */}
              <div className="p-4 text-center">
                <h3 className="font-display font-700 text-sm group-hover:text-brand-400 transition-colors">
                  {factory.name}
                </h3>
                <p className="text-[11px] text-dark-500 mt-1">Ver produtos →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
