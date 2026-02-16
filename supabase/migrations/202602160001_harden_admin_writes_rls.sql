-- ============================================================
-- MIGRATION: Harden admin write paths for products/site_config
-- Date: 2026-02-16
-- Description:
--   1) Guarantees RLS on public.products and public.site_config
--   2) Keeps public read where needed
--   3) Restricts writes to admin role policy only
-- ============================================================

-- Ensure helper is available in every environment.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_role TEXT;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') = 'admin' THEN
    RETURN TRUE;
  END IF;

  SELECT p.role
  INTO profile_role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(profile_role, '') = 'admin';
END;
$$;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Remove legacy product policies to avoid accidental permissive access.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', pol.policyname);
  END LOOP;
END
$$;

CREATE POLICY products_public_read
  ON public.products
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY products_admin_insert
  ON public.products
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY products_admin_update
  ON public.products
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY products_admin_delete
  ON public.products
  FOR DELETE
  USING (public.is_admin());

-- Ensure site_config policies exist in hardened form.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_config' AND policyname = 'site_config_public_read'
  ) THEN
    CREATE POLICY site_config_public_read
      ON public.site_config
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_config' AND policyname = 'site_config_admin_insert'
  ) THEN
    CREATE POLICY site_config_admin_insert
      ON public.site_config
      FOR INSERT
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_config' AND policyname = 'site_config_admin_update'
  ) THEN
    CREATE POLICY site_config_admin_update
      ON public.site_config
      FOR UPDATE
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_config' AND policyname = 'site_config_admin_delete'
  ) THEN
    CREATE POLICY site_config_admin_delete
      ON public.site_config
      FOR DELETE
      USING (public.is_admin());
  END IF;
END
$$;

-- Keep read grants explicit for storefront and config fetches.
GRANT SELECT ON TABLE public.products TO anon, authenticated;
GRANT SELECT ON TABLE public.site_config TO anon, authenticated;

-- ============================================================
-- END MIGRATION
-- ============================================================
