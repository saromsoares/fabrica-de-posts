'use client';

/**
 * ErrorMessage.tsx
 *
 * Componente de exibição de erro com Request ID opcional.
 * Quando um erro tem request_id, o usuário pode usá-lo como
 * referência ao contatar o suporte.
 *
 * Uso:
 *   <ErrorMessage message={err.message} requestId={err.requestId} />
 *
 * Ou em toasts (quando o sistema de toast suportar JSX):
 *   toast.error(<ErrorMessage message={msg} requestId={rid} />);
 */

interface ErrorMessageProps {
  /** Mensagem de erro amigável */
  message: string;
  /** Request ID do backend para referência no suporte */
  requestId?: string | null;
  /** Classe CSS adicional */
  className?: string;
}

export function ErrorMessage({ message, requestId, className = '' }: ErrorMessageProps) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span>{message}</span>
      {requestId && (
        <span className="text-xs opacity-50 font-mono">
          Ref: {requestId}
        </span>
      )}
    </div>
  );
}
