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
  -- If role is changing, ensure current actor is already an admin
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT public.is_admin(auth.uid()) THEN
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
-- MYMART QUICK COMMERCE - PRODUCTION SEED DATA
-- ============================================================================

-- 1. Initialize Store Settings
INSERT INTO public.store_settings (
  id,
  store_name,
  logo_url,
  support_phone,
  support_email,
  delivery_fee_paise,
  minimum_order_paise,
  free_delivery_threshold_paise,
  is_store_open,
  serviceable_pincodes,
  store_address
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'MyMart Quick Grocery',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
  '+91 9876543210',
  'support@mymartdelivery.in',
  2500, -- ₹25
  9900, -- ₹99 min order
  24900, -- ₹249 for free delivery
  true,
  ARRAY['560001', '560002', '560025', '560034', '560038', '560068', '110001', '400001'],
  'Shop 14, Ground Floor, Indiranagar 100ft Road, Bengaluru, Karnataka - 560038'
) ON CONFLICT (id) DO UPDATE SET
  store_name = EXCLUDED.store_name,
  delivery_fee_paise = EXCLUDED.delivery_fee_paise,
  minimum_order_paise = EXCLUDED.minimum_order_paise,
  free_delivery_threshold_paise = EXCLUDED.free_delivery_threshold_paise,
  is_store_open = EXCLUDED.is_store_open,
  serviceable_pincodes = EXCLUDED.serviceable_pincodes;

-- 2. Seed Categories
INSERT INTO public.categories (id, name, slug, image_url, description, sort_order, is_active)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Fruits & Vegetables', 'fruits-vegetables', 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=500&q=80', 'Fresh farm handpicked seasonal fruits and fresh vegetables', 1, true),
  ('c1000000-0000-0000-0000-000000000002', 'Dairy & Bakery', 'dairy-bakery', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=500&q=80', 'Fresh milk, butter, paneer, artisan bread and creamy curd', 2, true),
  ('c1000000-0000-0000-0000-000000000003', 'Snacks & Munchies', 'snacks-munchies', 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=500&q=80', 'Crispy chips, namkeen, roasted nuts and crunchy snacks', 3, true),
  ('c1000000-0000-0000-0000-000000000004', 'Cold Drinks & Juices', 'cold-drinks-juices', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80', 'Refreshing sodas, natural fruit juices, energy drinks and iced tea', 4, true),
  ('c1000000-0000-0000-0000-000000000005', 'Atta, Rice & Dal', 'atta-rice-dal', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80', 'Premium chakki fresh atta, aged basmati rice and unpolished dals', 5, true),
  ('c1000000-0000-0000-0000-000000000006', 'Masala & Spices', 'masala-spices', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=500&q=80', 'Aromatic whole spices, pure blends, turmeric and cooking oils', 6, true),
  ('c1000000-0000-0000-0000-000000000007', 'Personal Care', 'personal-care', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80', 'Gentle handwashes, skin cleansers, oral hygiene and haircare', 7, true),
  ('c1000000-0000-0000-0000-000000000008', 'Household Essentials', 'household-essentials', 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=500&q=80', 'Detergent pods, surface disinfectants, dish gels and insect repellents', 8, true),
  ('c1000000-0000-0000-0000-000000000009', 'Baby Care', 'baby-care', 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=500&q=80', 'Comfortable baby diapers, soothing wipes and nutritious baby food', 9, true),
  ('c1000000-0000-0000-0000-000000000010', 'Chocolates & Sweets', 'chocolates-sweets', 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=500&q=80', 'Silky chocolate bars, imported gift packs and traditional mithai', 10, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  image_url = EXCLUDED.image_url,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- 3. Seed Products
INSERT INTO public.products (
  id, name, slug, sku, brand, description, category_id, unit_label,
  selling_price_paise, mrp_paise, stock_quantity, low_stock_threshold,
  image_urls, is_active, is_featured
) VALUES
  -- Category 1: Fruits & Vegetables
  (
    'd1000000-0000-0000-0000-000000000001',
    'Shimla Fresh Apples (Royal Delicious)',
    'shimla-fresh-apples-royal-delicious',
    'FV-APP-001',
    'FarmFresh',
    'Crisp, sweet, and juicy Royal Delicious apples harvested from high altitude orchards in Himachal Pradesh.',
    'c1000000-0000-0000-0000-000000000001',
    '4 pcs (Approx. 500-600g)',
    14900, -- ₹149
    18900, -- ₹189
    45,
    10,
    ARRAY['https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),
  (
    'd1000000-0000-0000-0000-000000000002',
    'Robusta Ripe Bananas',
    'robusta-ripe-bananas',
    'FV-BAN-002',
    'FarmFresh',
    'Naturally ripened high-energy golden yellow Robusta bananas.',
    'c1000000-0000-0000-0000-000000000001',
    '1 kg (Approx. 5-7 pcs)',
    5800, -- ₹58
    7000, -- ₹70
    80,
    15,
    ARRAY['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),
  (
    'd1000000-0000-0000-0000-000000000003',
    'Hybrid Red Tomatoes',
    'hybrid-red-tomatoes',
    'FV-TOM-003',
    'FarmFresh',
    'Firm, plump and vibrant red hybrid tomatoes perfect for curries, salads, and gravies.',
    'c1000000-0000-0000-0000-000000000001',
    '1 kg',
    3800, -- ₹38
    5000, -- ₹50
    60,
    10,
    ARRAY['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80'],
    true,
    false
  ),
  (
    'd1000000-0000-0000-0000-000000000004',
    'Fresh Tender Baby Spinach (Palak)',
    'fresh-tender-baby-spinach-palak',
    'FV-SPN-004',
    'OrganicFarms',
    'Hydroponically rinsed tender spinach leaves loaded with iron, vitamin A, and fiber.',
    'c1000000-0000-0000-0000-000000000001',
    '250 g bunch',
    2400, -- ₹24
    3500, -- ₹35
    35,
    8,
    ARRAY['https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80'],
    true,
    false
  ),

  -- Category 2: Dairy & Bakery
  (
    'd1000000-0000-0000-0000-000000000005',
    'Amul Pasteurized Salted Butter',
    'amul-pasteurized-salted-butter',
    'DB-AMB-001',
    'Amul',
    'The taste of India! Utterly butterly delicious butter made from pure milk fat.',
    'c1000000-0000-0000-0000-000000000002',
    '500 g',
    27500, -- ₹275
    28500, -- ₹285
    50,
    10,
    ARRAY['https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),
  (
    'd1000000-0000-0000-0000-000000000006',
    'Nandini GoodLife Toned Milk',
    'nandini-goodlife-toned-milk',
    'DB-MLK-002',
    'Nandini',
    'Homogenized, UHT treated toned milk with zero preservatives and 90-day shelf stability.',
    'c1000000-0000-0000-0000-000000000002',
    '1 L Tetrapack',
    6400, -- ₹64
    6600, -- ₹66
    100,
    20,
    ARRAY['https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),
  (
    'd1000000-0000-0000-0000-000000000007',
    'Amul Fresh Malai Paneer',
    'amul-fresh-malai-paneer',
    'DB-PAN-003',
    'Amul',
    'Soft and rich cottage cheese cube block with authentic milky aroma and velvet texture.',
    'c1000000-0000-0000-0000-000000000002',
    '200 g pack',
    8900, -- ₹89
    9500, -- ₹95
    40,
    8,
    ARRAY['https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80'],
    true,
    false
  ),
  (
    'd1000000-0000-0000-0000-000000000008',
    'Modern 100% Whole Wheat Brown Bread',
    'modern-100-whole-wheat-brown-bread',
    'DB-BRD-004',
    'Modern',
    'Baked with genuine stoneground whole wheat flour. Zero trans-fat and high dietary fiber.',
    'c1000000-0000-0000-0000-000000000002',
    '400 g',
    5000, -- ₹50
    5500, -- ₹55
    30,
    5,
    ARRAY['https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80'],
    true,
    false
  ),

  -- Category 3: Snacks & Munchies
  (
    'd1000000-0000-0000-0000-000000000009',
    'Lays Indias Magic Masala Potato Chips',
    'lays-indias-magic-masala-potato-chips',
    'SN-LAY-001',
    'Lays',
    'Crisp, ridged potato chips seasoned with aromatic Indian spices, mango powder, and tangy chili.',
    'c1000000-0000-0000-0000-000000000003',
    '90 g',
    3500, -- ₹35
    4000, -- ₹40
    75,
    15,
    ARRAY['https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),
  (
    'd1000000-0000-0000-0000-000000000010',
    'Haldirams Nagpur Aloo Bhujia',
    'haldirams-nagpur-aloo-bhujia',
    'SN-HAL-002',
    'Haldirams',
    'Iconic crisp potato and moth flour strands tossed with mint, cloves, and fiery spices.',
    'c1000000-0000-0000-0000-000000000003',
    '200 g',
    5500, -- ₹55
    6000, -- ₹60
    50,
    10,
    ARRAY['https://images.unsplash.com/photo-1621996346565-e3d5d6281729?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),
  (
    'd1000000-0000-0000-0000-000000000011',
    'Act II Butter Lovers Microwave Popcorn',
    'act-ii-butter-lovers-microwave-popcorn',
    'SN-ACT-003',
    'Act II',
    'Fluffy, hot golden popcorn infused with savory movie-theater butter flavor.',
    'c1000000-0000-0000-0000-000000000003',
    '150 g (3 x 50g)',
    9000, -- ₹90
    10500, -- ₹105
    40,
    8,
    ARRAY['https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=600&q=80'],
    true,
    false
  ),

  -- Category 4: Cold Drinks & Juices
  (
    'd1000000-0000-0000-0000-000000000012',
    'Coca-Cola Original Taste Can',
    'coca-cola-original-taste-can',
    'BEV-COK-001',
    'Coca-Cola',
    'The classic refreshing carbonated soft drink served in an ice-cold sleek aluminum can.',
    'c1000000-0000-0000-0000-000000000004',
    '300 ml Can',
    3800, -- ₹38
    4000, -- ₹40
    120,
    25,
    ARRAY['https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),
  (
    'd1000000-0000-0000-0000-000000000013',
    'Real Fruit Power Alphonso Mango Juice',
    'real-fruit-power-alphonso-mango-juice',
    'BEV-REA-002',
    'Real',
    'Made with pure Ratnagiri Alphonso mango pulp. Packed with natural vitamin C.',
    'c1000000-0000-0000-0000-000000000004',
    '1 L Tetrapack',
    11500, -- ₹115
    13000, -- ₹130
    45,
    10,
    ARRAY['https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80'],
    true,
    false
  ),
  (
    'd1000000-0000-0000-0000-000000000014',
    'Raw Pressery 100% Tender Coconut Water',
    'raw-pressery-100-tender-coconut-water',
    'BEV-RAW-003',
    'Raw Pressery',
    'Pure bio-electrolyte natural hydration with zero added sugar or artificial preservatives.',
    'c1000000-0000-0000-0000-000000000004',
    '200 ml Bottle',
    5500, -- ₹55
    6500, -- ₹65
    60,
    12,
    ARRAY['https://images.unsplash.com/photo-1525385133512-2f3bdd039054?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),

  -- Category 5: Atta, Rice & Dal
  (
    'd1000000-0000-0000-0000-000000000015',
    'Aashirvaad Shudh Chakki Whole Wheat Atta',
    'aashirvaad-shudh-chakki-whole-wheat-atta',
    'ST-AAS-001',
    'Aashirvaad',
    'Traditional stone chakki ground from heavy golden grains. Produces rotis that stay soft for hours.',
    'c1000000-0000-0000-0000-000000000005',
    '5 kg Bag',
    23500, -- ₹235
    27000, -- ₹270
    40,
    8,
    ARRAY['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),
  (
    'd1000000-0000-0000-0000-000000000016',
    'India Gate Feast Rozzana Basmati Rice',
    'india-gate-feast-rozzana-basmati-rice',
    'ST-ING-002',
    'India Gate',
    'Naturally aged pearl-white slender basmati grains with characteristic fragrant aroma.',
    'c1000000-0000-0000-0000-000000000005',
    '5 kg Bag',
    44900, -- ₹449
    52500, -- ₹525
    25,
    5,
    ARRAY['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),
  (
    'd1000000-0000-0000-0000-000000000017',
    'Tata Sampann Unpolished Toor Dal',
    'tata-sampann-unpolished-toor-dal',
    'ST-TAT-003',
    'Tata Sampann',
    'Nutrient-rich yellow pigeon peas, completely unpolished to retain natural goodness and wholesome taste.',
    'c1000000-0000-0000-0000-000000000005',
    '1 kg Pack',
    17500, -- ₹175
    19500, -- ₹195
    50,
    10,
    ARRAY['https://images.unsplash.com/photo-1585994192701-f1a505c817ea?auto=format&fit=crop&w=600&q=80'],
    true,
    false
  ),

  -- Category 6: Masala & Spices
  (
    'd1000000-0000-0000-0000-000000000018',
    'Catch Turmeric Powder (Haldi)',
    'catch-turmeric-powder-haldi',
    'SP-CAT-001',
    'Catch',
    'High curcumin sun-dried Salem turmeric ground at low temperatures for deep golden color and aroma.',
    'c1000000-0000-0000-0000-000000000006',
    '200 g',
    6200, -- ₹62
    7200, -- ₹72
    55,
    10,
    ARRAY['https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80'],
    true,
    false
  ),
  (
    'd1000000-0000-0000-0000-000000000019',
    'Everest Shahi Garam Masala',
    'everest-shahi-garam-masala',
    'SP-EVE-002',
    'Everest',
    'Royal blend of 13 roasted spices including cardamom, cinnamon, mace, and star anise.',
    'c1000000-0000-0000-0000-000000000006',
    '100 g',
    8800, -- ₹88
    9800, -- ₹98
    45,
    10,
    ARRAY['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),
  (
    'd1000000-0000-0000-0000-000000000020',
    'Tata Salt Vacuum Evaporated Iodized Salt',
    'tata-salt-vacuum-evaporated-iodized-salt',
    'SP-TAT-003',
    'Tata',
    'Desh ka namak! Pure white vacuum evaporated iodized table salt with guaranteed purity.',
    'c1000000-0000-0000-0000-000000000006',
    '1 kg Pack',
    2700, -- ₹27
    3000, -- ₹30
    150,
    30,
    ARRAY['https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&w=600&q=80'],
    true,
    false
  ),

  -- Category 7: Personal Care
  (
    'd1000000-0000-0000-0000-000000000021',
    'Dettol Original Germ Protection Liquid Handwash Refill',
    'dettol-original-germ-protection-liquid-handwash-refill',
    'PC-DET-001',
    'Dettol',
    'Trusted antibacterial liquid hand soap formula kills 99.9% of illness-causing germs.',
    'c1000000-0000-0000-0000-000000000007',
    '675 ml Pouch',
    11900, -- ₹119
    13900, -- ₹139
    65,
    15,
    ARRAY['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),
  (
    'd1000000-0000-0000-0000-000000000022',
    'Colgate MaxFresh Spicy Fresh Red Gel Toothpaste',
    'colgate-maxfresh-spicy-fresh-red-gel-toothpaste',
    'PC-COL-002',
    'Colgate',
    'Infused with cooling breath strips for intense minty freshness and cavity prevention.',
    'c1000000-0000-0000-0000-000000000007',
    '150 g + 150 g Duo',
    19500, -- ₹195
    23000, -- ₹230
    40,
    10,
    ARRAY['https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=600&q=80'],
    true,
    false
  ),

  -- Category 8: Household Essentials
  (
    'd1000000-0000-0000-0000-000000000023',
    'Vim Lemon Dishwash Liquid Gel',
    'vim-lemon-dishwash-liquid-gel',
    'HH-VIM-001',
    'Vim',
    'Concentrated gel with the power of 100 lemons. Cuts through burnt grease effortlessly without scratching.',
    'c1000000-0000-0000-0000-000000000008',
    '750 ml Bottle',
    16500, -- ₹165
    19000, -- ₹190
    50,
    10,
    ARRAY['https://images.unsplash.com/photo-1585670270608-b4be4fb880ed?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),
  (
    'd1000000-0000-0000-0000-000000000024',
    'Surf Excel Matic Top Load Detergent Powder',
    'surf-excel-matic-top-load-detergent-powder',
    'HH-SRF-002',
    'Surf Excel',
    'Engineered for automatic washing machines. Fast stain removal in high water levels.',
    'c1000000-0000-0000-0000-000000000008',
    '2 kg Box',
    39900, -- ₹399
    46000, -- ₹460
    30,
    5,
    ARRAY['https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=600&q=80'],
    true,
    false
  ),

  -- Category 9: Baby Care
  (
    'd1000000-0000-0000-0000-000000000025',
    'Pampers All Round Protection Pants (Medium)',
    'pampers-all-round-protection-pants-medium',
    'BC-PAM-001',
    'Pampers',
    'Ultra-absorbent diaper pants with anti-rash aloe vera lotion and up to 12 hours leakage barrier.',
    'c1000000-0000-0000-0000-000000000009',
    'Pack of 54 Pants',
    79900, -- ₹799
    99900, -- ₹999
    25,
    5,
    ARRAY['https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),
  (
    'd1000000-0000-0000-0000-000000000026',
    'Johnsons Baby Gentle Wet Wipes',
    'johnsons-baby-gentle-wet-wipes',
    'BC-JOH-002',
    'Johnsons Baby',
    'Hypoallergenic baby wipes with moisturising lotion and mild fragrance. Alcohol-free & paraben-free.',
    'c1000000-0000-0000-0000-000000000009',
    '72 Wipes Pack',
    18500, -- ₹185
    22500, -- ₹225
    40,
    10,
    ARRAY['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'],
    true,
    false
  ),

  -- Category 10: Chocolates & Sweets
  (
    'd1000000-0000-0000-0000-000000000027',
    'Cadbury Dairy Milk Silk Chocolate Bar',
    'cadbury-dairy-milk-silk-chocolate-bar',
    'SW-CAD-001',
    'Cadbury',
    'Irresistibly silky, melt-in-mouth milk chocolate crafted with premium cocoa butter.',
    'c1000000-0000-0000-0000-000000000010',
    '150 g Bar',
    16500, -- ₹165
    18500, -- ₹185
    90,
    20,
    ARRAY['https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),
  (
    'd1000000-0000-0000-0000-000000000028',
    'Ferrero Rocher Hazelnut Pralines Gift Box',
    'ferrero-rocher-hazelnut-pralines-gift-box',
    'SW-FER-002',
    'Ferrero Rocher',
    'Crisp hazelnut and milk chocolate pralines wrapped in signature golden foil.',
    'c1000000-0000-0000-0000-000000000010',
    '16 pcs (200 g)',
    49900, -- ₹499
    57500, -- ₹575
    20,
    5,
    ARRAY['https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=600&q=80'],
    true,
    true
  ),
  (
    'd1000000-0000-0000-0000-000000000029',
    'Haldirams Gulab Jamun Tin',
    'haldirams-gulab-jamun-tin',
    'SW-HAL-003',
    'Haldirams',
    'Spongy and succulent milk-solid dumplings soaked in rose and cardamom sugar syrup.',
    'c1000000-0000-0000-0000-000000000010',
    '1 kg Tin (16 pcs)',
    24000, -- ₹240
    27500, -- ₹275
    35,
    8,
    ARRAY['https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80'],
    true,
    false
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  selling_price_paise = EXCLUDED.selling_price_paise,
  mrp_paise = EXCLUDED.mrp_paise,
  stock_quantity = EXCLUDED.stock_quantity,
  image_urls = EXCLUDED.image_urls,
  is_active = EXCLUDED.is_active,
  is_featured = EXCLUDED.is_featured;

-- 4. Seed Promotions & Banners
INSERT INTO public.promotions (
  id, title, description, banner_url, category_id, is_active, sort_order
) VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'Super Saver Wednesday: Up to 40% Off!',
    'Get farm-fresh vegetables and seasonal fruits delivered in 10 minutes.',
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1200&q=80',
    'c1000000-0000-0000-0000-000000000001',
    true,
    1
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'Dairy & Breakfast Bonanza',
    'Stock up on fresh milk, butter, and whole wheat bread for your morning routine.',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=1200&q=80',
    'c1000000-0000-0000-0000-000000000002',
    true,
    2
  ),
  (
    'b1000000-0000-0000-0000-000000000003',
    'Movie Night Munchies',
    'Your favorite chips, cold drinks and gourmet chocolates at unbelievable prices.',
    'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=1200&q=80',
    'c1000000-0000-0000-0000-000000000003',
    true,
    3
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- INSTRUCTION TO MAKE A USER ADMIN:
-- Run this in Supabase SQL editor after creating your owner account:
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
-- ----------------------------------------------------------------------------
