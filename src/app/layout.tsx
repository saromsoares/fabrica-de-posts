import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fábrica de Posts — Artes automáticas para sua loja',
  description: 'Gere artes profissionais para suas redes sociais em minutos. Marketing pronto sem designer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
