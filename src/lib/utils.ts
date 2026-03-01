export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Extrai mensagem de erro de qualquer tipo — Error, objeto Supabase, string, etc */
export function extractError(err: unknown): string {
  if (!err) return 'Erro desconhecido';
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.details === 'string') return obj.details;
    try { return JSON.stringify(err); } catch { return 'Erro desconhecido'; }
  }
  return String(err);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return formatDate(dateStr);
}

export function getSupabaseStorageUrl(bucket: string, path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * @deprecated Use getPlanLimit() ou getAllPlanLimits() de '@/lib/plan-limits' em vez disso.
 * PLAN_LIMITS foi removido pois continha valores desatualizados (loja=30, pro=200).
 * A fonte única de verdade é a tabela `plan_limits` do Supabase.
 */
// PLAN_LIMITS removido — ver src/lib/plan-limits.ts

export const PLAN_LABELS: Record<string, string> = { free: 'Free', loja: 'Loja', pro: 'Pro' };
