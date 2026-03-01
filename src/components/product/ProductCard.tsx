'use client';

import { Package } from 'lucide-react';

type ProductCardProps = {
  name: string;
  imageUrl?: string | null;
  category?: string | null;
  onClick?: () => void;
  /** Ação extra (ex: botão "Criar Post") */
  action?: React.ReactNode;
  /** Tamanho do card */
  size?: 'sm' | 'md' | 'lg';
};

/**
 * Card de produto estilo Apple:
 * - Fundo branco, borda sutil
 * - Imagem centralizada com object-contain
 * - Hover com shadow suave
 * - Muito espaço em branco
 */
export default function ProductCard({
  name,
  imageUrl,
  category,
  onClick,
  action,
  size = 'md',
}: ProductCardProps) {
  const imageSizes = {
    sm: 'h-32',
    md: 'h-44',
    lg: 'h-56',
  };

  const paddingSizes = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const imagePadding = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      onClick={onClick}
      className={`group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Área da imagem */}
      <div className={`${imageSizes[size]} bg-white flex items-center justify-center ${imagePadding[size]}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <Package size={size === 'sm' ? 32 : size === 'md' ? 40 : 48} className="text-gray-300" />
        )}
      </div>

      {/* Info */}
      <div className={`${paddingSizes[size]} border-t border-gray-50`}>
        <h3 className={`font-medium text-gray-900 truncate ${size === 'sm' ? 'text-sm' : 'text-base'}`}>
          {name}
        </h3>
        {category && (
          <span className="inline-block mt-1.5 text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
            {category}
          </span>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
