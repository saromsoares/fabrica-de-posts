'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Search, Package, Zap, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ProductCard from '@/components/product/ProductCard';
import LogoAvatar from '@/components/ui/LogoAvatar';
import type { Product, Category, Factory as FactoryType } from '@/types/database';

export default function FactoryProductsPage() {
  const { factoryId } = useParams<{ factoryId: string }>();
  const [factory, setFactory] = useState<FactoryType | null>(null);
  const [products, setProducts] = useState<(Product & { category?: Category | null })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // SESSION GUARD
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      const [{ data: fac }, { data: prods }, { data: cats }] = await Promise.all([
        supabase.from('factories').select('id, name, logo_url, active, created_at').eq('id', factoryId).single(),
        supabase.from('products').select('id, name, description, category_id, factory_id, image_url, tags, active, created_at, updated_at, category:categories(id, name, slug, created_at)').eq('factory_id', factoryId).eq('active', true).order('name'),
        supabase.from('categories').select('id, name, slug, created_at').order('name'),
      ]);
      if (!cancelled) {
        if (fac) setFactory(fac as FactoryType);
        if (prods) setProducts(prods as (Product & { category?: Category | null })[]);
        if (cats) setCategories(cats as Category[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase, factoryId]);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchSearch && matchCat;
  });

  const factoryCategories = categories.filter(c =>
    products.some(p => p.category_id === c.id)
  );

  if (loading) {
    return (
      <div className="animate-fade-in-up">
        <div className="h-8 w-48 rounded-lg bg-dark-900/60 animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-square rounded-2xl bg-dark-900/60 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!factory) {
    return (
      <div className="text-center py-20">
        <p className="text-dark-400 mb-4">Fábrica não encontrada.</p>
        <Link href="/dashboard/produtos" className="text-brand-400 hover:text-brand-300 text-sm">← Voltar ao catálogo</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <Link href="/dashboard/produtos" className="inline-flex items-center gap-1.5 text-sm text-dark-400 hover:text-white transition-colors mb-4">
        <ArrowLeft size={16} /> Voltar ao catálogo
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <LogoAvatar src={factory.logo_url} alt={factory.name} size="lg" />
        <div>
          <h1 className="font-display text-3xl font-800 tracking-tight">{factory.name}</h1>
          <p className="text-dark-400 mt-0.5 text-sm">{products.length} produto{products.length !== 1 ? 's' : ''} disponíve{products.length !== 1 ? 'is' : 'l'}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-10 pr-4 py-2.5 bg-dark-900/60 border border-dark-800/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
          />
        </div>
        {factoryCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-sm font-500 whitespace-nowrap transition-all ${selectedCategory === 'all' ? 'bg-brand-600 text-white' : 'bg-dark-800/60 text-dark-300 hover:bg-dark-800'}`}>
              Todos
            </button>
            {factoryCategories.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-500 whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-brand-600 text-white' : 'bg-dark-800/60 text-dark-300 hover:bg-dark-800'}`}>
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400">{search ? 'Nenhum produto encontrado.' : 'Nenhum produto nesta fábrica ainda.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              name={product.name}
              imageUrl={product.image_url}
              category={product.category?.name}
              action={
                <Link href={`/dashboard/estudio/${product.id}`}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-600 rounded-xl transition-all duration-200 hover:shadow-[0_0_20px_rgba(224,96,78,0.2)]">
                  <Zap size={14} /> Criar Post
                </Link>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
