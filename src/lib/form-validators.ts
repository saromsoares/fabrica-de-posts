/**
 * Validadores e formatadores para campos de formulário.
 * Usados no onboarding, brand kit, perfil de fábrica, etc.
 */

// ── Website ──────────────────────────────────────────────────

/**
 * Auto-adiciona https:// se o usuário digitar sem protocolo.
 * Chamado no onBlur do input.
 */
export function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Valida formato de URL.
 */
export function isValidUrl(value: string): boolean {
  if (!value) return true; // campo opcional
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// ── WhatsApp ─────────────────────────────────────────────────

/**
 * Formata número de telefone como (XX) XXXXX-XXXX.
 * Aceita apenas dígitos, máximo 11 dígitos.
 */
export function formatWhatsApp(value: string): string {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Extrai apenas dígitos do WhatsApp formatado.
 * Para salvar no banco.
 */
export function cleanWhatsApp(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida WhatsApp: 10-11 dígitos.
 */
export function isValidWhatsApp(value: string): boolean {
  if (!value) return true; // campo opcional
  const digits = cleanWhatsApp(value);
  return digits.length >= 10 && digits.length <= 13;
}

// ── Instagram ────────────────────────────────────────────────

/**
 * Normaliza handle do Instagram: remove @ e valida formato.
 */
export function normalizeInstagram(value: string): string {
  return value.replace(/^@/, '').trim();
}

/**
 * Valida formato do Instagram handle.
 */
export function isValidInstagram(value: string): boolean {
  if (!value) return true; // campo opcional
  const handle = normalizeInstagram(value);
  return /^[a-zA-Z0-9._]{1,30}$/.test(handle);
}

// ── Hex Color ────────────────────────────────────────────────

/**
 * Valida formato de cor hexadecimal.
 */
export function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}
