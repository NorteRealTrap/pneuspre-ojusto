-- ============================================================
-- MIGRATION: Schema repair for missing 20260209 tables + RLS fixes
-- Date: 2026-02-12
-- Description:
--   1) Ensure tables from 20260209 exist (enderecos/pedidos/...)
--   2) Ensure app tables exist (orders/order_items/profiles)
--   3) Fix RLS for orders/order_items/profiles
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- SECTION 1: Ensure missing tables from 20260209 migration
-- ============================================================

CREATE TABLE IF NOT EXISTS public.enderecos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo VARCHAR(255) NOT NULL,
  rua VARCHAR(255) NOT NULL,
  numero VARCHAR(10) NOT NULL,
  complemento VARCHAR(255),
  cidade VARCHAR(100) NOT NULL,
  estado VARCHAR(2) NOT NULL,
  cep VARCHAR(8) NOT NULL,
  verificado BOOLEAN DEFAULT TRUE,
  endereco_padrao BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, cep, numero, rua)
);

CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endereco_id UUID NOT NULL REFERENCES public.enderecos(id),
  numero_pedido VARCHAR(50) NOT NULL UNIQUE,
  valor DECIMAL(12, 2) NOT NULL,
  valor_desconto DECIMAL(12, 2) DEFAULT 0,
  valor_frete DECIMAL(12, 2) DEFAULT 0,
  valor_total DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pendente',
  transaction_id VARCHAR(255) UNIQUE,
  metodo_pagamento VARCHAR(50) DEFAULT 'credito',
  parcelas SMALLINT DEFAULT 1,
  status_pagamento VARCHAR(50) DEFAULT 'pendente',
  numero_rastreamento VARCHAR(50),
  transportadora VARCHAR(100),
  data_envio TIMESTAMP,
  data_entrega TIMESTAMP,
  tentativas_pagamento SMALLINT DEFAULT 0,
  observacoes TEXT,
  motivo_cancelamento TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL,
  quantidade SMALLINT NOT NULL,
  preco_unitario DECIMAL(10, 2) NOT NULL,
  preco_total DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pedido_itens_produto_id_fkey'
  ) THEN
    ALTER TABLE public.pedido_itens
      ADD CONSTRAINT pedido_itens_produto_id_fkey
      FOREIGN KEY (produto_id) REFERENCES public.products(id) NOT VALID;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.pedido_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  status_anterior VARCHAR(50),
  status_novo VARCHAR(50) NOT NULL,
  motivo VARCHAR(255),
  criado_por VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blackcat_transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  valor DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  codigo_resposta VARCHAR(50),
  mensagem_resposta TEXT,
  dados_request JSONB,
  dados_response JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  processado_em TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enderecos_usuario_id ON public.enderecos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_enderecos_usuario_padrao ON public.enderecos(usuario_id, endereco_padrao) WHERE endereco_padrao = TRUE;
CREATE INDEX IF NOT EXISTS idx_enderecos_cep ON public.enderecos(cep);

CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_id ON public.pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_transaction_id ON public.pedidos(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero_rastreamento ON public.pedidos(numero_rastreamento);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON public.pedidos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido_id ON public.pedido_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_historico_pedido_id ON public.pedido_historico(pedido_id);
CREATE INDEX IF NOT EXISTS idx_blackcat_pedido_id ON public.blackcat_transacoes(pedido_id);
CREATE INDEX IF NOT EXISTS idx_blackcat_transaction_id ON public.blackcat_transacoes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_blackcat_status ON public.blackcat_transacoes(status);

CREATE SEQUENCE IF NOT EXISTS public.seq_pedidos START 1000;

CREATE OR REPLACE FUNCTION public.gerar_numero_pedido()
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'PED-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('public.seq_pedidos')::TEXT, 6, '0');
END;
$$;

-- Keep a single shared updated_at trigger function for all tables.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enderecos' AND column_name = 'updated_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_enderecos_updated_at' AND tgrelid = 'public.enderecos'::regclass
  ) THEN
    CREATE TRIGGER trigger_enderecos_updated_at
      BEFORE UPDATE ON public.enderecos
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pedidos' AND column_name = 'updated_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_pedidos_updated_at' AND tgrelid = 'public.pedidos'::regclass
  ) THEN
    CREATE TRIGGER trigger_pedidos_updated_at
      BEFORE UPDATE ON public.pedidos
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

ALTER TABLE public.enderecos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_historico ENABLE ROW LEVEL SECURITY;

-- Create base policies only when absent to avoid conflicts with existing environments.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enderecos' AND policyname = 'enderecos_owner_select'
  ) THEN
    CREATE POLICY enderecos_owner_select
      ON public.enderecos
      FOR SELECT
      USING (auth.uid() = usuario_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enderecos' AND policyname = 'enderecos_owner_insert'
  ) THEN
    CREATE POLICY enderecos_owner_insert
      ON public.enderecos
      FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enderecos' AND policyname = 'enderecos_owner_update'
  ) THEN
    CREATE POLICY enderecos_owner_update
      ON public.enderecos
      FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enderecos' AND policyname = 'enderecos_owner_delete'
  ) THEN
    CREATE POLICY enderecos_owner_delete
      ON public.enderecos
      FOR DELETE
      USING (auth.uid() = usuario_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pedidos' AND policyname = 'pedidos_owner_select'
  ) THEN
    CREATE POLICY pedidos_owner_select
      ON public.pedidos
      FOR SELECT
      USING (auth.uid() = usuario_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pedidos' AND policyname = 'pedidos_owner_insert'
  ) THEN
    CREATE POLICY pedidos_owner_insert
      ON public.pedidos
      FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
  END IF;
END
$$;

-- ============================================================
-- SECTION 2: Ensure app tables exist (orders/order_items/profiles)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50) NOT NULL,
  payment_id VARCHAR(255),
  shipping_address JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total DECIMAL(10, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_positive_chk') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_total_positive_chk CHECK (total > 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_method_chk') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_payment_method_chk
      CHECK (payment_method IN ('credit_card', 'pix', 'boleto')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_chk') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_status_chk
      CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')) NOT VALID;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_id_unique
  ON public.orders(payment_id)
  WHERE payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_product_id_fkey'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_quantity_positive_chk') THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_quantity_positive_chk CHECK (quantity > 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_price_nonnegative_chk') THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_price_nonnegative_chk CHECK (price >= 0) NOT VALID;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name VARCHAR(255),
  cpf VARCHAR(14),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'client',
  address JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'client';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_chk') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_chk CHECK (role IN ('client', 'admin')) NOT VALID;
  END IF;
END
$$;

UPDATE public.profiles
SET cpf = NULL
WHERE cpf = '';

UPDATE public.profiles
SET phone = NULL
WHERE phone = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'profiles_cpf_key'
  ) THEN
    BEGIN
      CREATE UNIQUE INDEX profiles_cpf_key
        ON public.profiles(cpf)
        WHERE cpf IS NOT NULL;
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'profiles_cpf_key was not created because duplicate cpf values already exist.';
    END;
  END IF;
END
$$;

-- ============================================================
-- SECTION 3: Helper functions and triggers used by RLS
-- ============================================================

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

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, cpf, phone)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), ''),
    NULLIF(NEW.raw_user_meta_data->>'cpf', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'updated_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_orders_updated_at' AND tgrelid = 'public.orders'::regclass
  ) THEN
    CREATE TRIGGER trg_orders_updated_at
      BEFORE UPDATE ON public.orders
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_profiles_updated_at' AND tgrelid = 'public.profiles'::regclass
  ) THEN
    CREATE TRIGGER trg_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

-- ============================================================
-- SECTION 4: RLS fixes for orders, order_items, profiles
-- ============================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts or broken legacy policies.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', pol.policyname);
  END LOOP;

  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'order_items'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.order_items', pol.policyname);
  END LOOP;

  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END
$$;

-- ORDERS
CREATE POLICY orders_user_select
  ON public.orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY orders_user_insert
  ON public.orders
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND total > 0
    AND payment_method IN ('credit_card', 'pix', 'boleto')
    AND status = 'pending'
    AND payment_id IS NULL
  );

CREATE POLICY orders_user_update_pending_cancel
  ON public.orders
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND payment_id IS NULL
    AND status IN ('pending', 'cancelled')
  )
  WITH CHECK (
    auth.uid() = user_id
    AND payment_id IS NULL
    AND total > 0
    AND payment_method IN ('credit_card', 'pix', 'boleto')
    AND status IN ('pending', 'cancelled')
  );

CREATE POLICY orders_admin_all
  ON public.orders
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ORDER ITEMS
CREATE POLICY order_items_user_select
  ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

CREATE POLICY order_items_user_insert
  ON public.order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
    AND quantity > 0
    AND price >= 0
  );

CREATE POLICY order_items_admin_all
  ON public.order_items
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PROFILES
CREATE POLICY profiles_user_select
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY profiles_user_insert
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND role = 'client'
  );

CREATE POLICY profiles_user_update
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = COALESCE(public.current_user_role(), 'client')
  );

CREATE POLICY profiles_admin_all
  ON public.profiles
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- END MIGRATION
-- ============================================================