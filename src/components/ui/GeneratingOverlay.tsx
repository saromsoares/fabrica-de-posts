'use client';

import { useEffect, useState } from 'react';

const MESSAGES = [
  'Analisando os elementos da sua marca...',
  'Compondo a arte com seu produto...',
  'Ajustando cores e tipografia...',
  'Gerando copy personalizado...',
  'Finalizando em alta resolução...',
];

interface GeneratingOverlayProps {
  visible: boolean;
}

export default function GeneratingOverlay({ visible }: GeneratingOverlayProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      setMsgIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
      <div className="animate-spin w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full" />
      <p className="text-white mt-6 text-lg animate-pulse transition-all">
        {MESSAGES[msgIndex]}
      </p>
      <p className="text-dark-500 text-xs mt-3">
        Isso pode levar alguns segundos...
      </p>
    </div>
  );
}
