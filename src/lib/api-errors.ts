/**
 * api-errors.ts
 *
 * Handler padronizado para erros retornados pelas Edge Functions do Supabase.
 *
 * O backend (manage-followers v4+) retorna dois formatos:
 *
 * NOVO (estruturado):
 *   { success: false, error: { code: "AUTH_MISSING", message: "...", request_id: "abc" } }
 *
 * LEGADO (compatibilidade):
 *   { success: false, error: "mensagem de texto" }
 *
 * Este módulo trata ambos de forma transparente.
 *
 * Uso:
 *   const result = await supabase.functions.invoke('manage-followers', { body });
 *   const err = handleApiError('manage-followers', result);
 *   if (err.code !== 'OK') {
 *     toast.error(err.message);
 *     return;
 *   }
 */

import { createLogger } from './logger';

const log = createLogger('API');

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Formato novo de erro (backend v4+) */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    request_id: string;
  };
}

/** Formato de sucesso */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  request_id?: string;
  data?: T;
  [key: string]: unknown;
}

/** Resultado normalizado do handleApiError */
export interface ApiErrorResult {
  /** 'OK' se não houve erro, caso contrário o código do erro */
  code: string;
  /** Mensagem amigável para exibir ao usuário */
  message: string;
  /** Request ID para referência no suporte (pode ser null) */
  requestId: string | null;
}

// ─── Error codes conhecidos ───────────────────────────────────────────────────

/**
 * Mapeamento de error codes para mensagens amigáveis em PT-BR.
 * O backend já retorna mensagens, mas o frontend pode sobrescrever
 * para contextos específicos de UX.
 */
const USER_MESSAGES: Partial<Record<string, string>> = {
  AUTH_MISSING: 'Você precisa estar logado para continuar.',
  AUTH_INVALID: 'Sua sessão expirou. Faça login novamente.',
  PROFILE_NOT_FOUND: 'Perfil não encontrado. Tente recarregar a página.',
  FORBIDDEN_ROLE: 'Você não tem permissão para realizar esta ação.',
  PLAN_LIMIT_REACHED: 'Você atingiu o limite do seu plano. Faça upgrade para continuar.',
  ALREADY_FOLLOWING: 'Você já segue esta fábrica.',
  ALREADY_PENDING: 'Sua solicitação está aguardando aprovação.',
  NO_FACTORY: 'Fabricante sem fábrica cadastrada.',
  FOLLOW_NOT_FOUND: 'Solicitação de seguir não encontrada.',
  OPENAI_ERROR: 'Erro ao gerar conteúdo com IA. Tente novamente em instantes.',
  UPLOAD_FORMAT: 'Formato de arquivo não suportado.',
  UPLOAD_SIZE: 'Arquivo muito grande. Verifique o tamanho máximo permitido.',
  UPLOAD_DIMENSIONS: 'Dimensões da imagem fora do esperado.',
  DB_ERROR: 'Erro no banco de dados. Tente novamente.',
  INTERNAL_ERROR: 'Erro inesperado. Tente novamente.',
};

// ─── Funções utilitárias ──────────────────────────────────────────────────────

/**
 * Verifica se a resposta é um erro no formato novo (estruturado).
 */
export function isApiError(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    (data as Record<string, unknown>).success === false &&
    'error' in data &&
    typeof (data as ApiErrorResponse).error?.code === 'string'
  );
}

/**
 * Extrai mensagem amigável de qualquer resposta de erro.
 * Suporta formato novo (code) e legado (string).
 */
export function getUserMessage(data: unknown): string {
  // Formato novo: { success: false, error: { code, message } }
  if (isApiError(data)) {
    return USER_MESSAGES[data.error.code] ?? data.error.message;
  }
  // Formato legado: { success: false, error: "mensagem" }
  if (typeof data === 'object' && data !== null && 'error' in data) {
    const err = (data as Record<string, unknown>).error;
    if (typeof err === 'string') return err;
  }
  return 'Algo deu errado. Tente novamente.';
}

/**
 * Extrai o request_id de qualquer resposta (sucesso ou erro).
 * Útil para exibir ao usuário em mensagens de suporte.
 */
export function getRequestId(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  // Formato novo de erro: error.request_id
  if (isApiError(data)) return data.error.request_id ?? null;
  // Formato de sucesso: request_id no root
  if (typeof d.request_id === 'string') return d.request_id;
  return null;
}

/**
 * Handler padrão para resultados de supabase.functions.invoke().
 *
 * Retorna { code: 'OK', message: '', requestId } em caso de sucesso.
 * Retorna { code: 'ERRO', message: '...', requestId } em caso de falha.
 *
 * @example
 * const result = await supabase.functions.invoke('generate-post', { body });
 * const err = handleApiError('generate-post', result);
 * if (err.code !== 'OK') {
 *   toast.error(err.message);
 *   return;
 * }
 */
export function handleApiError(
  fnName: string,
  result: { data: unknown; error: unknown },
): ApiErrorResult {
  const { data, error } = result;

  // Erro de rede / invocação (antes de chegar ao backend)
  if (error) {
    log.error(`${fnName} invocation failed`, { error: String(error) });
    return {
      message: 'Erro de conexão. Verifique sua internet e tente novamente.',
      code: 'NETWORK_ERROR',
      requestId: null,
    };
  }

  // Resposta de erro do backend (formato novo ou legado)
  if (isApiError(data)) {
    log.warn(`${fnName} returned error`, {
      code: data.error.code,
      rid: data.error.request_id,
    });
    return {
      message: getUserMessage(data),
      code: data.error.code,
      requestId: data.error.request_id ?? null,
    };
  }

  // Formato legado: { success: false, error: "string" }
  if (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    (data as Record<string, unknown>).success === false
  ) {
    const msg = getUserMessage(data);
    log.warn(`${fnName} returned legacy error`, { msg });
    return {
      message: msg,
      code: 'LEGACY_ERROR',
      requestId: null,
    };
  }

  // Sucesso
  return {
    message: '',
    code: 'OK',
    requestId: getRequestId(data),
  };
}
