-- ============================================================
-- Migration 010: RLS Policies — super_admin full access
-- NÃO remove policies existentes. Apenas adiciona novas.
-- ============================================================

-- Helper: função para verificar se o usuário é super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ─────────────────────────────────────
-- PROFILES — super_admin full access
-- ─────────────────────────────────────

CREATE POLICY "super_admin_full_access_profiles"
  ON profiles FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ─────────────────────────────────────
-- FACTORIES — super_admin full access
-- ─────────────────────────────────────

CREATE POLICY "super_admin_full_access_factories"
  ON factories FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ─────────────────────────────────────
-- SECTORS — super_admin full access
-- ─────────────────────────────────────

CREATE POLICY "super_admin_full_access_sectors"
  ON sectors FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ─────────────────────────────────────
-- CATEGORIES — super_admin full access
-- ─────────────────────────────────────

CREATE POLICY "super_admin_full_access_categories"
  ON categories FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ─────────────────────────────────────
-- PRODUCTS — super_admin full access
-- ─────────────────────────────────────

CREATE POLICY "super_admin_full_access_products"
  ON products FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ─────────────────────────────────────
-- TEMPLATES — super_admin full access
-- ─────────────────────────────────────

CREATE POLICY "super_admin_full_access_templates"
  ON templates FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ─────────────────────────────────────
-- GENERATIONS — super_admin full access
-- ─────────────────────────────────────

CREATE POLICY "super_admin_full_access_generations"
  ON generations FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ─────────────────────────────────────
-- BRAND_KITS — super_admin full access
-- ─────────────────────────────────────

CREATE POLICY "super_admin_full_access_brand_kits"
  ON brand_kits FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ─────────────────────────────────────
-- USAGE — super_admin full access
-- ─────────────────────────────────────

CREATE POLICY "super_admin_full_access_usage"
  ON usage FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ─────────────────────────────────────
-- FACTORY_FOLLOWERS — super_admin full access
-- ─────────────────────────────────────

CREATE POLICY "super_admin_full_access_factory_followers"
  ON factory_followers FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ─────────────────────────────────────
-- NOTIFICATIONS — super_admin full access
-- ─────────────────────────────────────

CREATE POLICY "super_admin_full_access_notifications"
  ON notifications FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
