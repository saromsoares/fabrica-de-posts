'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';

/**
 * Hook centralizado para invocar Edge Functions do Supabase com autenticação garantida.
 * 
 * Resolve o bug de 401 Unauthorized causado por chamadas sem JWT válido.
 * 
 * Uso automático (carrega ao montar):
 *   const { data, loading, error } = useAuthenticatedFunction<T>('nome-funcao', { action: 'list' })
 * 
 * Uso manual (só chama quando o usuário clica):
 *   const { invoke, loading } = useAuthenticatedFunction<T>('nome-funcao', undefined, { autoFetch: false })
 *   // depois: await invoke({ action: 'follow', factory_id: '...' })
 */
export function useAuthenticatedFunction<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>,
  options?: {
    autoFetch?: boolean;
    enabled?: boolean;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const supabase = createClient();

  const invoke = useCallback(async (overrideBody?: Record<string, unknown>): Promise<T | null> => {
    // Guard de sessão — resolve o 401
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Sessão não autenticada');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        functionName,
        { body: overrideBody || body }
      );

      if (fnError) {
        setError(fnError.message || 'Erro na chamada da função');
        setLoading(false);
        return null;
      }

      if (!cancelledRef.current) {
        setData(result as T);
      }
      setLoading(false);
      return result as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      if (!cancelledRef.current) {
        setError(message);
      }
      setLoading(false);
      return null;
    }
  }, [functionName, body, supabase]);

  useEffect(() => {
    // Se autoFetch é false ou enabled é false, não carrega automaticamente
    if (options?.autoFetch === false || options?.enabled === false) return;

    cancelledRef.current = false;

    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelledRef.current) return;
      await invoke();
    };

    run();

    return () => {
      cancelledRef.current = true;
    };
  }, [invoke, options?.autoFetch, options?.enabled, supabase]);

  return { data, loading, error, invoke, setData };
}

/**
 * Helper para invocar uma Edge Function com guard de sessão (sem hook).
 * Útil para handlers de eventos (onClick, onSubmit).
 * 
 * Uso:
 *   const result = await invokeWithAuth('manage-followers', { action: 'follow', factory_id: '...' })
 */
export async function invokeWithAuth<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<{ data: T | null; error: string | null }> {
  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { data: null, error: 'Sessão não autenticada' };
  }

  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    if (error) {
      return { data: null, error: error.message || 'Erro na chamada da função' };
    }
    return { data: data as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}
