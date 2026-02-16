-- ============================================================
-- MIGRATION: Persistent site configuration for admin panel
-- Date: 2026-02-12
-- Description:
--   1) Creates public.site_config table for global storefront settings
--   2) Enables RLS with public read and admin write
--   3) Seeds default row id = 'default'
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.site_config_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_site_config_updated_at ON public.site_config;
CREATE TRIGGER trg_site_config_updated_at
  BEFORE UPDATE ON public.site_config
  FOR EACH ROW
  EXECUTE FUNCTION public.site_config_set_updated_at();

-- Keep is_admin available even when this migration runs on isolated environments.
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

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

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

INSERT INTO public.site_config (id, config_json)
VALUES ('default', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- END MIGRATION
-- ============================================================
