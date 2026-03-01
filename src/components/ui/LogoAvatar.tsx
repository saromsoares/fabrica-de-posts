'use client';
/* eslint-disable @next/next/no-img-element */

import { Factory } from 'lucide-react';

type LogoAvatarProps = {
  src?: string | null;
  alt?: string;
  /** sm=w-8, md=w-12, lg=w-20, xl=w-32 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

/**
 * Avatar circular para logos de fábricas e lojistas.
 * Padrão: fundo branco, borda sutil, object-contain.
 */
export default function LogoAvatar({
  src,
  alt = 'Logo',
  size = 'md',
  className = '',
}: LogoAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32',
  };

  const iconSizes = {
    sm: 14,
    md: 20,
    lg: 28,
    xl: 40,
  };

  const paddings = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
    xl: 'p-3',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-white border border-gray-200 overflow-hidden ${paddings[size]} flex items-center justify-center flex-shrink-0 ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      ) : (
        <Factory size={iconSizes[size]} className="text-dark-500" />
      )}
    </div>
  );
}
