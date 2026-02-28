-- ============================================================
-- MIGRATION: separate_lojista_fabricante
-- Date: 2026-02-28
-- Description:
--   1. Link factories to fabricante profiles (user_id)
--   2. Create factory_followers table (lojista <-> factory with approval)
--   3. Update RLS policies for role-based access
--   4. Add updated_at to generations for caption editing
--   5. Helper function is_following_factory()
-- ============================================================

-- ============================================================
-- 1. FACTORIES: Add user_id to link fabricante to factory
-- ============================================================

ALTER TABLE public.factories
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS whatsapp text;

ALTER TABLE public.factories
  ADD CONSTRAINT factories_user_id_key UNIQUE (user_id);

CREATE INDEX IF NOT EXISTS idx_factories_user_id ON public.factories (user_id);

-- ============================================================
-- 2. FACTORY_FOLLOWERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.factory_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  lojista_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  requested_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (factory_id, lojista_id)
);

CREATE INDEX IF NOT EXISTS idx_ff_factory_id ON public.factory_followers (factory_id);
CREATE INDEX IF NOT EXISTS idx_ff_lojista_id ON public.factory_followers (lojista_id);
CREATE INDEX IF NOT EXISTS idx_ff_status ON public.factory_followers (status);

ALTER TABLE public.factory_followers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. GENERATIONS: Add updated_at for caption editing
-- ============================================================

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ============================================================
-- 4. RLS: factory_followers
-- ============================================================

CREATE POLICY "Lojistas can view own follows"
  ON public.factory_followers FOR SELECT TO authenticated
  USING ( (select auth.uid()) = lojista_id );

CREATE POLICY "Fabricantes can view their factory followers"
  ON public.factory_followers FOR SELECT TO authenticated
  USING (
    factory_id IN (
      SELECT id FROM public.factories WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Lojistas can request to follow"
  ON public.factory_followers FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = lojista_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'lojista'
    )
  );

CREATE POLICY "Fabricantes can respond to follow requests"
  ON public.factory_followers FOR UPDATE TO authenticated
  USING (
    factory_id IN (
      SELECT id FROM public.factories WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    factory_id IN (
      SELECT id FROM public.factories WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Lojistas can unfollow"
  ON public.factory_followers FOR DELETE TO authenticated
  USING ( (select auth.uid()) = lojista_id );

-- ============================================================
-- 5. RLS: factories (owner-based)
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can read factories" ON public.factories;
DROP POLICY IF EXISTS "Admins can insert factories" ON public.factories;
DROP POLICY IF EXISTS "Admins can update factories" ON public.factories;
DROP POLICY IF EXISTS "Admins can delete factories" ON public.factories;

CREATE POLICY "Authenticated can browse active factories"
  ON public.factories FOR SELECT TO authenticated
  USING ( active = true OR user_id = (select auth.uid()) );

CREATE POLICY "Fabricantes can insert own factory"
  ON public.factories FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role IN ('fabricante', 'admin')
    )
  );

CREATE POLICY "Fabricantes can update own factory"
  ON public.factories FOR UPDATE TO authenticated
  USING ( user_id = (select auth.uid()) )
  WITH CHECK ( user_id = (select auth.uid()) );

CREATE POLICY "Fabricantes can delete own factory"
  ON public.factories FOR DELETE TO authenticated
  USING ( user_id = (select auth.uid()) );

-- ============================================================
-- 6. RLS: products (role-based visibility)
-- ============================================================

DROP POLICY IF EXISTS "MVP: any authenticated can view all products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

CREATE POLICY "Users can view authorized products"
  ON public.products FOR SELECT TO authenticated
  USING (
    (select public.is_admin())
    OR factory_id IN (
      SELECT id FROM public.factories WHERE user_id = (select auth.uid())
    )
    OR factory_id IN (
      SELECT factory_id FROM public.factory_followers
      WHERE lojista_id = (select auth.uid()) AND status = 'approved'
    )
  );

CREATE POLICY "Fabricantes can insert own products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (
    factory_id IN (
      SELECT id FROM public.factories WHERE user_id = (select auth.uid())
    )
    OR (select public.is_admin())
  );

CREATE POLICY "Fabricantes can update own products"
  ON public.products FOR UPDATE TO authenticated
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

CREATE POLICY "Fabricantes can delete own products"
  ON public.products FOR DELETE TO authenticated
  USING (
    factory_id IN (
      SELECT id FROM public.factories WHERE user_id = (select auth.uid())
    )
    OR (select public.is_admin())
  );

-- ============================================================
-- 7. Generations: allow caption editing
-- ============================================================

CREATE POLICY "Users can update own generations"
  ON public.generations FOR UPDATE TO authenticated
  USING ( (select auth.uid()) = user_id )
  WITH CHECK ( (select auth.uid()) = user_id );

-- ============================================================
-- 8. Helper function
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_following_factory(p_factory_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.factory_followers
    WHERE lojista_id = (select auth.uid())
    AND factory_id = p_factory_id
    AND status = 'approved'
  );
$$;
