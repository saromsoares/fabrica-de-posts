'use client';

// src/components/admin/AdminTestModeBanner.tsx
// Banner persistente que aparece no topo do dashboard quando o Super Admin
// está navegando em modo de teste (como Lojista ou Fabricante).

import { FlaskConical, X } from 'lucide-react';
import type { TestRole } from '@/hooks/useAdminTestMode';

interface AdminTestModeBannerProps {
  testRole: TestRole;
  onExit: () => void;
}

export function AdminTestModeBanner({ testRole, onExit }: AdminTestModeBannerProps) {
  if (!testRole) return null;

  const label = testRole === 'lojista' ? 'Lojista' : 'Fabricante';
  const color = testRole === 'lojista' ? 'brand' : 'blue';

  return (
    <div
      className={`
        sticky top-0 z-50 w-full flex items-center justify-between gap-3
        px-4 py-2.5 text-sm font-600
        ${color === 'brand'
          ? 'bg-brand-600/20 border-b border-brand-500/30 text-brand-300'
          : 'bg-blue-600/20 border-b border-blue-500/30 text-blue-300'
        }
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <FlaskConical size={15} className="shrink-0" />
        <span>
          Modo de teste ativo — você está visualizando o painel como{' '}
          <strong className="font-800">{label}</strong>.
          Suas ações reais são preservadas.
        </span>
      </div>
      <button
        onClick={onExit}
        className={`
          flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-700 transition-all
          ${color === 'brand'
            ? 'bg-brand-600/30 hover:bg-brand-600/50 text-brand-200'
            : 'bg-blue-600/30 hover:bg-blue-600/50 text-blue-200'
          }
        `}
        aria-label="Sair do modo de teste"
      >
        <X size={12} />
        Sair do modo de teste
      </button>
    </div>
  );
}
