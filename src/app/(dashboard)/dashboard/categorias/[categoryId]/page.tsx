'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { Loader2, ArrowLeft, Package } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import LogoAvatar from '@/components/ui/LogoAvatar';
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
    let cancelled = false;
    (async () => {
      // SESSION GUARD
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      const { data: catData } = await supabase
        .from('categories')
        .select('id, name, slug, factory_id, factories(id, name, logo_url)')
        .eq('id', categoryId)
        .single();

      if (!cancelled && catData) setCategory(catData as unknown as CategoryDetail);

      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, description, image_url, active, tags')
        .eq('category_id', categoryId)
        .eq('active', true)
        .order('name');

      if (!cancelled) {
        if (productsData) setProducts(productsData);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
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
          <LogoAvatar
            src={category.factories?.logo_url}
            alt={category.factories?.name || 'Fábrica'}
            size="md"
          />
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
            <ProductCard
              key={product.id}
              name={product.name}
              imageUrl={product.image_url}
              category={category.name}
              action={
                <Link
                  href={`/dashboard/estudio/${product.id}`}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  Criar Post
                </Link>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
