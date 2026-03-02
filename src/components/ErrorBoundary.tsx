/* eslint-disable no-console */
'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
          <div className="bg-dark-900/60 border border-dark-800/40 rounded-2xl p-8 max-w-md w-full text-center">
            <AlertTriangle size={48} className="mx-auto text-orange-400 mb-4" />
            <h2 className="font-display font-700 text-lg mb-2">Algo deu errado</h2>
            <p className="text-sm text-dark-400 mb-4">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            {this.state.error && (
              <p className="text-xs text-dark-500 mb-4 bg-dark-950 rounded-xl p-3 break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-600 rounded-xl transition-all"
            >
              <RefreshCw size={16} /> Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
