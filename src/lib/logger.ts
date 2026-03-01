/**
 * logger.ts
 *
 * Logger com níveis — debug / info / warn / error
 *
 * Em produção (NODE_ENV=production):
 *   - Apenas info / warn / error são emitidos
 *   - Saída em JSON estruturado (compatível com Vercel Logs)
 *   - Campos sensíveis são redactados automaticamente
 *
 * Em desenvolvimento:
 *   - Todos os níveis incluindo debug
 *   - Saída legível no console
 *
 * Uso:
 *   const log = createLogger('Dashboard');
 *   log.info('Loaded stats', { userId: '...', plan: 'pro' });
 *   log.error('API failed', { code: 'DB_ERROR', rid: 'abc123' });
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  level: LogLevel;
  module: string;
  msg: string;
  data?: Record<string, unknown>;
}

// ─── Configuração ─────────────────────────────────────────────────────────────

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const MIN_LEVEL: LogLevel = IS_PRODUCTION ? 'info' : 'debug';

/** Campos cujo valor deve ser redactado em produção */
const SENSITIVE_KEYS = [
  'token', 'password', 'apiKey', 'api_key', 'authorization',
  'secret', 'cookie', 'access_token', 'refresh_token',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

/**
 * Remove ou trunca dados sensíveis antes de emitir em produção.
 */
function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  if (!IS_PRODUCTION) return data;

  const safe = { ...data };
  for (const key of Object.keys(safe)) {
    if (SENSITIVE_KEYS.some(s => key.toLowerCase().includes(s))) {
      safe[key] = '[REDACTED]';
    }
    // Truncar strings longas para não poluir os logs
    if (typeof safe[key] === 'string' && (safe[key] as string).length > 200) {
      safe[key] = (safe[key] as string).slice(0, 200) + '...[truncated]';
    }
  }
  return safe;
}

function emit(
  level: LogLevel,
  module: string,
  msg: string,
  data?: Record<string, unknown>,
): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    module,
    msg,
  };

  if (data) {
    entry.data = sanitize(data);
  }

  if (IS_PRODUCTION) {
    // JSON estruturado — compatível com Vercel Logs e ferramentas de observabilidade
    const output = JSON.stringify(entry);
    if (level === 'error') console.error(output);
    else if (level === 'warn') console.warn(output);
    else console.log(output);
  } else {
    // Formato legível para desenvolvimento
    const prefix = `[${level.toUpperCase()}] [${module}]`;
    if (level === 'error') console.error(prefix, msg, data ?? '');
    else if (level === 'warn') console.warn(prefix, msg, data ?? '');
    else if (level === 'debug') console.debug(prefix, msg, data ?? '');
    else console.log(prefix, msg, data ?? '');
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

export interface Logger {
  debug: (msg: string, data?: Record<string, unknown>) => void;
  info: (msg: string, data?: Record<string, unknown>) => void;
  warn: (msg: string, data?: Record<string, unknown>) => void;
  error: (msg: string, data?: Record<string, unknown>) => void;
}

/**
 * Criar logger com escopo de módulo.
 *
 * @example
 * const log = createLogger('Dashboard');
 * log.info('Stats loaded', { userId, plan });
 * log.error('Fetch failed', { code: 'DB_ERROR' });
 */
export function createLogger(module: string): Logger {
  return {
    debug: (msg, data) => emit('debug', module, msg, data),
    info: (msg, data) => emit('info', module, msg, data),
    warn: (msg, data) => emit('warn', module, msg, data),
    error: (msg, data) => emit('error', module, msg, data),
  };
}

/** Logger global para uso rápido fora de módulos específicos */
export const logger = createLogger('App');
