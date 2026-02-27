'use client';

import { LogOut, Sparkles } from 'lucide-react';

interface HeaderProps {
  onLogout: () => void;
}

export default function Header({ onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="font-display font-700 text-lg tracking-tight">
            Fábrica de <span className="text-brand-400">Posts</span>
          </span>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm text-dark-400 hover:text-white rounded-xl hover:bg-dark-800/60 transition-all"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </header>
  );
}
