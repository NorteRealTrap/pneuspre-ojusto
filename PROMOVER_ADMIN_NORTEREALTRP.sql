-- ==================================================
-- PROMOVER USUARIO PARA ADMIN (SUPABASE / POSTGRES)
-- ==================================================
-- Usuario alvo:
-- norterealtrp@gmail.com

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT u.id
  INTO v_user_id
  FROM auth.users u
  WHERE lower(u.email) = lower('norterealtrp@gmail.com')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario % nao encontrado em auth.users', 'norterealtrp@gmail.com';
  END IF;

  INSERT INTO public.profiles (id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (id) DO UPDATE
    SET role = 'admin',
        updated_at = NOW();

  -- Mantem metadata alinhada para fallback de role no frontend/JWT.
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
  WHERE id = v_user_id;
END
$$;

-- Verificacao
SELECT
  u.email,
  p.role AS profile_role,
  u.raw_user_meta_data ->> 'role' AS metadata_role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE lower(u.email) = lower('norterealtrp@gmail.com');
