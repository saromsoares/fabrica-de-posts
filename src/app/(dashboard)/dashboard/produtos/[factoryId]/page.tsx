'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Search, Package, Zap, ArrowLeft, Factory } from 'lucide-react';
import Link from 'next/link';
import type { Product, Category, Factory as FactoryType } from '@/types/database';

export default function FactoryProductsPage() {
  const { factoryId } = useParams<{ factoryId: string }>();
  const [factory, setFactory] = useState<FactoryType | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const [{ data: fac }, { data: prods }, { data: cats }] = await Promise.all([
        supabase.from('factories').select('id, name, logo_url, active, created_at').eq('id', factoryId).single(),
        supabase.from('products').select('id, name, description, category_id, factory_id, image_url, tags, active, created_at, updated_at, category:categories(id, name, slug, created_at)').eq('factory_id', factoryId).eq('active', true).order('name'),
        supabase.from('categories').select('id, name, slug, created_at').order('name'),
      ]);
      if (fac) setFactory(fac as FactoryType);
      if (prods) setProducts(prods as Product[]);
      if (cats) setCategories(cats as Category[]);
      setLoading(false);
    })();
  }, [supabase, factoryId]);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchSearch && matchCat;
  });

  // Categorias que existem nessa fábrica
  const factoryCategories = categories.filter(c =>
    products.some(p => p.category_id === c.id)
  );

  if (loading) {
    return (
      <div className="animate-fade-in-up">
        <div className="h-8 w-48 rounded-lg bg-dark-900/60 animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-square rounded-3xl bg-dark-900/60 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!factory) {
    return (
      <div className="text-center py-20 bg-dark-900/40 border border-dark-800/30 rounded-3xl">
        <p className="text-dark-400 mb-4 font-500">Fábrica não encontrada.</p>
        <Link href="/dashboard/produtos" className="inline-flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white text-sm font-600 rounded-xl transition-all">
          <ArrowLeft size={16} /> Voltar ao catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header com logo e nome da fábrica */}
      <Link href="/dashboard/produtos" className="inline-flex items-center gap-1.5 text-sm text-dark-400 hover:text-brand-400 transition-colors mb-6 font-600 group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Voltar ao catálogo
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-10">
        <div className="w-20 h-20 rounded-3xl bg-white border border-dark-800/20 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xl">
          {factory.logo_url ? (
            <img src={factory.logo_url} alt={factory.name} className="w-full h-full object-contain p-4 drop-shadow-sm" />
          ) : (
            <Factory size={32} className="text-dark-200" />
          )}
        </div>
        <div>
          <h1 className="font-display text-4xl font-800 tracking-tight text-white">{factory.name}</h1>
          <p className="text-dark-400 mt-1 text-sm font-500 flex items-center gap-2">
            <Package size={14} className="text-brand-400" />
            {products.length} produto{products.length !== 1 ? 's' : ''} disponíve{products.length !== 1 ? 'is' : 'l'}
          </p>
        </div>
      </div>

      {/* Busca + filtros */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-10 pr-4 py-3 bg-dark-900/60 border border-dark-800/50 rounded-2xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 transition-all text-sm shadow-inner"
          />
        </div>
        {factoryCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button onClick={() => setSelectedCategory('all')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-700 uppercase tracking-wider whitespace-nowrap transition-all border ${selectedCategory === 'all' ? 'bg-brand-600 border-brand-500 text-white shadow-[0_0_20px_rgba(224,96,78,0.2)]' : 'bg-dark-900/60 border-dark-800/50 text-dark-400 hover:border-dark-700'}`}>
              Todos
            </button>
            {factoryCategories.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-700 uppercase tracking-wider whitespace-nowrap transition-all border ${selectedCategory === cat.id ? 'bg-brand-600 border-brand-500 text-white shadow-[0_0_20px_rgba(224,96,78,0.2)]' : 'bg-dark-900/60 border-dark-800/50 text-dark-400 hover:border-dark-700'}`}>
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid de produtos - Padronização Visual 1:1 Fundo Branco */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-dark-900/40 border border-dark-800/30 rounded-3xl">
          <Package size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400 font-500">{search ? 'Nenhum produto encontrado.' : 'Nenhum produto nesta fábrica ainda.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <div key={product.id}
              className="group bg-dark-900/60 border border-dark-800/40 rounded-3xl overflow-hidden hover:border-brand-500/30 hover:shadow-[0_0_40px_rgba(224,96,78,0.1)] transition-all duration-500">
              {/* Padronização Visual: Fundo Branco, 1:1, 80% do produto */}
              <div className="aspect-square bg-white flex items-center justify-center p-8 relative group-hover:bg-white/95 transition-colors">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name}
                    className="max-w-[85%] max-h-[85%] object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-md" />
                ) : (
                  <Package size={48} className="text-dark-200" />
                )}
                {product.category && (
                  <div className="absolute top-3 left-3 px-2 py-1 bg-dark-900/60 backdrop-blur-md rounded-lg text-[9px] font-800 uppercase tracking-wider text-white/80 border border-white/10">
                    {(product.category as Category).name}
                  </div>
                )}
              </div>
              <div className="p-5 border-t border-dark-800/30">
                <h3 className="font-display font-800 text-sm text-white truncate group-hover:text-brand-400 transition-colors">{product.name}</h3>
                <Link href={`/dashboard/estudio/${product.id}`}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-800 uppercase tracking-widest rounded-2xl transition-all duration-300 hover:shadow-[0_0_25px_rgba(224,96,78,0.3)] active:scale-95">
                  <Zap size={14} /> Criar Post
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
