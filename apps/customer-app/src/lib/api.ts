import {
  Category,
  Product,
  CustomerAddress,
  Order,
  StoreSettings,
  Promotion,
  PlaceOrderPayload,
} from '@mymart/shared';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  MOCK_CUSTOMER_CATEGORIES,
  MOCK_CUSTOMER_PRODUCTS,
  MOCK_CUSTOMER_PROMOTIONS,
  MOCK_CUSTOMER_STORE_SETTINGS,
  MOCK_CUSTOMER_ADDRESS,
} from './mock-data';

let localAddresses = [MOCK_CUSTOMER_ADDRESS];
let localCustomerOrders: Order[] = [];

/* -------------------------------------------------------------------------- */
/* STORE SETTINGS                                                             */
/* -------------------------------------------------------------------------- */
export async function getStoreSettings(): Promise<StoreSettings> {
  if (!isSupabaseConfigured) {
    return MOCK_CUSTOMER_STORE_SETTINGS;
  }

  const { data, error } = await supabase.from('store_settings').select('*').limit(1).single();
  if (error || !data) return MOCK_CUSTOMER_STORE_SETTINGS;
  return data as StoreSettings;
}

/* -------------------------------------------------------------------------- */
/* CATEGORIES                                                                 */
/* -------------------------------------------------------------------------- */
export async function getActiveCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured) {
    return MOCK_CUSTOMER_CATEGORIES;
  }

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data) return MOCK_CUSTOMER_CATEGORIES;
  return data as Category[];
}

/* -------------------------------------------------------------------------- */
/* PRODUCTS                                                                   */
/* -------------------------------------------------------------------------- */
export async function getActiveProducts(
  categoryId?: string,
  searchQuery?: string
): Promise<Product[]> {
  if (!isSupabaseConfigured) {
    let result = MOCK_CUSTOMER_PRODUCTS;
    if (categoryId) result = result.filter((p) => p.category_id === categoryId);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }
    return result;
  }

  let query = supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (searchQuery) {
    query = query.ilike('name', `%${searchQuery}%`);
  }

  const { data, error } = await query;
  if (error || !data) return MOCK_CUSTOMER_PRODUCTS;
  return data as Product[];
}

export async function getProductDetails(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured) {
    return MOCK_CUSTOMER_PRODUCTS.find((p) => p.id === id) || null;
  }

  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as Product;
}

/* -------------------------------------------------------------------------- */
/* PROMOTIONS                                                                 */
/* -------------------------------------------------------------------------- */
export async function getActivePromotions(): Promise<Promotion[]> {
  if (!isSupabaseConfigured) {
    return MOCK_CUSTOMER_PROMOTIONS;
  }

  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data) return MOCK_CUSTOMER_PROMOTIONS;
  return data as Promotion[];
}

/* -------------------------------------------------------------------------- */
/* ADDRESSES                                                                  */
/* -------------------------------------------------------------------------- */
export async function getCustomerAddresses(): Promise<CustomerAddress[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSupabaseConfigured) {
    return localAddresses;
  }

  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !data) return localAddresses;
  return data as CustomerAddress[];
}

export async function addCustomerAddress(
  address: Omit<CustomerAddress, 'id' | 'user_id' | 'created_at'>
): Promise<CustomerAddress> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSupabaseConfigured) {
    const newAddr: CustomerAddress = {
      id: `addr-${Date.now()}`,
      user_id: 'cust-demo',
      ...address,
      created_at: new Date().toISOString(),
    };
    if (newAddr.is_default) {
      localAddresses = localAddresses.map((a) => ({ ...a, is_default: false }));
    }
    localAddresses = [newAddr, ...localAddresses];
    return newAddr;
  }

  // If new address is default, unset existing defaults first
  if (address.is_default) {
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('user_id', user.id);
  }

  const { data, error } = await supabase
    .from('customer_addresses')
    .insert([{ ...address, user_id: user.id }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CustomerAddress;
}

export async function deleteCustomerAddress(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    localAddresses = localAddresses.filter((a) => a.id !== id);
    return;
  }

  const { error } = await supabase.from('customer_addresses').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* ORDERS (ATOMIC CHECKOUT RPC)                                               */
/* -------------------------------------------------------------------------- */
export async function placeOrder(payload: PlaceOrderPayload): Promise<{ order_id: string; order_number: string }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!isSupabaseConfigured || !user) {
    // Demo mode order placement
    const newOrderNumber = `MYM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      order_number: newOrderNumber,
      user_id: user?.id || 'demo-user',
      address_snapshot: localAddresses[0],
      subtotal_paise: 29800,
      delivery_fee_paise: 0,
      discount_paise: 0,
      total_paise: 29800,
      payment_method: 'COD',
      payment_status: 'pending',
      order_status: 'placed',
      is_stock_restored: false,
      cancel_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localCustomerOrders = [newOrder, ...localCustomerOrders];
    return { order_id: newOrder.id, order_number: newOrder.order_number };
  }

  // Call PostgreSQL Atomic RPC
  const { data, error } = await supabase.rpc('place_order', {
    p_address_id: payload.address_id,
    p_items: payload.items,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as { order_id: string; order_number: string };
}

export async function getCustomerOrders(): Promise<Order[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSupabaseConfigured) {
    return localCustomerOrders;
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return localCustomerOrders;
  return data as Order[];
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSupabaseConfigured) {
    return localCustomerOrders.find((o) => o.id === orderId) || null;
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (error || !data) return null;
  return data as Order;
}
