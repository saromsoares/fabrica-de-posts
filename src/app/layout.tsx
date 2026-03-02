import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://criativopronto.com.br';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Criativo Pronto — Posts prontos para redes sociais',
    template: '%s | Criativo Pronto',
  },
  description:
    'Transforme catálogos de fabricantes em artes e textos profissionais. Sem designer, sem esforço.',
  keywords: [
    'posts para redes sociais',
    'artes automáticas',
    'marketing para lojistas',
    'gerador de posts',
    'templates para Instagram',
    'produção de conteúdo',
    'SaaS criativo',
  ],
  authors: [{ name: 'Criativo Pronto' }],
  creator: 'Criativo Pronto',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    siteName: 'Criativo Pronto',
    title: 'Criativo Pronto — Posts prontos para redes sociais',
    description:
      'Transforme catálogos de fabricantes em artes e textos profissionais. Sem designer, sem esforço.',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Criativo Pronto — Artes profissionais em minutos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Criativo Pronto — Posts prontos para redes sociais',
    description:
      'Transforme catálogos de fabricantes em artes e textos profissionais.',
    images: [`${siteUrl}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
