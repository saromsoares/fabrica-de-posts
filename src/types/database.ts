export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  plan: 'free' | 'loja' | 'pro';
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
};

export type BrandKit = {
  id: string;
  user_id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  store_name: string | null;
  instagram_handle: string | null;
  whatsapp: string | null;
  font_family: string | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type Factory = {
  id: string;
  name: string;
  logo_url: string | null;
  active: boolean;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  factory_id: string | null;
  image_url: string | null;
  tags: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  factory?: Factory;
};

export type TemplateConfig = {
  // Posições e estilos dos elementos no template
  productImage: { x: number; y: number; width: number; height: number };
  logo: { x: number; y: number; width: number; height: number };
  productName: { x: number; y: number; fontSize: number; color: string; fontWeight: string };
  price: { x: number; y: number; fontSize: number; color: string; fontWeight: string };
  cta: { x: number; y: number; fontSize: number; color: string };
  contact: { x: number; y: number; fontSize: number; color: string };
  background: { type: 'solid' | 'gradient'; value: string };
  overlay?: { color: string; opacity: number };
};

export type Template = {
  id: string;
  name: string;
  format: 'feed' | 'story';
  preview_url: string | null;
  config_json: TemplateConfig;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Generation = {
  id: string;
  user_id: string;
  product_id: string | null;
  template_id: string | null;
  image_url: string | null;
  caption: string | null;
  fields_data: GenerationFields;
  format: 'feed' | 'story';
  created_at: string;
  product?: Product;
  template?: Template;
};

export type GenerationFields = {
  price?: string;
  condition?: string;
  cta?: string;
  customText?: string;
};

export type UsageInfo = {
  count: number;
  limit: number;
  plan: string;
  remaining: number;
};

export type CaptionStyle = 'oferta' | 'institucional' | 'lancamento' | 'estoque_limitado' | 'beneficio';
