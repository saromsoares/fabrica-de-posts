-- ============================================================
-- MIGRATION: fix_security_and_performance
-- Date: 2026-02-28
-- Description: 
--   - Restrict write ops on shared tables (categories, factories, products, templates) to admins
--   - Fix auth.uid() -> (select auth.uid()) for RLS performance
--   - Add missing FK indexes on generations and products
--   - Remove unused indexes
-- ============================================================

-- ============================================================
-- 1. SECURITY: Restrict write operations to admins on shared tables
-- ============================================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role = 'admin'
  );
$$;

-- --- CATEGORIES ---
DROP POLICY IF EXISTS "MVP: any auth delete categories" ON public.categories;
DROP POLICY IF EXISTS "MVP: any auth insert categories" ON public.categories;
DROP POLICY IF EXISTS "MVP: any auth update categories" ON public.categories;

CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK ( (select public.is_admin()) );

CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING ( (select public.is_admin()) )
  WITH CHECK ( (select public.is_admin()) );

CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING ( (select public.is_admin()) );

-- --- FACTORIES ---
DROP POLICY IF EXISTS "MVP: any authenticated can delete factories" ON public.factories;
DROP POLICY IF EXISTS "MVP: any authenticated can insert factories" ON public.factories;
DROP POLICY IF EXISTS "MVP: any authenticated can update factories" ON public.factories;

CREATE POLICY "Admins can insert factories"
  ON public.factories FOR INSERT
  TO authenticated
  WITH CHECK ( (select public.is_admin()) );

CREATE POLICY "Admins can update factories"
  ON public.factories FOR UPDATE
  TO authenticated
  USING ( (select public.is_admin()) )
  WITH CHECK ( (select public.is_admin()) );

CREATE POLICY "Admins can delete factories"
  ON public.factories FOR DELETE
  TO authenticated
  USING ( (select public.is_admin()) );

-- --- PRODUCTS ---
DROP POLICY IF EXISTS "MVP: any authenticated can delete products" ON public.products;
DROP POLICY IF EXISTS "MVP: any authenticated can insert products" ON public.products;
DROP POLICY IF EXISTS "MVP: any authenticated can update products" ON public.products;

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK ( (select public.is_admin()) );

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING ( (select public.is_admin()) )
  WITH CHECK ( (select public.is_admin()) );

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING ( (select public.is_admin()) );

-- --- TEMPLATES ---
DROP POLICY IF EXISTS "MVP: any auth delete templates" ON public.templates;
DROP POLICY IF EXISTS "MVP: any auth insert templates" ON public.templates;
DROP POLICY IF EXISTS "MVP: any auth update templates" ON public.templates;

CREATE POLICY "Admins can insert templates"
  ON public.templates FOR INSERT
  TO authenticated
  WITH CHECK ( (select public.is_admin()) );

CREATE POLICY "Admins can update templates"
  ON public.templates FOR UPDATE
  TO authenticated
  USING ( (select public.is_admin()) )
  WITH CHECK ( (select public.is_admin()) );

CREATE POLICY "Admins can delete templates"
  ON public.templates FOR DELETE
  TO authenticated
  USING ( (select public.is_admin()) );

-- ============================================================
-- 2. PERFORMANCE: Fix auth.uid() -> (select auth.uid()) in RLS
-- ============================================================

-- --- PROFILES ---
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ( (select auth.uid()) = id );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ( (select auth.uid()) = id );

-- --- BRAND_KITS ---
DROP POLICY IF EXISTS "Users can view own brand kit" ON public.brand_kits;
DROP POLICY IF EXISTS "Users can insert own brand kit" ON public.brand_kits;
DROP POLICY IF EXISTS "Users can update own brand kit" ON public.brand_kits;

CREATE POLICY "Users can view own brand kit"
  ON public.brand_kits FOR SELECT
  TO authenticated
  USING ( (select auth.uid()) = user_id );

CREATE POLICY "Users can insert own brand kit"
  ON public.brand_kits FOR INSERT
  TO authenticated
  WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "Users can update own brand kit"
  ON public.brand_kits FOR UPDATE
  TO authenticated
  USING ( (select auth.uid()) = user_id );

-- --- GENERATIONS ---
DROP POLICY IF EXISTS "Users can view own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can insert own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can delete own generations" ON public.generations;

CREATE POLICY "Users can view own generations"
  ON public.generations FOR SELECT
  TO authenticated
  USING ( (select auth.uid()) = user_id );

CREATE POLICY "Users can insert own generations"
  ON public.generations FOR INSERT
  TO authenticated
  WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "Users can delete own generations"
  ON public.generations FOR DELETE
  TO authenticated
  USING ( (select auth.uid()) = user_id );

-- --- USAGE ---
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage;
DROP POLICY IF EXISTS "Users can upsert own usage" ON public.usage;
DROP POLICY IF EXISTS "Users can update own usage" ON public.usage;

CREATE POLICY "Users can view own usage"
  ON public.usage FOR SELECT
  TO authenticated
  USING ( (select auth.uid()) = user_id );

CREATE POLICY "Users can upsert own usage"
  ON public.usage FOR INSERT
  TO authenticated
  WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "Users can update own usage"
  ON public.usage FOR UPDATE
  TO authenticated
  USING ( (select auth.uid()) = user_id );

-- ============================================================
-- 3. INDEXES: Add missing FK indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_generations_product_id ON public.generations (product_id);
CREATE INDEX IF NOT EXISTS idx_generations_template_id ON public.generations (template_id);
CREATE INDEX IF NOT EXISTS idx_products_factory_id ON public.products (factory_id);

-- ============================================================
-- 4. INDEXES: Remove unused indexes
-- ============================================================

DROP INDEX IF EXISTS public.idx_products_active;
DROP INDEX IF EXISTS public.idx_products_tags;
DROP INDEX IF EXISTS public.idx_templates_format;
DROP INDEX IF EXISTS public.idx_templates_active;
