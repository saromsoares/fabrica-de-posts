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

export type Factory = {
  id: string;
  name: string;
  user_id: string | null;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  whatsapp: string | null;
  active: boolean | null;
  created_at: string | null;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  factory_id: string | null;
  image_url: string | null;
  tags: string[] | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
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
  updated_at: string | null;
};

export type Usage = {
  id: string;
  user_id: string;
  month: string;
  count: number | null;
};

export type FactoryFollower = {
  id: string;
  factory_id: string;
  lojista_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string | null;
  responded_at: string | null;
};

// ——— Joined/extended types for frontend convenience ———

export type FactoryWithProducts = Factory & {
  products: Product[];
};

export type FactoryWithFollowStatus = Factory & {
  follow_status: FactoryFollower['status'] | null;
  follower_count?: number;
};

export type ProductWithFactory = Product & {
  factories: Pick<Factory, 'id' | 'name' | 'logo_url'> | null;
  categories: Pick<Category, 'id' | 'name'> | null;
};

export type GenerationWithProduct = Generation & {
  products: Pick<Product, 'id' | 'name' | 'image_url'> | null;
};

// ——— Dashboard stats types ———

export type FabricanteStats = {
  total_products: number;
  total_followers: number;
  pending_requests: number;
  total_generations_from_products: number;
};

export type CaptionStyle = 'oferta' | 'informativo' | 'urgencia' | 'storytelling' | 'institucional' | 'lancamento' | 'estoque_limitado' | 'beneficio';

export type GenerationFields = {
  price: string;
  condition: string;
  cta: string;
};

export type UsageInfo = {
  usage_count: number;
  usage_limit: number;
  usage_percentage: number;
  count: number;
  limit: number;
  remaining: number;
  plan: string;
};

export type LojistaStats = {
  total_generations: number;
  usage_count: number;
  usage_limit: number;
  factories_followed: number;
};
