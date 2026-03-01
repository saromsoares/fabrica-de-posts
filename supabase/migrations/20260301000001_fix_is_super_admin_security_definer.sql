-- ============================================================
-- Migration: fix_is_super_admin_security_definer
-- Date: 2026-03-01
-- Author: Principal Engineer
--
-- Problem:
--   The function is_super_admin() was defined without SECURITY DEFINER,
--   causing infinite recursion when PostgreSQL evaluated RLS policies.
--
--   Root cause:
--   - 14 tables have super_admin_full_access_* policies using is_super_admin()
--   - is_super_admin() does SELECT FROM profiles
--   - profiles table has super_admin_full_access_profiles policy using is_super_admin()
--   - PostgreSQL enters infinite recursion evaluating the policy chain
--
--   Error: "infinite recursion detected in policy for relation 'factories'"
--
-- Fix:
--   Recreate is_super_admin() as SECURITY DEFINER + SET search_path = public
--   This makes the function execute with owner privileges (bypassing RLS),
--   breaking the recursive policy evaluation cycle.
--
-- Impact:
--   - Fixes "Erro ao criar fábrica" for super_admin users in onboarding
--   - Fixes all 14 tables with super_admin_full_access_* policies
--   - No data changes, no schema changes — function behavior is identical
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Grant execute to authenticated users (required for RLS policy evaluation)
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon;
