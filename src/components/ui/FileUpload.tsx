'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, CheckCircle } from 'lucide-react';
import {
  validateFile,
  getAcceptString,
  getUploadHint,
  type UploadType,
  type ValidationResult,
} from '@/lib/upload-validator';
import { createClient } from '@/lib/supabase-browser';
import { createLogger } from '@/lib/logger';
import { handleApiError } from '@/lib/api-errors';

const log = createLogger('FileUpload');

// ============================================================
// FileUpload — Componente reutilizável de upload
// Valida client-side ANTES de enviar ao backend (Edge Function)
// ============================================================

interface FileUploadProps {
  /** Tipo de upload — define as regras de validação */
  type: UploadType;
  /** URL atual (para exibir preview inicial) */
  currentUrl?: string | null;
  /** Chamado com a URL pública após upload bem-sucedido */
  onUploadComplete: (url: string) => void;
  /** Chamado com a mensagem de erro */
  onError?: (message: string) => void;
  /** Label do botão de upload */
  label?: string;
  /** Desabilitar o componente */
  disabled?: boolean;
  /** Classe CSS adicional para o container */
  className?: string;
}

export function FileUpload({
  type,
  currentUrl,
  onUploadComplete,
  onError,
  label,
  disabled = false,
  className = '',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const hint = getUploadHint(type);
  const accept = getAcceptString(type);
  const defaultLabel = label ?? getDefaultLabel(type);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset estados
    setError(null);
    setSuccess(false);

    // === VALIDAÇÃO CLIENT-SIDE (mesmas regras do backend) ===
    const result: ValidationResult = await validateFile(file, type);

    if (!result.valid) {
      setError(result.error!);
      onError?.(result.error!);
      // Limpar input para permitir re-seleção do mesmo arquivo
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    // Preview imediato (antes do upload)
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // === UPLOAD VIA EDGE FUNCTION (validação server-side) ===
    setUploading(true);
    try {
      // Verificar sessão antes de chamar Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const msg = 'Sessão expirada. Faça login novamente.';
        setError(msg);
        onError?.(msg);
        setPreview(currentUrl ?? null);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const { data, error: fnError } = await supabase.functions.invoke(
        'validate-upload',
        {
          body: formData,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      // Usar handleApiError para tratar tanto formato novo quanto legado
      const apiErr = handleApiError('validate-upload', { data, error: fnError });
      if (apiErr.code !== 'OK') {
        const msg = apiErr.message || 'Erro no upload. Tente novamente.';
        log.warn('Upload failed', { type, code: apiErr.code, rid: apiErr.requestId });
        setError(msg);
        onError?.(msg);
        setPreview(currentUrl ?? null);
        return;
      }

      // Sucesso
      setSuccess(true);
      onUploadComplete(data.url);
    } catch (err) {
      const msg = 'Erro inesperado no upload. Tente novamente.';
      setError(msg);
      onError?.(msg);
      setPreview(currentUrl ?? null);
      log.error('Unexpected upload error', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setUploading(false);
      // Limpar ObjectURL para evitar memory leak
      URL.revokeObjectURL(objectUrl);
    }
  }

  function handleClear() {
    setPreview(null);
    setError(null);
    setSuccess(false);
    if (inputRef.current) inputRef.current.value = '';
    onUploadComplete('');
  }

  const isDisabled = disabled || uploading;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Área de upload */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer
          ${isDisabled ? 'opacity-50 cursor-not-allowed border-white/10' : 'border-white/20 hover:border-white/40'}
          ${error ? 'border-red-500/50 bg-red-500/5' : ''}
          ${success ? 'border-green-500/50 bg-green-500/5' : ''}
        `}
        onClick={() => !isDisabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={isDisabled}
          className="hidden"
          aria-label={defaultLabel}
        />

        {/* Preview de imagem */}
        {preview && !error ? (
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white rounded-xl p-2 w-24 h-24 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            {success && (
              <div className="flex items-center gap-1 text-green-400 text-xs">
                <CheckCircle className="w-3 h-3" />
                <span>Upload concluído</span>
              </div>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="text-xs text-white/40 hover:text-white/70 underline"
              disabled={isDisabled}
            >
              Remover imagem
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            {uploading ? (
              <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-white/40" />
            )}
            <p className="text-sm text-white/60">
              {uploading ? 'Enviando...' : defaultLabel}
            </p>
            <p className="text-xs text-white/30">Clique para selecionar</p>
          </div>
        )}
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Hint de requisitos */}
      <p className="text-xs text-white/30">{hint}</p>
    </div>
  );
}

// ── Helpers internos ──────────────────────────────────────────

function getDefaultLabel(type: UploadType): string {
  switch (type) {
    case 'logo':        return 'Fazer upload do logo da fábrica';
    case 'brand-logo':  return 'Fazer upload do logo da loja';
    case 'product':     return 'Fazer upload da foto do produto';
    case 'template':    return 'Fazer upload do preview do template';
  }
}
