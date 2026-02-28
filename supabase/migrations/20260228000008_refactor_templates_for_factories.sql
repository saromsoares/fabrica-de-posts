-- ============================================================
-- MIGRATION: refactor_templates_for_factories
-- Date: 2026-02-28
-- Description:
--   1. Add factory_id to templates (templates belong to a factory)
--   2. Add product_zone and logo_zone (compositing coordinates)
--   3. Add image_url for template background image
--   4. Add dimensions column
--   5. Update RLS: fabricante manages own templates
--   6. Migrate existing 10 templates to ASX ILUMINACAO
-- ============================================================

-- 1. ADD COLUMNS TO TEMPLATES
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS product_zone jsonb DEFAULT '{"x": 190, "y": 80, "width": 700, "height": 700, "z_index": 1}'::jsonb,
  ADD COLUMN IF NOT EXISTS logo_zone jsonb DEFAULT '{"x": 880, "y": 880, "width": 150, "height": 150, "z_index": 2}'::jsonb,
  ADD COLUMN IF NOT EXISTS dimensions jsonb DEFAULT '{"width": 1080, "height": 1080}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_templates_factory_id ON public.templates (factory_id);

-- 2. UPDATE RLS
DROP POLICY IF EXISTS "MVP: any auth read all templates" ON public.templates;
DROP POLICY IF EXISTS "Admins can insert templates" ON public.templates;
DROP POLICY IF EXISTS "Admins can update templates" ON public.templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON public.templates;

CREATE POLICY "Users can view authorized templates"
  ON public.templates FOR SELECT TO authenticated
  USING (
    (select public.is_admin())
    OR factory_id IN (
      SELECT id FROM public.factories WHERE user_id = (select auth.uid())
    )
    OR factory_id IN (
      SELECT factory_id FROM public.factory_followers
      WHERE lojista_id = (select auth.uid()) AND status = 'approved'
    )
    OR factory_id IS NULL
  );

CREATE POLICY "Fabricantes can insert own templates"
  ON public.templates FOR INSERT TO authenticated
  WITH CHECK (
    factory_id IN (
      SELECT id FROM public.factories WHERE user_id = (select auth.uid())
    )
    OR (select public.is_admin())
  );

CREATE POLICY "Fabricantes can update own templates"
  ON public.templates FOR UPDATE TO authenticated
  USING (
    factory_id IN (
      SELECT id FROM public.factories WHERE user_id = (select auth.uid())
    )
    OR (select public.is_admin())
  )
  WITH CHECK (
    factory_id IN (
      SELECT id FROM public.factories WHERE user_id = (select auth.uid())
    )
    OR (select public.is_admin())
  );

CREATE POLICY "Fabricantes can delete own templates"
  ON public.templates FOR DELETE TO authenticated
  USING (
    factory_id IN (
      SELECT id FROM public.factories WHERE user_id = (select auth.uid())
    )
    OR (select public.is_admin())
  );

-- 3. MIGRATE EXISTING TEMPLATES TO ASX
UPDATE public.templates
  SET factory_id = (SELECT id FROM public.factories WHERE name = 'ASX ILUMINACAO'),
      dimensions = CASE
        WHEN format = 'feed' THEN '{"width": 1080, "height": 1080}'::jsonb
        WHEN format = 'story' THEN '{"width": 1080, "height": 1920}'::jsonb
      END,
      product_zone = CASE
        WHEN format = 'feed' THEN '{"x": 190, "y": 80, "width": 700, "height": 700, "z_index": 1}'::jsonb
        WHEN format = 'story' THEN '{"x": 140, "y": 250, "width": 800, "height": 800, "z_index": 1}'::jsonb
      END,
      logo_zone = CASE
        WHEN format = 'feed' THEN '{"x": 880, "y": 880, "width": 150, "height": 150, "z_index": 2}'::jsonb
        WHEN format = 'story' THEN '{"x": 465, "y": 1780, "width": 150, "height": 100, "z_index": 2}'::jsonb
      END
  WHERE factory_id IS NULL;
