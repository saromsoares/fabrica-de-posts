'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { Loader2, ArrowLeft, FolderOpen, Factory as FactoryIcon } from 'lucide-react';
import type { Factory, Category, Sector } from '@/types/database';

type FactoryDetail = Factory & {
  sectors: Pick<Sector, 'name'> | null;
};

export default function FactoryCategoriesPage() {
  const params = useParams();
  const factoryId = params.factoryId as string;
  const supabase = createClient();

  const [factory, setFactory] = useState<FactoryDetail | null>(null);
  const [categories, setCategories] = useState<(Category & { product_count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Buscar fábrica com setor
      const { data: factoryData } = await supabase
        .from('factories')
        .select('id, name, logo_url, description, sector_id, sectors(name)')
        .eq('id', factoryId)
        .single();

      if (factoryData) setFactory(factoryData as unknown as FactoryDetail);

      // Buscar categorias da fábrica
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, slug, factory_id')
        .eq('factory_id', factoryId)
        .order('name');

      // Contar produtos por categoria
      const enriched = await Promise.all(
        (categoriesData || []).map(async (cat) => {
          const { count } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', cat.id)
            .eq('active', true);
          return { ...cat, product_count: count || 0 };
        })
      );

      setCategories(enriched);
      setLoading(false);
    })();
  }, [supabase, factoryId]);

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
        <p className="text-dark-400">Fábrica não encontrada.</p>
        <Link href="/dashboard/setores" className="text-brand-400 hover:underline mt-2 inline-block">
          Voltar aos setores
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard/setores" className="inline-flex items-center gap-2 text-dark-400 hover:text-white text-sm mb-4 transition-colors">
          <ArrowLeft size={16} /> Voltar
        </Link>

        {/* Fábrica info */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden p-2 flex-shrink-0">
            {factory.logo_url ? (
              <img src={factory.logo_url} alt={factory.name} className="max-w-[80%] max-h-[80%] object-contain" />
            ) : (
              <FactoryIcon size={28} className="text-gray-400" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-display font-800 tracking-tight">{factory.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {factory.sectors?.name && (
                <span className="text-xs font-700 text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-full">
                  {factory.sectors.name}
                </span>
              )}
              <span className="text-dark-400 text-sm">{categories.length} categoria{categories.length !== 1 ? 's' : ''}</span>
            </div>
            {factory.description && (
              <p className="text-dark-400 text-sm mt-2 max-w-xl">{factory.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Grid de categorias */}
      {categories.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen size={48} className="mx-auto text-dark-700 mb-4" />
          <p className="text-dark-400">Esta fábrica ainda não tem categorias cadastradas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/dashboard/categorias/${cat.id}`}
              className="group bg-dark-900 border border-dark-800 rounded-2xl p-6 hover:border-brand-500/40 hover:bg-dark-800/60 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-brand-400 group-hover:bg-brand-600/10 group-hover:border-brand-500/30 transition-all">
                  <FolderOpen size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-700 text-white group-hover:text-brand-400 transition-colors truncate">
                    {cat.name}
                  </h3>
                  <p className="text-dark-500 text-sm mt-0.5">
                    {cat.product_count} produto{cat.product_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
