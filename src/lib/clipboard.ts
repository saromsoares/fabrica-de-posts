/**
 * Copia texto para o clipboard com fallback para modal.
 * Retorna true se copiou com sucesso, false se precisa de fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Tentar API moderna
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback: execCommand (deprecated mas funciona em mais contextos)
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);

    return success;
  } catch {
    return false;
  }
}
