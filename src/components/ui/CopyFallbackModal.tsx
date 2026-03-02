'use client';

import { useRef, useEffect } from 'react';
import { X, Copy } from 'lucide-react';

interface CopyFallbackModalProps {
  text: string;
  onClose: () => void;
}

export default function CopyFallbackModal({ text, onClose }: CopyFallbackModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-select text on mount
    if (textareaRef.current) {
      textareaRef.current.select();
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Copy size={18} className="text-brand-400" />
            <h3 className="text-sm font-700 text-white">Copie o texto abaixo</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-dark-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          readOnly
          value={text}
          className="w-full h-40 px-4 py-3 bg-dark-950/50 border border-dark-800/50 rounded-xl text-white text-sm resize-none focus:outline-none focus:border-brand-500/50"
        />

        <p className="text-xs text-dark-500 mt-3">
          Selecione todo o texto e copie manualmente (Ctrl+C ou toque longo).
        </p>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-700 rounded-xl transition-all"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
