-- ============================================================================
-- MYMART QUICK COMMERCE - PRODUCTION DATABASE MIGRATION 001
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories (is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  description TEXT,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  unit_label TEXT NOT NULL, -- e.g. "500 g", "1 kg", "1 L", "Pack of 2"
  selling_price_paise INT NOT NULL CHECK (selling_price_paise >= 0),
  mrp_paise INT NOT NULL CHECK (mrp_paise >= selling_price_paise),
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INT NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products (is_featured, is_active);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products (stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_search ON public.products USING gin (to_tsvector('english', name || ' ' || brand || ' ' || COALESCE(description, '')));

-- ----------------------------------------------------------------------------
-- 4. CUSTOMER ADDRESSES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  house_number TEXT NOT NULL,
  street TEXT NOT NULL,
  area TEXT NOT NULL,
  landmark TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL CHECK (pincode ~ '^[1-9][0-9]{5}$'),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.customer_addresses (user_id);

-- ----------------------------------------------------------------------------
-- 5. ORDERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  address_snapshot JSONB NOT NULL,
  subtotal_paise INT NOT NULL CHECK (subtotal_paise >= 0),
  delivery_fee_paise INT NOT NULL DEFAULT 0 CHECK (delivery_fee_paise >= 0),
  discount_paise INT NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
  total_paise INT NOT NULL CHECK (total_paise >= 0),
  payment_method TEXT NOT NULL DEFAULT 'COD' CHECK (payment_method IN ('COD')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  order_status TEXT NOT NULL DEFAULT 'placed' CHECK (order_status IN ('placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled')),
  is_stock_restored BOOLEAN NOT NULL DEFAULT false,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (order_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders (order_number);

-- ----------------------------------------------------------------------------
-- 6. ORDER ITEMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL,
  product_image_snapshot TEXT NOT NULL,
  unit_label_snapshot TEXT NOT NULL,
  unit_price_paise INT NOT NULL CHECK (unit_price_paise >= 0),
  quantity INT NOT NULL CHECK (quantity > 0),
  line_total_paise INT NOT NULL CHECK (line_total_paise >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items (product_id);

-- ----------------------------------------------------------------------------
-- 7. STORE SETTINGS TABLE (Single configuration record)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name TEXT NOT NULL DEFAULT 'MyMart Quick Commerce',
  logo_url TEXT NOT NULL DEFAULT '',
  support_phone TEXT NOT NULL DEFAULT '+91 9876543210',
  support_email TEXT NOT NULL DEFAULT 'support@mymartdelivery.in',
  delivery_fee_paise INT NOT NULL DEFAULT 2500, -- ₹25
  minimum_order_paise INT NOT NULL DEFAULT 9900, -- ₹99
  free_delivery_threshold_paise INT NOT NULL DEFAULT 24900, -- ₹249
  is_store_open BOOLEAN NOT NULL DEFAULT true,
  serviceable_pincodes TEXT[] NOT NULL DEFAULT '{"560001", "560002", "560025", "560034", "560038", "560068", "110001", "400001"}',
  store_address TEXT NOT NULL DEFAULT 'Plot 42, Green Glen Layout, Bellandur, Bengaluru, Karnataka - 560103',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. PROMOTIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  banner_url TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions (is_active, sort_order);

-- ----------------------------------------------------------------------------
-- 9. ADMIN ACTIVITY LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs ON public.admin_activity_logs (created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS & RPC (ROW LEVEL SECURITY & PERMISSIONS)
-- ============================================================================

-- Function to check whether user has admin role
CREATE OR REPLACE FUNCTION public.is_admin(lookup_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lookup_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = lookup_user_id AND role = 'admin'
  );
END;
$$;

-- Trigger to securely create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Customer'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'customer' -- ALWAYS force default 'customer' role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to safeguard role elevation on profiles
CREATE OR REPLACE FUNCTION public.prevent_self_role_elevation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If role is changing, ensure authenticated clients cannot elevate their own role.
  -- auth.uid() IS NULL represents database administrator/service_role/migrations.
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: Only an existing admin can modify user roles';
    END IF;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_elevation ON public.profiles;
CREATE TRIGGER trg_prevent_role_elevation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_elevation();

-- ============================================================================
-- ATOMIC ORDER PLACEMENT RPC (SECURITY DEFINER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.place_order(
  p_address_id UUID,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_store public.store_settings%ROWTYPE;
  v_address public.customer_addresses%ROWTYPE;
  v_item RECORD;
  v_product public.products%ROWTYPE;
  v_subtotal INT := 0;
  v_delivery_fee INT := 0;
  v_total INT := 0;
  v_order_id UUID;
  v_order_number TEXT;
  v_date_prefix TEXT;
  v_random_suffix INT;
  v_address_snapshot JSONB;
BEGIN
  -- 1. Verify authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to place an order';
  END IF;

  -- 2. Verify store settings
  SELECT * INTO v_store FROM public.store_settings LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store settings not initialized';
  END IF;

  IF NOT v_store.is_store_open THEN
    RAISE EXCEPTION 'Store is currently closed. Please check back later';
  END IF;

  -- 3. Verify and retrieve customer address
  SELECT * INTO v_address FROM public.customer_addresses
  WHERE id = p_address_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery address not found or does not belong to user';
  END IF;

  -- 4. Check PIN code serviceability
  IF NOT (v_address.pincode = ANY(v_store.serviceable_pincodes)) THEN
    RAISE EXCEPTION 'Sorry, PIN code % is not serviceable for quick delivery', v_address.pincode;
  END IF;

  -- 5. Validate items array is not empty
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cannot place an empty order';
  END IF;

  -- Prepare address snapshot
  v_address_snapshot := jsonb_build_object(
    'full_name', v_address.full_name,
    'phone', v_address.phone,
    'house_number', v_address.house_number,
    'street', v_address.street,
    'area', v_address.area,
    'landmark', v_address.landmark,
    'city', v_address.city,
    'state', v_address.state,
    'pincode', v_address.pincode
  );

  -- 6. Lock and validate items, calculate totals
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (product_id UUID, quantity INT)
  LOOP
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be greater than zero';
    END IF;

    -- Row-level lock to prevent concurrent overselling race conditions
    SELECT * INTO v_product FROM public.products
    WHERE id = v_item.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product with ID % not found', v_item.product_id;
    END IF;

    IF NOT v_product.is_active THEN
      RAISE EXCEPTION 'Product % is currently not available', v_product.name;
    END IF;

    IF v_product.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %',
        v_product.name, v_product.stock_quantity, v_item.quantity;
    END IF;

    v_subtotal := v_subtotal + (v_product.selling_price_paise * v_item.quantity);
  END LOOP;

  -- 7. Validate minimum order requirement
  IF v_subtotal < v_store.minimum_order_paise THEN
    RAISE EXCEPTION 'Order subtotal (₹%) is below the minimum required order amount (₹%)',
      (v_subtotal / 100), (v_store.minimum_order_paise / 100);
  END IF;

  -- 8. Compute delivery fee
  IF v_subtotal >= v_store.free_delivery_threshold_paise THEN
    v_delivery_fee := 0;
  ELSE
    v_delivery_fee := v_store.delivery_fee_paise;
  END IF;

  v_total := v_subtotal + v_delivery_fee;

  -- 9. Generate Order Number
  v_date_prefix := to_char(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYYMMDD');
  v_random_suffix := floor(1000 + random() * 9000)::INT;
  v_order_number := 'MYM-' || v_date_prefix || '-' || v_random_suffix::TEXT;

  -- 10. Insert order record
  INSERT INTO public.orders (
    order_number,
    user_id,
    address_snapshot,
    subtotal_paise,
    delivery_fee_paise,
    discount_paise,
    total_paise,
    payment_method,
    payment_status,
    order_status,
    is_stock_restored
  ) VALUES (
    v_order_number,
    v_user_id,
    v_address_snapshot,
    v_subtotal,
    v_delivery_fee,
    0,
    v_total,
    'COD',
    'pending',
    'placed',
    false
  ) RETURNING id INTO v_order_id;

  -- 11. Insert order items & atomically decrement inventory
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (product_id UUID, quantity INT)
  LOOP
    SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name_snapshot,
      product_image_snapshot,
      unit_label_snapshot,
      unit_price_paise,
      quantity,
      line_total_paise
    ) VALUES (
      v_order_id,
      v_product.id,
      v_product.name,
      COALESCE(v_product.image_urls[1], ''),
      v_product.unit_label,
      v_product.selling_price_paise,
      v_item.quantity,
      v_product.selling_price_paise * v_item.quantity
    );

    UPDATE public.products
    SET stock_quantity = stock_quantity - v_item.quantity,
        updated_at = NOW()
    WHERE id = v_item.product_id;
  END LOOP;

  -- 12. Return summary
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_paise', v_total,
    'order_status', 'placed'
  );
END;
$$;

-- ============================================================================
-- ADMIN ORDER STATUS UPDATE & STOCK RESTORATION RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_cancel_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_order public.orders%ROWTYPE;
  v_item RECORD;
BEGIN
  v_admin_id := auth.uid();
  IF NOT public.is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only store owners/admins can update order statuses';
  END IF;

  -- Lock order row
  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Check valid transitions
  IF v_order.order_status = 'cancelled' THEN
    RAISE EXCEPTION 'Order is already cancelled and cannot be changed';
  END IF;

  IF v_order.order_status = 'delivered' AND p_new_status != 'delivered' THEN
    RAISE EXCEPTION 'Order has already been delivered and completed';
  END IF;

  -- If status is becoming cancelled, restore stock EXACTLY ONCE
  IF p_new_status = 'cancelled' THEN
    IF NOT v_order.is_stock_restored THEN
      FOR v_item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id
      LOOP
        UPDATE public.products
        SET stock_quantity = stock_quantity + v_item.quantity,
            updated_at = NOW()
        WHERE id = v_item.product_id;
      END LOOP;

      UPDATE public.orders
      SET is_stock_restored = true
      WHERE id = p_order_id;
    END IF;
  END IF;

  -- Mark COD payment as paid if delivered
  IF p_new_status = 'delivered' THEN
    UPDATE public.orders
    SET payment_status = 'paid'
    WHERE id = p_order_id;
  END IF;

  -- Update order
  UPDATE public.orders
  SET order_status = p_new_status,
      cancel_reason = COALESCE(p_cancel_reason, cancel_reason),
      updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- Log admin action
  INSERT INTO public.admin_activity_logs (
    admin_id, action, entity_type, entity_id, details
  ) VALUES (
    v_admin_id,
    'UPDATE_STATUS',
    'orders',
    p_order_id::TEXT,
    jsonb_build_object('old_status', v_order.order_status, 'new_status', p_new_status, 'reason', p_cancel_reason)
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'order_status', v_order.order_status,
    'payment_status', v_order.payment_status
  );
END;
$$;

-- ============================================================================
-- ADMIN STOCK ADJUSTMENT RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_adjust_stock(
  p_product_id UUID,
  p_new_stock INT,
  p_reason TEXT DEFAULT 'Manual adjustment'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_old_stock INT;
  v_product_name TEXT;
BEGIN
  v_admin_id := auth.uid();
  IF NOT public.is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Admin permission required';
  END IF;

  IF p_new_stock < 0 THEN
    RAISE EXCEPTION 'Stock quantity cannot be negative';
  END IF;

  SELECT stock_quantity, name INTO v_old_stock, v_product_name
  FROM public.products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  UPDATE public.products
  SET stock_quantity = p_new_stock,
      updated_at = NOW()
  WHERE id = p_product_id;

  INSERT INTO public.admin_activity_logs (
    admin_id, action, entity_type, entity_id, details
  ) VALUES (
    v_admin_id,
    'ADJUST_STOCK',
    'products',
    p_product_id::TEXT,
    jsonb_build_object(
      'product_name', v_product_name,
      'old_stock', v_old_stock,
      'new_stock', p_new_stock,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'stock_quantity', p_new_stock
  );
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES
CREATE POLICY "Users can view own profile or admin can view all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- 2. CATEGORIES
CREATE POLICY "Public can view active categories, admin can view all"
  ON public.categories FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admin can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin can update categories"
  ON public.categories FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can delete categories"
  ON public.categories FOR DELETE
  USING (public.is_admin(auth.uid()));

-- 3. PRODUCTS
CREATE POLICY "Public can view active products, admin can view all"
  ON public.products FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admin can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin can update products"
  ON public.products FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can delete products"
  ON public.products FOR DELETE
  USING (public.is_admin(auth.uid()));

-- 4. CUSTOMER ADDRESSES
CREATE POLICY "Users can view own addresses, admin can view all"
  ON public.customer_addresses FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own addresses"
  ON public.customer_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses"
  ON public.customer_addresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses"
  ON public.customer_addresses FOR DELETE
  USING (auth.uid() = user_id);

-- 5. ORDERS
CREATE POLICY "Users can view own orders, admin can view all"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- 6. ORDER ITEMS
CREATE POLICY "Users can view items of own orders, admin can view all"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- 7. STORE SETTINGS
CREATE POLICY "Public can view store settings"
  ON public.store_settings FOR SELECT
  USING (true);

CREATE POLICY "Admin can update store settings"
  ON public.store_settings FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can insert store settings"
  ON public.store_settings FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- 8. PROMOTIONS
CREATE POLICY "Public can view active promotions, admin can view all"
  ON public.promotions FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admin can manage promotions"
  ON public.promotions FOR ALL
  USING (public.is_admin(auth.uid()));

-- 9. ADMIN ACTIVITY LOGS
CREATE POLICY "Only admins can view activity logs"
  ON public.admin_activity_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- ============================================================================
-- SUPABASE REALTIME CONFIGURATION
-- ============================================================================
-- Add tables to supabase_realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
  EXCEPTION WHEN duplicate_object THEN END;
END $$;
-- ============================================================================
-- MYMART - GRANT API ROLE PERMISSIONS
-- Run this in Supabase SQL Editor to allow anon & authenticated API roles to query tables
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
