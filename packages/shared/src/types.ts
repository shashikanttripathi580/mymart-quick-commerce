export type UserRole = 'customer' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  product_count?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  description: string | null;
  category_id: string;
  unit_label: string; // e.g., "500 g", "1 kg", "1 L", "Pack of 2"
  selling_price_paise: number;
  mrp_paise: number;
  stock_quantity: number;
  low_stock_threshold: number;
  image_urls: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface CustomerAddress {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  house_number: string;
  street: string;
  area: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  created_at: string;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type PaymentMethod = 'COD';

export interface OrderAddressSnapshot {
  full_name: string;
  phone: string;
  house_number: string;
  street: string;
  area: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name_snapshot: string;
  product_image_snapshot: string;
  unit_label_snapshot: string;
  unit_price_paise: number;
  quantity: number;
  line_total_paise: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  address_snapshot: OrderAddressSnapshot;
  subtotal_paise: number;
  delivery_fee_paise: number;
  discount_paise: number;
  total_paise: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  is_stock_restored: boolean;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  profile?: Profile;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  logo_url: string;
  support_phone: string;
  support_email: string;
  delivery_fee_paise: number;
  minimum_order_paise: number;
  free_delivery_threshold_paise: number;
  is_store_open: boolean;
  serviceable_pincodes: string[];
  store_address: string;
  updated_at: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string | null;
  banner_url: string;
  category_id: string | null;
  product_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface AdminActivityLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface PlaceOrderPayload {
  address_id: string;
  items: {
    product_id: string;
    quantity: number;
  }[];
}

export interface UpdateOrderStatusPayload {
  order_id: string;
  new_status: OrderStatus;
  cancel_reason?: string;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export interface DashboardSummaryStats {
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  completedOrders: number;
  todaySalesPaise: number;
  totalSalesPaise: number;
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}
