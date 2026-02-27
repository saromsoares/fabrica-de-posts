'use client';

import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
};

export function Modal({ isOpen, onClose, title, children, maxWidth = 'sm:max-w-lg' }: ModalProps) {
  // Fechar com Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal content */}
      <div
        className={`relative bg-dark-900 border border-dark-800 rounded-t-3xl sm:rounded-2xl p-6 w-full ${maxWidth} space-y-4 max-h-[90vh] overflow-y-auto animate-fade-in-up`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com título e botão X */}
        <div className="flex items-center justify-between">
          <h2 className="font-display font-700 text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-dark-800 transition-colors"
            aria-label="Fechar"
          >
            <X size={20} className="text-dark-400" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
