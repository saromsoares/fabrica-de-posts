'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Search, Package, Zap } from 'lucide-react';
import Link from 'next/link';
import type { Product, Category } from '@/types/database';

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from('products').select('*, category:categories(*)').eq('active', true).order('name'),
        supabase.from('categories').select('*').order('name'),
      ]);
      if (prods) setProducts(prods as Product[]);
      if (cats) setCategories(cats as Category[]);
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-800 tracking-tight">Produtos</h1>
          <p className="text-dark-400 mt-1">Escolha um produto para criar seu post.</p>
        </div>
      </div>

      {/* Busca + filtro por categoria */}
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
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-sm font-500 whitespace-nowrap transition-all ${selectedCategory === 'all' ? 'bg-brand-600 text-white' : 'bg-dark-800/60 text-dark-300 hover:bg-dark-800'}`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-500 whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-brand-600 text-white' : 'bg-dark-800/60 text-dark-300 hover:bg-dark-800'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de produtos */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-2xl bg-dark-900/60 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400">{search ? 'Nenhum produto encontrado para essa busca.' : 'Nenhum produto cadastrado ainda.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="group bg-dark-900/60 border border-dark-800/40 rounded-2xl overflow-hidden hover:border-dark-700/60 transition-all"
            >
              {/* Imagem do produto */}
              <div className="aspect-square bg-dark-800 flex items-center justify-center overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Package size={32} className="text-dark-600" />
                )}
              </div>

              {/* Info + botão */}
              <div className="p-3">
                <h3 className="font-display font-600 text-sm truncate">{product.name}</h3>
                {product.category && (
                  <p className="text-[11px] text-dark-500 mt-0.5">
                    {(product.category as Category).name}
                  </p>
                )}

                {/* Botão Criar Post */}
                <Link
                  href={`/dashboard/estudio/${product.id}`}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-600 rounded-xl transition-all duration-200 hover:shadow-[0_0_20px_rgba(224,96,78,0.2)]"
                >
                  <Zap size={14} />
                  Criar Post
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
