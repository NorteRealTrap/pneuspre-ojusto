-- ============================================================
-- MIGRATION: Orders + inventory transactional persistence
-- Date: 2026-02-12
-- Description:
--   1) create_order_with_items: atomic order + items + stock decrement
--   2) cancel_order_with_restock: atomic cancel + stock rollback
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Prerequisitos para esta migration (ordem de execucao resiliente).
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

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
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
    WHERE conname = 'order_items_product_id_fkey'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_admin'
      AND p.pronargs = 0
  ) THEN
    EXECUTE $create_fn$
      CREATE FUNCTION public.is_admin()
      RETURNS BOOLEAN
      LANGUAGE sql
      STABLE
      AS $fn$
        SELECT COALESCE((auth.jwt() ->> 'role') = 'admin', false);
      $fn$
    $create_fn$;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_total NUMERIC,
  p_payment_method TEXT,
  p_shipping_address JSONB,
  p_items JSONB
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_order public.orders%ROWTYPE;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_stock INTEGER;
  v_product_price NUMERIC(10, 2);
  v_expected_total NUMERIC(12, 2) := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  IF p_payment_method NOT IN ('credit_card', 'pix', 'boleto') THEN
    RAISE EXCEPTION 'Metodo de pagamento invalido';
  END IF;

  IF p_shipping_address IS NULL OR jsonb_typeof(p_shipping_address) <> 'object' THEN
    RAISE EXCEPTION 'Endereco de entrega invalido';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Pedido sem itens';
  END IF;

  IF p_total IS NULL OR p_total <= 0 THEN
    RAISE EXCEPTION 'Total do pedido invalido';
  END IF;

  INSERT INTO public.orders (user_id, total, status, payment_method, shipping_address)
  VALUES (v_user_id, p_total, 'pending', p_payment_method, p_shipping_address)
  RETURNING * INTO v_order;

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item ->> 'product_id', '')::UUID;
    v_quantity := COALESCE((v_item ->> 'quantity')::INTEGER, 0);

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Item de pedido invalido: product_id';
    END IF;

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Item de pedido invalido: quantity';
    END IF;

    SELECT p.stock, p.price
    INTO v_stock, v_product_price
    FROM public.products p
    WHERE p.id = v_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto nao encontrado: %', v_product_id;
    END IF;

    IF v_stock < v_quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para o produto %', v_product_id;
    END IF;

    UPDATE public.products
    SET stock = stock - v_quantity
    WHERE id = v_product_id;

    INSERT INTO public.order_items (order_id, product_id, quantity, price)
    VALUES (v_order.id, v_product_id, v_quantity, v_product_price);

    v_expected_total := v_expected_total + (v_product_price * v_quantity);
  END LOOP;

  v_expected_total := ROUND(v_expected_total::NUMERIC, 2);

  IF ABS(v_expected_total - p_total) > 0.01 THEN
    RAISE EXCEPTION 'Total do pedido divergente do catalogo atual';
  END IF;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_order_with_restock(p_order_id UUID)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido nao encontrado';
  END IF;

  IF v_order.user_id <> v_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Sem permissao para cancelar este pedido';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN v_order;
  END IF;

  IF v_order.status IN ('shipped', 'delivered') THEN
    RAISE EXCEPTION 'Pedido ja em expedicao/entrega nao pode ser cancelado';
  END IF;

  UPDATE public.orders
  SET status = 'cancelled'
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.restock_products_on_order_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
    FOR v_item IN
      SELECT oi.product_id, SUM(oi.quantity)::INTEGER AS quantity
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id
      GROUP BY oi.product_id
    LOOP
      UPDATE public.products
      SET stock = stock + v_item.quantity
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restock_products_on_order_cancel ON public.orders;
CREATE TRIGGER trg_restock_products_on_order_cancel
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restock_products_on_order_cancel();

REVOKE ALL ON FUNCTION public.create_order_with_items(NUMERIC, TEXT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(NUMERIC, TEXT, JSONB, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_order_with_restock(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_order_with_restock(UUID) TO authenticated;

-- ============================================================
-- END MIGRATION
-- ============================================================
