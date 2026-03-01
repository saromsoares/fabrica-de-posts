// src/types/database.ts
// ============================================================
// FABRICA DE POST — Complete Type Definitions
// Last updated: 2026-02-28
// Tables: sectors, profiles, brand_kits, factories, categories,
//         products, templates, generations, usage,
//         factory_followers, notifications
// ============================================================

// ——— Core Types ———

export type Sector = {
  id: string;
  name: string;
  slug: string;
  icon_svg: string | null;
  created_at: string | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'lojista' | 'fabricante' | 'admin' | 'super_admin';
  plan: 'free' | 'gratis' | 'basico' | 'loja' | 'intermediario' | 'pro' | 'premium' | 'super_premium';
  is_super_admin: boolean;
  onboarding_complete: boolean | null;
  store_type: string | null;
  location_city: string | null;
  location_state: string | null;
  store_voice: string | null;
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

export type Factory = {
  id: string;
  name: string;
  user_id: string | null;
  sector_id: string | null;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  whatsapp: string | null;
  niche: string | null;
  brand_differentials: string | null;
  brand_voice: string | null;
  target_audience: string | null;
  active: boolean | null;
  created_at: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  factory_id: string | null;
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
  main_benefit: string | null;
  technical_specs: string | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface TemplateZone {
  x: number;
  y: number;
  width: number;
  height: number;
  z_index?: number;
}

export interface TemplateDimensions {
  width: number;
  height: number;
}

export type Template = {
  id: string;
  name: string;
  format: 'feed' | 'story';
  factory_id: string | null;
  image_url: string | null;
  preview_url: string | null;
  product_zone: TemplateZone;
  logo_zone: TemplateZone;
  dimensions: TemplateDimensions;
  config_json: Record<string, unknown>;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  /** Nível de acesso do template: basico | intermediario | premium | super_premium */
  level: string | null;
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

export type Notification = {
  id: string;
  user_id: string;
  type: 'follow_request' | 'follow_approved' | 'follow_rejected' | 'product_used' | 'usage_limit_warning' | 'welcome';
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string | null;
};

// ——— Joined / Extended Types ———

export type SectorWithFactories = Sector & {
  factories: Factory[];
  factory_count?: number;
};

export type FactoryWithSector = Factory & {
  sectors: Pick<Sector, 'id' | 'name' | 'slug' | 'icon_svg'> | null;
};

export type FactoryWithDetails = Factory & {
  sectors: Pick<Sector, 'id' | 'name' | 'slug' | 'icon_svg'> | null;
  categories: Category[];
  templates: Template[];
};

export type FactoryWithFollowStatus = Factory & {
  sectors: Pick<Sector, 'id' | 'name' | 'slug'> | null;
  follow_status: FactoryFollower['status'] | null;
  follower_count?: number;
};

export type FactoryWithProducts = Factory & {
  products: Product[];
};

export type CategoryWithProducts = Category & {
  products: Product[];
  product_count?: number;
};

export type CategoryWithFactory = Category & {
  factories: Pick<Factory, 'id' | 'name' | 'logo_url'> | null;
};

export type ProductWithRelations = Product & {
  factories: Pick<Factory, 'id' | 'name' | 'logo_url'> | null;
  categories: Pick<Category, 'id' | 'name' | 'slug'> | null;
};

export type ProductWithFactory = Product & {
  factories: Pick<Factory, 'id' | 'name' | 'logo_url'> | null;
  categories: Pick<Category, 'id' | 'name'> | null;
};

export type TemplateWithFactory = Template & {
  factories: Pick<Factory, 'id' | 'name' | 'logo_url'> | null;
};

export type GenerationWithProduct = Generation & {
  products: Pick<Product, 'id' | 'name' | 'image_url'> | null;
  templates: Pick<Template, 'id' | 'name'> | null;
};

// ——— Dashboard Stats Types ———

export type FabricanteStats = {
  total_products: number;
  total_categories: number;
  total_templates: number;
  total_followers: number;
  pending_requests: number;
  total_generations_from_products: number;
};

export type LojistaStats = {
  total_generations: number;
  usage_count: number;
  usage_limit: number;
  usage_percentage: number;
  factories_followed: number;
  pending_follows: number;
};

// ——— Legacy types (kept for backward compatibility) ———

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

// ——— Upload Validation Types ———

export type UploadType = 'logo' | 'product' | 'template';

export interface UploadRules {
  formats: string[];
  aspect_ratio?: number;
  min_width: number;
  min_height: number;
  max_size_mb: number;
}

export const UPLOAD_RULES: Record<UploadType, UploadRules> = {
  logo: {
    formats: ['image/png'],
    aspect_ratio: 1,
    min_width: 500,
    min_height: 500,
    max_size_mb: 5,
  },
  product: {
    formats: ['image/png'],
    aspect_ratio: 1,
    min_width: 1080,
    min_height: 1080,
    max_size_mb: 10,
  },
  template: {
    formats: ['image/png', 'image/jpeg'],
    min_width: 1080,
    min_height: 1080,
    max_size_mb: 15,
  },
};

// ——— API Response Types ———

export interface ComposeImageRequest {
  template_id: string;
  product_id: string;
  generate_copy?: boolean;
  tone?: string;
  custom_prompt?: string;
}

export interface GeneratePostRequest {
  product_id: string;
  format: 'feed' | 'story';
  template_id?: string;
  tone?: string;
  custom_prompt?: string;
}

export interface GenerationResponse {
  success: boolean;
  generation: {
    id: string;
    image_url: string;
    caption: string;
    format: string;
    template_name: string | null;
    created_at: string;
  };
  usage: {
    count: number;
    limit: number;
    plan: string;
  };
}
