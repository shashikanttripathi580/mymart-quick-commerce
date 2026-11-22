import {
  Category,
  Product,
  Order,
  StoreSettings,
  Promotion,
  DashboardSummaryStats,
  OrderStatus,
} from '@mymart/shared';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  MOCK_CATEGORIES,
  MOCK_PRODUCTS,
  MOCK_ORDERS,
  MOCK_STORE_SETTINGS,
  MOCK_PROMOTIONS,
} from './mock-data';

// Helper to determine if we should use local state / mock fallback
function shouldUseMock(): boolean {
  return !isSupabaseConfigured || localStorage.getItem('mymart_admin_demo') === 'true';
}

const LOCAL_API = 'http://localhost:5001/api';

async function fetchLocal<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${LOCAL_API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    return null;
  }
}

// In-memory working copies for demo mode
let localProducts = [...MOCK_PRODUCTS];
let localCategories = [...MOCK_CATEGORIES];
let localOrders = [...MOCK_ORDERS];
let localSettings = { ...MOCK_STORE_SETTINGS };
let localPromotions = [...MOCK_PROMOTIONS];

/* -------------------------------------------------------------------------- */
/* DASHBOARD SUMMARY STATS                                                    */
/* -------------------------------------------------------------------------- */
export async function getDashboardStats(): Promise<DashboardSummaryStats> {
  if (shouldUseMock()) {
    const remoteStats = await fetchLocal<DashboardSummaryStats>('/dashboard/stats');
    if (remoteStats) return remoteStats;

    const totalOrders = localOrders.length;
    const todayOrders = localOrders.filter(
      (o) => new Date(o.created_at).toDateString() === new Date().toDateString()
    ).length;
    const pendingOrders = localOrders.filter((o) =>
      ['placed', 'confirmed', 'packed'].includes(o.order_status)
    ).length;
    const completedOrders = localOrders.filter((o) => o.order_status === 'delivered').length;

    // Calculate sales excluding cancelled orders
    const validOrders = localOrders.filter((o) => o.order_status !== 'cancelled');
    const totalSalesPaise = validOrders.reduce((sum, o) => sum + o.total_paise, 0);
    const todaySalesPaise = validOrders
      .filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString())
      .reduce((sum, o) => sum + o.total_paise, 0);

    const totalProducts = localProducts.length;
    const lowStockProducts = localProducts.filter(
      (p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
    ).length;
    const outOfStockProducts = localProducts.filter((p) => p.stock_quantity === 0).length;

    return {
      totalOrders,
      todayOrders,
      pendingOrders,
      completedOrders,
      todaySalesPaise,
      totalSalesPaise,
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
    };
  }

  // Fetch real stats from Supabase
  const [{ count: totalOrders }, { count: totalProducts }, { data: ordersData }, { data: productsData }] =
    await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('id, total_paise, order_status, created_at'),
      supabase.from('products').select('id, stock_quantity, low_stock_threshold'),
    ]);

  const allOrders = ordersData || [];
  const allProds = productsData || [];
  const todayStr = new Date().toDateString();

  const todayOrders = allOrders.filter(
    (o) => new Date(o.created_at).toDateString() === todayStr
  ).length;
  const pendingOrders = allOrders.filter((o) =>
    ['placed', 'confirmed', 'packed'].includes(o.order_status)
  ).length;
  const completedOrders = allOrders.filter((o) => o.order_status === 'delivered').length;

  const validOrders = allOrders.filter((o) => o.order_status !== 'cancelled');
  const totalSalesPaise = validOrders.reduce((sum, o) => sum + (o.total_paise || 0), 0);
  const todaySalesPaise = validOrders
    .filter((o) => new Date(o.created_at).toDateString() === todayStr)
    .reduce((sum, o) => sum + (o.total_paise || 0), 0);

  const lowStockProducts = allProds.filter(
    (p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
  ).length;
  const outOfStockProducts = allProds.filter((p) => p.stock_quantity === 0).length;

  return {
    totalOrders: totalOrders || 0,
    todayOrders,
    pendingOrders,
    completedOrders,
    todaySalesPaise,
    totalSalesPaise,
    totalProducts: totalProducts || 0,
    lowStockProducts,
    outOfStockProducts,
  };
}

/* -------------------------------------------------------------------------- */
/* PRODUCTS API                                                               */
/* -------------------------------------------------------------------------- */
export async function getProducts(): Promise<Product[]> {
  if (shouldUseMock()) {
    const remoteProds = await fetchLocal<Product[]>('/products?include_inactive=true');
    if (remoteProds) return remoteProds;
    return localProducts;
  }

  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    return localProducts;
  }
  return data as Product[];
}

export async function getProductById(id: string): Promise<Product | null> {
  if (shouldUseMock()) {
    const remoteProd = await fetchLocal<Product>(`/products/${id}`);
    if (remoteProd) return remoteProd;
    return localProducts.find((p) => p.id === id) || null;
  }

  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Product;
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  if (shouldUseMock()) {
    const created = await fetchLocal<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    if (created) return created;

    const newProd: Product = {
      id: `p-${Date.now()}`,
      name: product.name || '',
      slug: product.slug || '',
      sku: product.sku || '',
      brand: product.brand || '',
      description: product.description || null,
      category_id: product.category_id || '',
      unit_label: product.unit_label || '1 unit',
      selling_price_paise: product.selling_price_paise || 0,
      mrp_paise: product.mrp_paise || 0,
      stock_quantity: product.stock_quantity || 0,
      low_stock_threshold: product.low_stock_threshold || 5,
      image_urls: product.image_urls || [],
      is_active: product.is_active ?? true,
      is_featured: product.is_featured ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localProducts = [newProd, ...localProducts];
    return newProd;
  }

  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Product;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  if (shouldUseMock()) {
    const remoteUpdated = await fetchLocal<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (remoteUpdated) return remoteUpdated;

    localProducts = localProducts.map((p) =>
      p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
    );
    const localUpdated = localProducts.find((p) => p.id === id);
    if (!localUpdated) throw new Error('Product not found');
    return localUpdated;
  }

  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  if (shouldUseMock()) {
    await fetchLocal(`/products/${id}`, { method: 'DELETE' });
    localProducts = localProducts.filter((p) => p.id !== id);
    return;
  }

  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adjustProductStock(
  productId: string,
  newStock: number,
  reason: string = 'Manual Adjustment'
): Promise<void> {
  if (shouldUseMock()) {
    await fetchLocal(`/products/${productId}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({ new_stock_quantity: newStock, reason }),
    });
    localProducts = localProducts.map((p) =>
      p.id === productId ? { ...p, stock_quantity: newStock, updated_at: new Date().toISOString() } : p
    );
    return;
  }

  const { error } = await supabase.rpc('admin_adjust_stock', {
    p_product_id: productId,
    p_new_stock: newStock,
    p_reason: reason,
  });

  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* CATEGORIES API                                                             */
/* -------------------------------------------------------------------------- */
export async function getCategories(): Promise<Category[]> {
  if (shouldUseMock()) {
    const remoteCats = await fetchLocal<Category[]>('/categories?include_inactive=true');
    if (remoteCats) return remoteCats;
    return localCategories;
  }

  const { data, error } = await supabase
    .from('categories')
    .select('*, products:products(count)')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return localCategories;
  }

  return (data || []).map((c: any) => ({
    ...c,
    product_count: c.products?.[0]?.count || 0,
  }));
}

export async function createCategory(category: Partial<Category>): Promise<Category> {
  if (shouldUseMock()) {
    const created = await fetchLocal<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
    if (created) return created;

    const newCat: Category = {
      id: `c-${Date.now()}`,
      name: category.name || '',
      slug: category.slug || '',
      image_url: category.image_url || '',
      description: category.description || null,
      sort_order: category.sort_order || localCategories.length + 1,
      is_active: category.is_active ?? true,
      created_at: new Date().toISOString(),
      product_count: 0,
    };
    localCategories = [...localCategories, newCat];
    return newCat;
  }

  const { data, error } = await supabase
    .from('categories')
    .insert([category])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Category;
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
  if (shouldUseMock()) {
    const updated = await fetchLocal<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (updated) return updated;

    localCategories = localCategories.map((c) => (c.id === id ? { ...c, ...updates } : c));
    const u = localCategories.find((c) => c.id === id);
    if (!u) throw new Error('Category not found');
    return u;
  }

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  // Check if category still has products
  if (shouldUseMock()) {
    const res = await fetch(`${LOCAL_API}/categories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      localCategories = localCategories.filter((c) => c.id !== id);
      return;
    }
    const err = await res.json().catch(() => ({}));
    if (err.error) throw new Error(err.error);

    const hasProducts = localProducts.some((p) => p.category_id === id);
    if (hasProducts) {
      throw new Error(
        'Cannot delete category because it contains active products. Please reassign or delete the products first.'
      );
    }
    localCategories = localCategories.filter((c) => c.id !== id);
    return;
  }

  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id);

  if (count && count > 0) {
    throw new Error(
      `Cannot delete category because it contains ${count} active products. Please reassign or delete the products first.`
    );
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* ORDERS API                                                                 */
/* -------------------------------------------------------------------------- */
export async function getOrders(statusFilter?: string): Promise<Order[]> {
  if (shouldUseMock()) {
    const params = statusFilter && statusFilter !== 'all' ? `?status=${statusFilter}` : '';
    const remoteOrders = await fetchLocal<Order[]>(`/orders${params}`);
    if (remoteOrders) return remoteOrders;

    if (!statusFilter || statusFilter === 'all') return localOrders;
    return localOrders.filter((o) => o.order_status === statusFilter);
  }

  let query = supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('order_status', statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching orders:', error);
    return localOrders;
  }
  return data as Order[];
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (shouldUseMock()) {
    const remoteOrder = await fetchLocal<Order>(`/orders/${id}`);
    if (remoteOrder) return remoteOrder;
    return localOrders.find((o) => o.id === id) || null;
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Order;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  cancelReason?: string
): Promise<void> {
  if (shouldUseMock()) {
    const res = await fetch(`${LOCAL_API}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_status: newStatus, cancel_reason: cancelReason }),
    });
    if (res.ok) return;

    localOrders = localOrders.map((o) => {
      if (o.id === orderId) {
        // If becoming cancelled, restore stock in mock
        if (newStatus === 'cancelled' && !o.is_stock_restored) {
          o.order_items?.forEach((item) => {
            const prod = localProducts.find((p) => p.id === item.product_id);
            if (prod) prod.stock_quantity += item.quantity;
          });
          o.is_stock_restored = true;
        }

        return {
          ...o,
          order_status: newStatus,
          payment_status: newStatus === 'delivered' ? 'paid' : o.payment_status,
          cancel_reason: cancelReason || o.cancel_reason,
          updated_at: new Date().toISOString(),
        };
      }
      return o;
    });
    return;
  }

  const { error } = await supabase.rpc('admin_update_order_status', {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_cancel_reason: cancelReason || null,
  });

  if (error) throw new Error(error.message);
}

export async function createCustomerOrder(payload: {
  address: any;
  items: { product: Product; quantity: number }[];
}): Promise<Order> {
  const subtotalPaise = payload.items.reduce(
    (sum, item) => sum + item.product.selling_price_paise * item.quantity,
    0
  );
  const deliveryFeePaise = subtotalPaise >= 19900 ? 0 : 2500;
  const totalPaise = subtotalPaise + deliveryFeePaise;
  const orderNumber = 'MM-' + Date.now().toString().slice(-6);

  const newOrder: any = {
    order_number: orderNumber,
    user_id: 'd0000000-0000-0000-0000-000000000001',
    address_snapshot: payload.address,
    subtotal_paise: subtotalPaise,
    delivery_fee_paise: deliveryFeePaise,
    discount_paise: 0,
    total_paise: totalPaise,
    order_status: 'placed',
    payment_status: 'pending',
    payment_method: 'cod',
    delivery_partner_name: null,
    delivery_partner_phone: null,
    estimated_delivery_minutes: 10,
    cancellation_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!shouldUseMock()) {
    try {
      const { data: insertedOrder, error: orderErr } = await supabase
        .from('orders')
        .insert(newOrder)
        .select()
        .single();

      if (!orderErr && insertedOrder) {
        const orderItems = payload.items.map((i) => ({
          order_id: insertedOrder.id,
          product_id: i.product.id,
          product_name_snapshot: i.product.name,
          product_image_snapshot: i.product.image_urls?.[0] || '',
          unit_label_snapshot: i.product.unit_label || '',
          unit_price_paise: i.product.selling_price_paise,
          quantity: i.quantity,
          line_total_paise: i.product.selling_price_paise * i.quantity,
        }));

        await supabase.from('order_items').insert(orderItems);

        // Deduct inventory
        for (const item of payload.items) {
          await adjustProductStock(item.product.id, -item.quantity);
        }

        return {
          ...insertedOrder,
          order_items: orderItems,
        } as Order;
      }
    } catch (e) {
      console.warn('Supabase order creation fallback:', e);
    }
  }

  // Fallback / in-memory working copy
  const fallbackOrder: Order = {
    ...newOrder,
    id: 'ord-' + Date.now(),
    order_items: payload.items.map((i, idx) => ({
      id: 'oi-' + Date.now() + '-' + idx,
      order_id: 'ord-' + Date.now(),
      product_id: i.product.id,
      product_name_snapshot: i.product.name,
      product_image_snapshot: i.product.image_urls?.[0] || '',
      unit_label_snapshot: i.product.unit_label || '',
      unit_price_paise: i.product.selling_price_paise,
      quantity: i.quantity,
      line_total_paise: i.product.selling_price_paise * i.quantity,
    })),
  };
  localOrders.unshift(fallbackOrder);
  return fallbackOrder;
}

/* -------------------------------------------------------------------------- */
/* STORE SETTINGS API                                                         */
/* -------------------------------------------------------------------------- */
export async function getStoreSettings(): Promise<StoreSettings> {
  if (shouldUseMock()) {
    const remoteSettings = await fetchLocal<StoreSettings>('/store-settings');
    if (remoteSettings) return remoteSettings;
    return localSettings;
  }

  const { data, error } = await supabase.from('store_settings').select('*').limit(1).single();
  if (error) {
    console.error('Error fetching store settings:', error);
    return localSettings;
  }
  return data as StoreSettings;
}

export async function updateStoreSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
  if (shouldUseMock()) {
    const remoteUpdated = await fetchLocal<StoreSettings>('/store-settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    if (remoteUpdated) return remoteUpdated;

    localSettings = { ...localSettings, ...settings, updated_at: new Date().toISOString() };
    return localSettings;
  }

  const { data, error } = await supabase
    .from('store_settings')
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq('id', settings.id || 'a0000000-0000-0000-0000-000000000001')
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as StoreSettings;
}

/* -------------------------------------------------------------------------- */
/* PROMOTIONS API                                                             */
/* -------------------------------------------------------------------------- */
export async function getPromotions(): Promise<Promotion[]> {
  if (shouldUseMock()) {
    return localPromotions;
  }

  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching promotions:', error);
    return localPromotions;
  }
  return data as Promotion[];
}

export async function createPromotion(promo: Partial<Promotion>): Promise<Promotion> {
  if (shouldUseMock()) {
    const newPromo: Promotion = {
      id: `b-${Date.now()}`,
      title: promo.title || '',
      description: promo.description || null,
      banner_url: promo.banner_url || '',
      category_id: promo.category_id || null,
      product_id: promo.product_id || null,
      is_active: promo.is_active ?? true,
      sort_order: promo.sort_order || localPromotions.length + 1,
      created_at: new Date().toISOString(),
    };
    localPromotions = [...localPromotions, newPromo];
    return newPromo;
  }

  const { data, error } = await supabase.from('promotions').insert([promo]).select().single();
  if (error) throw new Error(error.message);
  return data as Promotion;
}

export async function updatePromotion(id: string, updates: Partial<Promotion>): Promise<Promotion> {
  if (shouldUseMock()) {
    localPromotions = localPromotions.map((p) => (p.id === id ? { ...p, ...updates } : p));
    const updated = localPromotions.find((p) => p.id === id);
    if (!updated) throw new Error('Promotion not found');
    return updated;
  }

  const { data, error } = await supabase
    .from('promotions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Promotion;
}

export async function deletePromotion(id: string): Promise<void> {
  if (shouldUseMock()) {
    localPromotions = localPromotions.filter((p) => p.id !== id);
    return;
  }

  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* REALTIME ORDER SUBSCRIPTION                                                */
/* -------------------------------------------------------------------------- */
export function subscribeToOrders(
  onInsert: (order: Order) => void,
  onUpdate: (order: Order) => void
): () => void {
  if (shouldUseMock() && typeof window !== 'undefined') {
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${LOCAL_API}/events`);
      es.addEventListener('ORDER_CREATED', (e) => {
        try {
          const order = JSON.parse(e.data);
          onInsert(order);
        } catch {}
      });
      es.addEventListener('ORDER_UPDATED', (e) => {
        try {
          const order = JSON.parse(e.data);
          onUpdate(order);
        } catch {}
      });
    } catch {}
    return () => {
      if (es) es.close();
    };
  }

  // Supabase Realtime channel
  const channel = supabase
    .channel('orders_realtime_feed')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      (payload) => onInsert(payload.new as Order)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders' },
      (payload) => onUpdate(payload.new as Order)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
