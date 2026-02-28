-- ============================================================
-- MIGRATION: create_notifications_system + fix insert policy
-- Date: 2026-02-28
-- Description:
--   1. Create notifications table
--   2. RLS policies (user sees/updates/deletes own only)
--   3. Indexes for performance
--   4. Helper function create_notification (SECURITY DEFINER)
-- NOTE: No INSERT policy for authenticated — notifications are
--       created via service_role in Edge Functions or via the
--       SECURITY DEFINER function create_notification().
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type = ANY (ARRAY[
    'follow_request'::text,
    'follow_approved'::text,
    'follow_rejected'::text,
    'product_used'::text,
    'usage_limit_warning'::text,
    'welcome'::text
  ])),
  title text NOT NULL,
  body text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_created ON public.notifications (created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING ( (select auth.uid()) = user_id );

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING ( (select auth.uid()) = user_id )
  WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING ( (select auth.uid()) = user_id );

-- Helper function (called by Edge Functions via service_role)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (p_user_id, p_type, p_title, p_body, p_metadata)
  RETURNING id;
$$;
