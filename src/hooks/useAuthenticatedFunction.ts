'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';

/**
 * Garante que o access_token está fresco antes de invocar uma Edge Function.
 * 
 * O @supabase/ssr armazena o token em cookies. Se o access_token expirou,
 * getSession() retorna a sessão do cache (com token expirado), e o gateway
 * do Supabase rejeita com 401.
 * 
 * A solução: chamar getUser() que força validação server-side e refresh
 * automático do token, OU chamar refreshSession() explicitamente.
 */
async function ensureFreshSession() {
  const supabase = createClient();

  // getUser() valida o token no servidor e faz refresh automático se expirado
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { supabase, session: null, error: 'Sessão não autenticada' };
  }

  // Agora getSession() retorna o token atualizado
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { supabase, session: null, error: 'Sessão não encontrada após refresh' };
  }

  return { supabase, session, error: null };
}

/**
 * Hook centralizado para invocar Edge Functions do Supabase com autenticação garantida.
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

  const invoke = useCallback(async (overrideBody?: Record<string, unknown>): Promise<T | null> => {
    // Garante token fresco antes de invocar
    const { supabase, session, error: authError } = await ensureFreshSession();
    if (authError || !session) {
      setError(authError || 'Sessão não autenticada');
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
        // Se ainda receber 401, tentar refresh explícito e retry uma vez
        if (fnError.message?.includes('401') || fnError.message?.includes('Unauthorized')) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            const { data: retryResult, error: retryError } = await supabase.functions.invoke(
              functionName,
              { body: overrideBody || body }
            );
            if (!retryError && !cancelledRef.current) {
              setData(retryResult as T);
              setLoading(false);
              return retryResult as T;
            }
          }
        }

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
  }, [functionName, body]);

  useEffect(() => {
    if (options?.autoFetch === false || options?.enabled === false) return;

    cancelledRef.current = false;

    const run = async () => {
      const { session } = await ensureFreshSession();
      if (!session || cancelledRef.current) return;
      await invoke();
    };

    run();

    return () => {
      cancelledRef.current = true;
    };
  }, [invoke, options?.autoFetch, options?.enabled]);

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
  // Garante token fresco
  const { supabase, session, error: authError } = await ensureFreshSession();
  if (authError || !session) {
    return { data: null, error: authError || 'Sessão não autenticada' };
  }

  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body });

    if (error) {
      // Se 401, tentar refresh + retry uma vez
      if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('non-2xx')) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) {
          const { data: retryData, error: retryError } = await supabase.functions.invoke(functionName, { body });
          if (!retryError) {
            return { data: retryData as T, error: null };
          }
          return { data: null, error: retryError.message || 'Erro após retry' };
        }
      }
      return { data: null, error: error.message || 'Erro na chamada da função' };
    }

    return { data: data as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}
