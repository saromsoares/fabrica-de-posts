-- ============================================================
-- MIGRATION: add_sectors_and_refactor_categories
-- Date: 2026-02-28
-- Description:
--   1. Create sectors table with 8 initial sectors
--   2. Add sector_id to factories
--   3. Add factory_id to categories (categories become per-factory)
--   4. Migrate existing data (ASX → Automotivo, categories → ASX)
--   5. RLS policies
-- ============================================================

-- 1. SECTORS TABLE
CREATE TABLE IF NOT EXISTS public.sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon_svg text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sectors"
  ON public.sectors FOR SELECT TO authenticated
  USING ( true );

CREATE POLICY "Admins can insert sectors"
  ON public.sectors FOR INSERT TO authenticated
  WITH CHECK ( (select public.is_admin()) );

CREATE POLICY "Admins can update sectors"
  ON public.sectors FOR UPDATE TO authenticated
  USING ( (select public.is_admin()) )
  WITH CHECK ( (select public.is_admin()) );

CREATE POLICY "Admins can delete sectors"
  ON public.sectors FOR DELETE TO authenticated
  USING ( (select public.is_admin()) );

-- 2. FACTORIES: add sector_id
ALTER TABLE public.factories
  ADD COLUMN IF NOT EXISTS sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_factories_sector_id ON public.factories (sector_id);

-- 3. CATEGORIES: add factory_id, refactor constraints
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categories_factory_id ON public.categories (factory_id);

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_slug_key;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_factory_name_key UNIQUE (factory_id, name);

ALTER TABLE public.categories
  ADD CONSTRAINT categories_factory_slug_key UNIQUE (factory_id, slug);

-- 4. RLS: categories (per-factory)
DROP POLICY IF EXISTS "MVP: any auth read categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;

CREATE POLICY "Users can view authorized categories"
  ON public.categories FOR SELECT TO authenticated
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

CREATE POLICY "Fabricantes can insert own categories"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (
    factory_id IN (
      SELECT id FROM public.factories WHERE user_id = (select auth.uid())
    )
    OR (select public.is_admin())
  );

CREATE POLICY "Fabricantes can update own categories"
  ON public.categories FOR UPDATE TO authenticated
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

CREATE POLICY "Fabricantes can delete own categories"
  ON public.categories FOR DELETE TO authenticated
  USING (
    factory_id IN (
      SELECT id FROM public.factories WHERE user_id = (select auth.uid())
    )
    OR (select public.is_admin())
  );

-- 5. POPULATE SECTORS
INSERT INTO public.sectors (name, slug, icon_svg) VALUES
  ('Automotivo', 'automotivo', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-4l2-5h10l2 5v4h-2"/><path d="M5 12h14"/></svg>'),
  ('Serviços', 'servicos', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>'),
  ('Moda e Vestuário', 'moda-e-vestuario', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>'),
  ('Saúde e Odontologia', 'saude-e-odontologia', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/></svg>'),
  ('Alimentos e Bebidas', 'alimentos-e-bebidas', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>'),
  ('Casa e Construção', 'casa-e-construcao', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'),
  ('Tecnologia', 'tecnologia', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'),
  ('Outros', 'outros', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>');

-- 6. MIGRATE EXISTING DATA
UPDATE public.factories
  SET sector_id = (SELECT id FROM public.sectors WHERE slug = 'automotivo')
  WHERE name = 'ASX ILUMINACAO';

UPDATE public.categories
  SET factory_id = (SELECT id FROM public.factories WHERE name = 'ASX ILUMINACAO')
  WHERE factory_id IS NULL;
