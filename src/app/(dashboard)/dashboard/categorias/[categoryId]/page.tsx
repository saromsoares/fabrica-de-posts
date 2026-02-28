'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { Loader2, ArrowLeft, Package, Factory as FactoryIcon } from 'lucide-react';
import type { Product, Category, Factory } from '@/types/database';

type CategoryDetail = Category & {
  factories: Pick<Factory, 'id' | 'name' | 'logo_url'> | null;
};

export default function CategoryProductsPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;
  const supabase = createClient();

  const [category, setCategory] = useState<CategoryDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Buscar categoria com fábrica
      const { data: catData } = await supabase
        .from('categories')
        .select('id, name, slug, factory_id, factories(id, name, logo_url)')
        .eq('id', categoryId)
        .single();

      if (catData) setCategory(catData as unknown as CategoryDetail);

      // Buscar produtos da categoria
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, description, image_url, active, tags')
        .eq('category_id', categoryId)
        .eq('active', true)
        .order('name');

      if (productsData) setProducts(productsData);
      setLoading(false);
    })();
  }, [supabase, categoryId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-400" size={32} />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="text-center py-16">
        <p className="text-dark-400">Categoria não encontrada.</p>
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
        {category.factories && (
          <Link
            href={`/dashboard/fabricas/${category.factory_id}`}
            className="inline-flex items-center gap-2 text-dark-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar para {category.factories.name}
          </Link>
        )}

        <div className="flex items-center gap-4">
          {category.factories?.logo_url && (
            <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden p-1.5 flex-shrink-0">
              <img src={category.factories.logo_url} alt="" className="max-w-[80%] max-h-[80%] object-contain" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-display font-800 tracking-tight">{category.name}</h1>
            <p className="text-dark-400 mt-0.5">
              {products.length} produto{products.length !== 1 ? 's' : ''}
              {category.factories && <span> · {category.factories.name}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Grid de produtos */}
      {products.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="mx-auto text-dark-700 mb-4" />
          <p className="text-dark-400">Nenhum produto nesta categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group"
            >
              {/* Imagem do produto — fundo branco obrigatório */}
              <div className="aspect-square bg-white p-4 flex items-center justify-center">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="max-w-[80%] max-h-[80%] object-contain"
                  />
                ) : (
                  <Package size={48} className="text-gray-300" />
                )}
              </div>

              {/* Info */}
              <div className="p-4 border-t border-gray-50">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
                {product.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                )}
                <Link
                  href={`/dashboard/estudio/${product.id}`}
                  className="mt-3 w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
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
