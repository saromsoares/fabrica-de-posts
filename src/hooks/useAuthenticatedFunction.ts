'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { createLogger } from '@/lib/logger';

const logSession = createLogger('SessionGuard');
const logEdge = createLogger('EdgeFunction');
const logHook = createLogger('useAuthenticatedFunction');

/**
 * Garante que existe uma sessão ativa e que o access_token está fresco
 * antes de invocar qualquer Edge Function.
 *
 * Fluxo:
 * 1. getSession() — verifica se existe sessão no cache
 * 2. Se não existe → retorna erro (sem sessão)
 * 3. Se existe → getUser() para forçar validação server-side e refresh automático
 * 4. getSession() novamente para pegar o token atualizado
 */
async function ensureFreshSession() {
  const supabase = createClient();

  // Step 1: Verificar se existe sessão no cache
  const { data: { session: cachedSession } } = await supabase.auth.getSession();
  if (!cachedSession) {
    logSession.warn('No active session in cache — aborting Edge Function call');
    return { supabase, session: null, error: 'Sem sessão ativa' };
  }

  // Step 2: getUser() força validação server-side e refresh automático do token
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    logSession.error('getUser() failed', { error: userError?.message });
    // Tentar refresh explícito como última tentativa
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      logSession.error('refreshSession() also failed', { error: refreshError.message });
      return { supabase, session: null, error: 'Sessão expirada — faça login novamente' };
    }
  }

  // Step 3: Pegar sessão atualizada após getUser()/refresh
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    logSession.error('Session null after refresh — user must login');
    return { supabase, session: null, error: 'Sessão não encontrada após refresh' };
  }

  logSession.debug('Session valid', {
    expiresAt: new Date((session.expires_at || 0) * 1000).toISOString(),
  });
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
    // SESSION GUARD: Garante sessão ativa antes de qualquer chamada
    const { supabase, session, error: authError } = await ensureFreshSession();
    if (authError || !session) {
      logHook.error(`${functionName}: invalid session`, { error: authError });
      if (!cancelledRef.current) {
        setError(authError || 'Sessão não autenticada');
      }
      return null;
    }

    if (cancelledRef.current) return null;

    setLoading(true);
    setError(null);

    try {
      logEdge.debug(`Calling ${functionName}`);
      const { data: result, error: fnError } = await supabase.functions.invoke(
        functionName,
        { body: overrideBody || body }
      );

      if (fnError) {
        logEdge.error(`${functionName} error`, { error: fnError.message });

        // Se 401, tentar refresh explícito + retry UMA VEZ
        if (fnError.message?.includes('401') || fnError.message?.includes('Unauthorized') || fnError.message?.includes('non-2xx')) {
          logEdge.warn(`${functionName}: 401 detected — attempting refresh + retry`);
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            // Verificar sessão novamente após refresh
            const { data: { session: freshSession } } = await supabase.auth.getSession();
            if (freshSession && !cancelledRef.current) {
              const { data: retryResult, error: retryError } = await supabase.functions.invoke(
                functionName,
                { body: overrideBody || body }
              );
              if (!retryError && !cancelledRef.current) {
                logEdge.info(`${functionName}: retry succeeded`);
                setData(retryResult as T);
                setLoading(false);
                return retryResult as T;
              }
              if (retryError) {
                logEdge.error(`${functionName}: retry also failed`, { error: retryError.message });
              }
            }
          } else {
            logEdge.error(`${functionName}: refreshSession failed`, { error: refreshError.message });
          }
        }

        if (!cancelledRef.current) {
          setError(fnError.message || 'Erro na chamada da função');
        }
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
      logEdge.error(`${functionName}: exception`, { error: message });
      if (!cancelledRef.current) {
        setError(message);
      }
      setLoading(false);
      return null;
    }
  }, [functionName, body]);

  // Auto-fetch com cleanup para evitar chamadas duplicadas
  useEffect(() => {
    if (options?.autoFetch === false || options?.enabled === false) return;

    cancelledRef.current = false;

    const run = async () => {
      // SESSION GUARD no useEffect
      const { session } = await ensureFreshSession();
      if (!session || cancelledRef.current) {
        logHook.debug(`${functionName}: useEffect aborted — no session or cancelled`);
        return;
      }
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
  const logInvoke = createLogger('invokeWithAuth');

  // SESSION GUARD: Garante sessão ativa antes de qualquer chamada
  const { supabase, session, error: authError } = await ensureFreshSession();
  if (authError || !session) {
    logInvoke.error(`${functionName}: invalid session`, { error: authError });
    return { data: null, error: authError || 'Sessão não autenticada' };
  }

  try {
    logInvoke.debug(`Calling ${functionName}`);
    const { data, error } = await supabase.functions.invoke(functionName, { body });

    if (error) {
      logInvoke.error(`${functionName} error`, { error: error.message });

      // Se 401, tentar refresh + retry UMA VEZ
      if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('non-2xx')) {
        logInvoke.warn(`${functionName}: 401 detected — attempting refresh + retry`);
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) {
          // Verificar sessão novamente
          const { data: { session: freshSession } } = await supabase.auth.getSession();
          if (freshSession) {
            const { data: retryData, error: retryError } = await supabase.functions.invoke(functionName, { body });
            if (!retryError) {
              logInvoke.info(`${functionName}: retry succeeded`);
              return { data: retryData as T, error: null };
            }
            logInvoke.error(`${functionName}: retry also failed`, { error: retryError.message });
            return { data: null, error: retryError.message || 'Erro após retry' };
          }
        } else {
          logInvoke.error(`${functionName}: refreshSession failed`, { error: refreshError.message });
        }
      }
      return { data: null, error: error.message || 'Erro na chamada da função' };
    }

    return { data: data as T, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    logInvoke.error(`${functionName}: exception`, { error: message });
    return { data: null, error: message };
  }
}
