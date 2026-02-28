import type { Template } from '@/types/database';

export type DesignStyle = 'oferta-varejo' | 'minimalista' | 'lancamento-moderno';

export const DESIGN_STYLES: { value: DesignStyle; label: string; description: string; icon: string }[] = [
  {
    value: 'oferta-varejo',
    label: 'Oferta Varejo',
    description: 'Preço gigante, faixas chamativas, foco em urgência',
    icon: '🔥',
  },
  {
    value: 'minimalista',
    label: 'Minimalista',
    description: 'Design clean, tipografia fina, produto em destaque',
    icon: '✨',
  },
  {
    value: 'lancamento-moderno',
    label: 'Lançamento',
    description: 'Fundo escuro, glassmorphism, foco em desejo',
    icon: '🚀',
  },
];

// Templates padrão hardcoded para fallback quando a tabela templates está vazia
export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'default-oferta',
    name: 'Oferta Varejo',
    format: 'feed',
    factory_id: null,
    image_url: null,
    preview_url: null,
    product_zone: { x: 190, y: 80, width: 700, height: 700, z_index: 1 },
    logo_zone: { x: 880, y: 880, width: 150, height: 150, z_index: 2 },
    dimensions: { width: 1080, height: 1080 },
    config_json: {
      productImage: { x: 50, y: 10, width: 80, height: 45 },
      logo: { x: 3, y: 3, width: 15, height: 8 },
      productName: { x: 5, y: 60, fontSize: 20, color: '#FFFFFF', fontWeight: 'bold' },
      price: { x: 5, y: 72, fontSize: 36, color: '#FFD700', fontWeight: 'bold' },
      cta: { x: 5, y: 88, fontSize: 14, color: '#FFFFFF' },
      contact: { x: 70, y: 3, fontSize: 9, color: '#FFFFFF' },
      background: { type: 'gradient', value: 'linear-gradient(135deg, #e0604e, #cc4533)' },
    },
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-minimalista',
    name: 'Minimalista Elegante',
    format: 'feed',
    factory_id: null,
    image_url: null,
    preview_url: null,
    product_zone: { x: 190, y: 80, width: 700, height: 700, z_index: 1 },
    logo_zone: { x: 880, y: 880, width: 150, height: 150, z_index: 2 },
    dimensions: { width: 1080, height: 1080 },
    config_json: {
      productImage: { x: 50, y: 15, width: 70, height: 50 },
      logo: { x: 5, y: 5, width: 12, height: 6 },
      productName: { x: 5, y: 70, fontSize: 16, color: '#1a1b2e', fontWeight: '500' },
      price: { x: 5, y: 82, fontSize: 22, color: '#1a1b2e', fontWeight: '600' },
      cta: { x: 5, y: 92, fontSize: 11, color: '#6d6f8b' },
      contact: { x: 70, y: 5, fontSize: 8, color: '#6d6f8b' },
      background: { type: 'solid', value: '#f6f6f9' },
    },
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-lancamento',
    name: 'Lançamento Moderno',
    format: 'feed',
    factory_id: null,
    image_url: null,
    preview_url: null,
    product_zone: { x: 190, y: 80, width: 700, height: 700, z_index: 1 },
    logo_zone: { x: 880, y: 880, width: 150, height: 150, z_index: 2 },
    dimensions: { width: 1080, height: 1080 },
    config_json: {
      productImage: { x: 50, y: 10, width: 75, height: 48 },
      logo: { x: 5, y: 5, width: 14, height: 7 },
      productName: { x: 5, y: 65, fontSize: 18, color: '#FFFFFF', fontWeight: '600' },
      price: { x: 5, y: 78, fontSize: 26, color: '#a78bfa', fontWeight: 'bold' },
      cta: { x: 5, y: 90, fontSize: 12, color: '#e0e0ff' },
      contact: { x: 70, y: 5, fontSize: 8, color: '#a78bfa' },
      background: { type: 'gradient', value: 'linear-gradient(135deg, #0f0f23, #1a1040, #0f0f23)' },
      overlay: { color: '#a78bfa', opacity: 0.05 },
    },
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
