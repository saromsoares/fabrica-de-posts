// src/types/database.ts

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'lojista' | 'fabricante' | 'admin';
  plan: 'free' | 'loja' | 'pro';
  onboarding_complete: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type BrandKit = {
  id: string;
  user_id: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  store_name: string | null;
  instagram_handle: string | null;
  whatsapp: string | null;
  font_family: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  created_at: string | null;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  image_url: string | null;
  tags: string[] | null;
  active: boolean | null;
  factory_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  category?: Category | null;
  factory?: Factory | null;
};

export type Factory = {
  id: string;
  name: string;
  logo_url: string | null;
  active: boolean | null;
  created_at: string | null;
};

export type Template = {
  id: string;
  name: string;
  format: 'feed' | 'story';
  preview_url: string | null;
  config_json: Record<string, unknown>;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Generation = {
  id: string;
  user_id: string;
  product_id: string | null;
  template_id: string | null;
  image_url: string | null;
  caption: string | null;
  fields_data: Record<string, unknown> | null;
  format: 'feed' | 'story';
  created_at: string | null;
};

export type Usage = {
  id: string;
  user_id: string;
  month: string;
  count: number | null;
};

export type UsageInfo = {
  count: number;
  limit: number;
  remaining: number;
  plan: string;
};

export type CaptionStyle = 'vendas' | 'informativo' | 'engajamento' | 'urgencia' | 'oferta' | 'institucional' | 'lancamento' | 'estoque_limitado' | 'beneficio';

export type GenerationFields = {
  price?: string;
  condition?: string;
  cta?: string;
};
