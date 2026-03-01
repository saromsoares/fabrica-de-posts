import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fabricadeposts.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Fábrica de Posts — Do produto ao post, em segundos',
    template: '%s | Fábrica de Posts',
  },
  description:
    'Plataforma que transforma produtos em posts prontos para redes sociais. Escolha o produto, aplique sua marca e baixe artes profissionais para Feed e Story em minutos.',
  keywords: [
    'posts para redes sociais',
    'artes automáticas',
    'marketing para lojistas',
    'gerador de posts',
    'templates para Instagram',
    'fábrica de conteúdo',
    'SaaS criativo',
  ],
  authors: [{ name: 'Fábrica de Posts' }],
  creator: 'Fábrica de Posts',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    siteName: 'Fábrica de Posts',
    title: 'Fábrica de Posts — Do produto ao post, em segundos',
    description:
      'Plataforma que transforma produtos em posts prontos para redes sociais. Escolha o produto, aplique sua marca e baixe artes profissionais.',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Fábrica de Posts — Artes profissionais em minutos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fábrica de Posts — Do produto ao post, em segundos',
    description:
      'Plataforma que transforma produtos em posts prontos para redes sociais.',
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
