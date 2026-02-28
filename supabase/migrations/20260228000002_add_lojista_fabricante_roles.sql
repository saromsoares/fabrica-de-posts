-- ============================================================
-- MIGRATION: add_lojista_fabricante_roles
-- Date: 2026-02-28
-- Description:
--   - Update CHECK constraint on profiles.role: user/admin -> lojista/fabricante/admin
--   - Change default from 'user' to 'lojista'
--   - Migrate existing 'user' roles to 'lojista'
--   - Update handle_new_user trigger to read role from signup metadata
-- ============================================================

-- 1. Drop old constraint first
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Migrate existing data
UPDATE public.profiles
  SET role = 'lojista'
  WHERE role = 'user';

-- 3. Add new constraint
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['lojista'::text, 'fabricante'::text, 'admin'::text]));

-- 4. Update default value
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'lojista'::text;

-- 5. Update trigger to read role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _role text;
BEGIN
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'lojista');

  -- Only allow lojista/fabricante via signup (admin is set manually)
  IF _role NOT IN ('lojista', 'fabricante') THEN
    _role := 'lojista';
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    _role
  );
  RETURN NEW;
END;
$$;
