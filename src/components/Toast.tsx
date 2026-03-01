'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  addToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />,
    error: <AlertCircle size={18} className="text-red-400 flex-shrink-0" />,
    info: <Info size={18} className="text-blue-400 flex-shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-500/30 bg-emerald-500/10',
    error: 'border-red-500/30 bg-red-500/10',
    info: 'border-blue-500/30 bg-blue-500/10',
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg animate-fade-in-up ${borders[toast.type]}`}
    >
      {icons[toast.type]}
      <p className="text-sm text-white flex-1">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-0.5 rounded hover:bg-dark-700/60 transition-colors flex-shrink-0"
      >
        <X size={14} className="text-dark-400" />
      </button>
    </div>
  );
}
