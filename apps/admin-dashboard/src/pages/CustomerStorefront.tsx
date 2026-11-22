import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  formatPaiseToRupees,
  calculateDiscountPercentage,
  Category,
  Product,
  Order,
  OrderStatus,
  ORDER_STATUS_DETAILS,
  ORDER_STATUS_PROGRESS,
  isValidIndianMobile,
  isValidIndianPincode,
} from '@mymart/shared';
import {
  ShoppingCart,
  Search,
  MapPin,
  Clock,
  Plus,
  Minus,
  CheckCircle2,
  Package,
  Truck,
  Home,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Smartphone,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = 'http://localhost:5001/api';

interface CartItem {
  product: Product;
  quantity: number;
}

export const CustomerStorefront: React.FC = () => {
  const queryClient = useQueryClient();

  // View state
  const [isPhoneFrame, setIsPhoneFrame] = useState(true);
  const [currentTab, setCurrentTab] = useState<'home' | 'cart' | 'tracking' | 'orders'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('mymart_customer_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active tracking order
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(() => {
    try {
      const saved = localStorage.getItem('mymart_last_order');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Delivery address
  const [address, setAddress] = useState({
    recipient_name: 'Rahul Sharma',
    phone: '+919876543210',
    flat_house: 'Flat 402, Sunshine Apts',
    street_address: '100ft Road, Indiranagar',
    area_locality: 'Indiranagar 1st Stage',
    landmark: 'Opposite Metro Pillar 42',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
  });
  const [showAddressEdit, setShowAddressEdit] = useState(false);

  // Sync cart to localStorage
  useEffect(() => {
    localStorage.setItem('mymart_customer_cart', JSON.stringify(cart));
  }, [cart]);

  // Fetch Categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['store-categories'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/categories`);
      if (!res.ok) throw new Error('Failed to load categories');
      return res.json();
    },
  });

  // Fetch Products
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['store-products', selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      const res = await fetch(`${API_BASE}/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load products');
      return res.json();
    },
  });

  // Fetch Store Settings
  const { data: settings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/store-settings`);
      if (!res.ok) throw new Error('Failed to load settings');
      return res.json();
    },
  });

  // Fetch Past Orders
  const { data: customerOrders = [], refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['customer-orders'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/orders?user_id=cust-demo`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Real-Time SSE Listener for Live Order Tracking
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API_BASE}/events`);
      es.addEventListener('ORDER_UPDATED', (e) => {
        try {
          const updated: Order = JSON.parse(e.data);
          if (trackedOrder && trackedOrder.id === updated.id) {
            setTrackedOrder(updated);
            localStorage.setItem('mymart_last_order', JSON.stringify(updated));
          }
          refetchOrders();
        } catch (err) {
          console.error(err);
        }
      });
      es.addEventListener('STOCK_UPDATED', () => {
        queryClient.invalidateQueries({ queryKey: ['store-products'] });
      });
    } catch (e) {
      console.warn('SSE not supported or connection error:', e);
    }
    return () => {
      if (es) es.close();
    };
  }, [trackedOrder, refetchOrders, queryClient]);

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter((item) => item.product.id !== productId);
    });
  };

  const getItemQuantity = (productId: string) => {
    const item = cart.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  // Calculations
  const cartSubtotalPaise = cart.reduce(
    (sum, item) => sum + item.product.selling_price_paise * item.quantity,
    0
  );
  const freeThreshold = settings?.free_delivery_threshold_paise || 24900;
  const standardDeliveryFee = settings?.delivery_fee_paise || 2500;
  const isFreeDelivery = cartSubtotalPaise >= freeThreshold;
  const deliveryFeePaise = cart.length === 0 ? 0 : isFreeDelivery ? 0 : standardDeliveryFee;
  const finalTotalPaise = cartSubtotalPaise + deliveryFeePaise;
  const neededForFreeDelivery = Math.max(0, freeThreshold - cartSubtotalPaise);

  // Place Order Mutation
  const [orderError, setOrderError] = useState<string | null>(null);
  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      setOrderError(null);
      const payload = {
        user_id: 'cust-demo',
        address,
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      };
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');
      return data.order as Order;
    },
    onSuccess: (newOrder) => {
      setCart([]);
      setTrackedOrder(newOrder);
      localStorage.setItem('mymart_last_order', JSON.stringify(newOrder));
      setCurrentTab('tracking');
      refetchOrders();
      queryClient.invalidateQueries({ queryKey: ['store-products'] });
    },
    onError: (err: any) => {
      setOrderError(err.message);
    },
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-3 sm:p-6 font-sans">
      {/* Top Bar for Switchers */}
      <header className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 mb-4 bg-slate-800/80 backdrop-blur border border-slate-700/60 p-3 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <Link
            to="/orders"
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin Dashboard
          </Link>
          <span className="text-xs text-slate-400 hidden sm:inline">|</span>
          <span className="text-xs text-slate-300 font-medium hidden sm:inline">
            ✨ Interactive Customer Experience (Zepto / Swiggy Instamart Style)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPhoneFrame(!isPhoneFrame)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              isPhoneFrame
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            {isPhoneFrame ? 'Mobile Frame View' : 'Full Width View'}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main
        className={`w-full transition-all duration-300 ${
          isPhoneFrame
            ? 'max-w-[420px] rounded-[42px] border-[10px] border-slate-800 shadow-2xl overflow-hidden'
            : 'max-w-4xl rounded-2xl border border-slate-700 shadow-xl overflow-hidden'
        } bg-white text-slate-800 flex flex-col min-h-[780px]`}
      >
        {/* Customer App Top Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 pt-4 pb-3 shadow-md">
          {/* Brand & Delivery ETA */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-white flex items-center gap-1">
                  ⚡ My<span className="text-yellow-300">Mart</span>
                </span>
                <span className="bg-yellow-400 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  10 Mins
                </span>
              </div>
              <button
                onClick={() => setShowAddressEdit(true)}
                className="flex items-center gap-1 text-xs text-emerald-100 hover:text-white mt-0.5 group text-left"
              >
                <MapPin className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                <span className="truncate max-w-[200px] font-medium">
                  {address.flat_house}, {address.street_address}
                </span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
              </button>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              {trackedOrder && (
                <button
                  onClick={() => setCurrentTab('tracking')}
                  className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-full font-medium transition animate-pulse"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Track Live
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mt-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search for 'milk', 'chips', 'apples'..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-slate-900 text-xs pl-9 pr-3 py-2 rounded-xl border-none outline-none shadow-sm placeholder-slate-400 focus:ring-2 focus:ring-yellow-400 transition"
            />
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
          {/* ===================== TAB: HOME ===================== */}
          {currentTab === 'home' && (
            <div className="p-3 space-y-4 flex-1">
              {/* Promo Banner Carousel */}
              <div className="relative rounded-2xl overflow-hidden shadow-sm bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-white p-4">
                <div className="max-w-[70%]">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block mb-1">
                    Free Delivery ₹249+
                  </span>
                  <h3 className="text-base font-extrabold leading-tight">Super Saver Grocery Week</h3>
                  <p className="text-xs text-orange-100 mt-1">Up to 30% off fresh staples, dairy & snacks.</p>
                </div>
                <div className="absolute right-2 bottom-1 text-4xl opacity-90 select-none">🥦🍎🥛</div>
              </div>

              {/* Categories Scroll / Pills */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Explore Categories
                  </h4>
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-[11px] text-emerald-600 font-semibold hover:underline"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      selectedCategory === null
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    All Items
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                        selectedCategory === cat.id
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <img src={cat.image_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {selectedCategory
                      ? `${categories.find((c) => c.id === selectedCategory)?.name || 'Category'} (${products.length})`
                      : `Featured Groceries (${products.length})`}
                  </h4>
                </div>

                {productsLoading ? (
                  <div className="py-12 text-center text-slate-400 text-xs">Loading fresh stock...</div>
                ) : products.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No products found matching your search.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {products.map((product) => {
                      const qty = getItemQuantity(product.id);
                      const discount = calculateDiscountPercentage(
                        product.mrp_paise,
                        product.selling_price_paise
                      );
                      const isOutOfStock = product.stock_quantity <= 0;

                      return (
                        <div
                          key={product.id}
                          className="bg-white rounded-xl border border-slate-100 p-2.5 flex flex-col justify-between shadow-sm hover:shadow-md transition"
                        >
                          <div>
                            {/* Product Image & Badges */}
                            <div className="relative aspect-square rounded-lg bg-slate-50 overflow-hidden mb-2">
                              <img
                                src={product.image_urls[0]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {discount > 0 && (
                                <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                                  {discount}% OFF
                                </span>
                              )}
                              {isOutOfStock && (
                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center text-white text-[11px] font-bold">
                                  Out of Stock
                                </div>
                              )}
                            </div>

                            {/* Weight / Unit */}
                            <div className="text-[10px] font-semibold text-slate-400 tracking-tight">
                              {product.unit_label}
                            </div>

                            {/* Name */}
                            <h5 className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight mt-0.5">
                              {product.name}
                            </h5>
                            <span className="text-[10px] text-slate-400">{product.brand}</span>
                          </div>

                          {/* Pricing & Add Button */}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50">
                            <div>
                              <div className="text-xs font-black text-slate-900">
                                {formatPaiseToRupees(product.selling_price_paise)}
                              </div>
                              {product.mrp_paise > product.selling_price_paise && (
                                <div className="text-[10px] text-slate-400 line-through">
                                  {formatPaiseToRupees(product.mrp_paise)}
                                </div>
                              )}
                            </div>

                            {/* Cart Controller */}
                            {isOutOfStock ? (
                              <button
                                disabled
                                className="px-2 py-1 text-[10px] font-bold text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed"
                              >
                                Sold Out
                              </button>
                            ) : qty > 0 ? (
                              <div className="flex items-center bg-emerald-600 text-white rounded-lg shadow-sm overflow-hidden">
                                <button
                                  onClick={() => removeFromCart(product.id)}
                                  className="px-2 py-1 hover:bg-emerald-700 transition"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-bold px-1.5">{qty}</span>
                                <button
                                  onClick={() => addToCart(product)}
                                  className="px-2 py-1 hover:bg-emerald-700 transition"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(product)}
                                className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-black transition shadow-xs"
                              >
                                ADD
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== TAB: CART ===================== */}
          {currentTab === 'cart' && (
            <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-slate-800">Review Basket ({cart.length} items)</h3>
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-red-500 font-semibold hover:underline"
                  >
                    Clear All
                  </button>
                </div>

                {/* Free delivery progress */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 mb-3">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
                    <span>{isFreeDelivery ? '🎉 FREE Delivery Unlocked!' : `Add ${formatPaiseToRupees(neededForFreeDelivery)} for FREE Delivery`}</span>
                    <span>{Math.min(100, Math.round((cartSubtotalPaise / freeThreshold) * 100))}%</span>
                  </div>
                  <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (cartSubtotalPaise / freeThreshold) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Cart Items List */}
                {cart.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-medium">Your basket is empty.</p>
                    <button
                      onClick={() => setCurrentTab('home')}
                      className="mt-3 text-xs bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl shadow-sm"
                    >
                      Browse Groceries
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-100 p-2 shadow-xs">
                    {cart.map((item) => (
                      <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={item.product.image_urls[0]}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover bg-slate-50 shrink-0"
                          />
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-800 truncate">{item.product.name}</h5>
                            <span className="text-[10px] text-slate-400">
                              {formatPaiseToRupees(item.product.selling_price_paise)} / {item.product.unit_label}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="p-1 hover:bg-slate-200 transition"
                            >
                              <Minus className="w-3 h-3 text-slate-600" />
                            </button>
                            <span className="text-xs font-bold px-2 text-slate-800">{item.quantity}</span>
                            <button
                              onClick={() => addToCart(item.product)}
                              className="p-1 hover:bg-slate-200 transition"
                            >
                              <Plus className="w-3 h-3 text-slate-600" />
                            </button>
                          </div>
                          <span className="text-xs font-black text-slate-800 w-14 text-right">
                            {formatPaiseToRupees(item.product.selling_price_paise * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Delivery Address Card */}
                {cart.length > 0 && (
                  <div className="mt-4 bg-white rounded-2xl border border-slate-100 p-3 shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Delivering to
                      </span>
                      <button
                        onClick={() => setShowAddressEdit(true)}
                        className="text-[11px] font-semibold text-emerald-600 hover:underline"
                      >
                        Change
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 leading-snug">
                      <span className="font-semibold text-slate-800">{address.recipient_name}</span> ({address.phone})<br />
                      {address.flat_house}, {address.street_address}, {address.city} - {address.pincode}
                    </p>
                  </div>
                )}

                {/* Bill Breakdown */}
                {cart.length > 0 && (
                  <div className="mt-3 bg-white rounded-2xl border border-slate-100 p-3 shadow-xs space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Item Total</span>
                      <span className="font-bold text-slate-800">{formatPaiseToRupees(cartSubtotalPaise)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span className="font-bold text-slate-800">
                        {isFreeDelivery ? <span className="text-emerald-600">FREE</span> : formatPaiseToRupees(deliveryFeePaise)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-100 text-sm font-black text-slate-900">
                      <span>To Pay</span>
                      <span>{formatPaiseToRupees(finalTotalPaise)}</span>
                    </div>
                  </div>
                )}

                {orderError && (
                  <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{orderError}</span>
                  </div>
                )}
              </div>

              {/* Checkout Action Button */}
              {cart.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <button
                    onClick={() => placeOrderMutation.mutate()}
                    disabled={placeOrderMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {placeOrderMutation.isPending ? (
                      'Placing Order...'
                    ) : (
                      <>
                        <span>Pay {formatPaiseToRupees(finalTotalPaise)} on Delivery (COD)</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-slate-400 mt-1.5 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    100% Free Technology Stack &bull; Cash on Delivery
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB: LIVE TRACKING ===================== */}
          {currentTab === 'tracking' && (
            <div className="p-4 flex-1 space-y-4">
              {trackedOrder ? (
                <div>
                  <div className="bg-emerald-600 text-white rounded-2xl p-4 shadow-sm mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                        Live Tracking
                      </span>
                      <span className="text-xs font-mono">{trackedOrder.order_number}</span>
                    </div>
                    <h3 className="text-lg font-black mt-2">
                      {ORDER_STATUS_DETAILS[trackedOrder.order_status as OrderStatus]?.label || trackedOrder.order_status}
                    </h3>
                    <p className="text-xs text-emerald-100 mt-0.5">
                      {ORDER_STATUS_DETAILS[trackedOrder.order_status as OrderStatus]?.description || 'Order in progress.'}
                    </p>
                  </div>

                  {/* 5-Stage Live Timeline */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                      Delivery Progress
                    </h4>

                    {trackedOrder.order_status === 'cancelled' ? (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                        <strong>Order Cancelled:</strong> {trackedOrder.cancel_reason || 'Cancelled by store'}
                      </div>
                    ) : (
                      <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {[
                          { key: 'placed', label: 'Order Placed', desc: 'Received at store' },
                          { key: 'confirmed', label: 'Order Confirmed', desc: 'Store accepted order' },
                          { key: 'packed', label: 'Order Packed', desc: 'Packed fresh & bag sealed' },
                          { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Rider on the way' },
                          { key: 'delivered', label: 'Delivered', desc: 'Handed over at doorstep' },
                        ].map((stage, idx) => {
                          const currentProgress = ORDER_STATUS_PROGRESS.indexOf(trackedOrder.order_status as OrderStatus);
                          const stageProgress = ORDER_STATUS_PROGRESS.indexOf(stage.key as OrderStatus);
                          const isDone = currentProgress >= stageProgress && currentProgress !== -1;
                          const isCurrent = trackedOrder.order_status === stage.key;

                          return (
                            <div key={stage.key} className="flex items-start gap-3 relative z-10">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                                  isDone
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-200 text-slate-500'
                                } ${isCurrent ? 'ring-4 ring-emerald-100 animate-pulse' : ''}`}
                              >
                                {isDone ? '✓' : idx + 1}
                              </div>
                              <div className="flex-1">
                                <h5 className={`text-xs font-bold ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                                  {stage.label}
                                </h5>
                                <p className="text-[10px] text-slate-400">{stage.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Order Items Snapshot */}
                  <div className="mt-3 bg-white rounded-2xl border border-slate-100 p-3 shadow-xs">
                    <h5 className="text-xs font-bold text-slate-700 mb-2">Items in this Delivery</h5>
                    <div className="divide-y divide-slate-100 text-xs">
                      {((trackedOrder as any).items || (trackedOrder as any).order_items || [])?.map((item: any) => (
                        <div key={item.id} className="py-1.5 flex justify-between">
                          <span className="text-slate-700 font-medium truncate max-w-[200px]">
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="font-bold text-slate-900">{formatPaiseToRupees(item.subtotal_paise)}</span>
                        </div>
                      ))}
                      <div className="pt-2 flex justify-between font-black text-slate-900">
                        <span>Total (COD)</span>
                        <span>{formatPaiseToRupees(trackedOrder.total_paise)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">No active order to track.</p>
                  <button
                    onClick={() => setCurrentTab('home')}
                    className="mt-3 text-xs bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl"
                  >
                    Place a New Order
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB: ORDERS HISTORY ===================== */}
          {currentTab === 'orders' && (
            <div className="p-4 flex-1 space-y-3">
              <h3 className="text-sm font-black text-slate-800 mb-2">My Orders</h3>
              {customerOrders.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">No previous orders found.</div>
              ) : (
                customerOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-2xl border border-slate-100 p-3 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 font-mono">{ord.order_number}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                        {ord.order_status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500">
                      {new Date(ord.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' &bull; '}
                      <span className="font-bold text-slate-800">{formatPaiseToRupees(ord.total_paise)}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
                      <button
                        onClick={() => {
                          setTrackedOrder(ord);
                          setCurrentTab('tracking');
                        }}
                        className="text-xs text-emerald-600 font-bold hover:underline"
                      >
                        Track Status &rarr;
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Floating Cart Bar (if items in cart and on Home tab) */}
        {cart.length > 0 && currentTab === 'home' && (
          <div className="p-2.5 bg-emerald-700 text-white shadow-xl flex items-center justify-between animate-slide-up">
            <div>
              <div className="text-xs font-bold">
                {cart.reduce((s, i) => s + i.quantity, 0)} items &bull; {formatPaiseToRupees(cartSubtotalPaise)}
              </div>
              <div className="text-[10px] text-emerald-200">
                {isFreeDelivery ? 'FREE Delivery' : `+ ${formatPaiseToRupees(deliveryFeePaise)} Delivery`}
              </div>
            </div>
            <button
              onClick={() => setCurrentTab('cart')}
              className="flex items-center gap-1.5 bg-white text-emerald-800 text-xs font-black px-4 py-2 rounded-xl shadow-sm hover:bg-emerald-50 active:scale-95 transition"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              View Basket
            </button>
          </div>
        )}

        {/* Customer Bottom Navigation Bar */}
        <div className="bg-white border-t border-slate-100 px-4 py-2 flex items-center justify-around shadow-md">
          <button
            onClick={() => setCurrentTab('home')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              currentTab === 'home' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home className="w-4 h-4" />
            Home
          </button>

          <button
            onClick={() => setCurrentTab('cart')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold relative ${
              currentTab === 'cart' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Basket
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('tracking')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              currentTab === 'tracking' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Truck className="w-4 h-4" />
            Track
          </button>

          <button
            onClick={() => setCurrentTab('orders')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              currentTab === 'orders' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Package className="w-4 h-4" />
            Orders
          </button>
        </div>
      </main>

      {/* Address Edit Modal */}
      {showAddressEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-black text-slate-900">Change Delivery Address</h3>
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Recipient Name</label>
                <input
                  type="text"
                  value={address.recipient_name}
                  onChange={(e) => setAddress({ ...address, recipient_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">10-Digit Mobile</label>
                <input
                  type="text"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">House / Flat No.</label>
                <input
                  type="text"
                  value={address.flat_house}
                  onChange={(e) => setAddress({ ...address, flat_house: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Street & Locality</label>
                <input
                  type="text"
                  value={address.street_address}
                  onChange={(e) => setAddress({ ...address, street_address: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs mt-0.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">City</label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">PIN Code</label>
                  <input
                    type="text"
                    value={address.pincode}
                    onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs mt-0.5"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddressEdit(false)}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
