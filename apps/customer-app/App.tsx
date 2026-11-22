import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Product, Category, CustomerAddress } from '@mymart/shared';
import { AuthProvider } from './src/context/AuthContext';
import { useCartStore } from './src/store/cartStore';

// Screens & Modals
import { HomeScreen } from './src/screens/HomeScreen';
import { CategoriesScreen } from './src/screens/CategoriesScreen';
import { CartScreen } from './src/screens/CartScreen';
import { OrdersListScreen } from './src/screens/OrdersListScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ProductDetailModal } from './src/screens/ProductDetailModal';
import { SearchScreen } from './src/screens/SearchScreen';
import { CheckoutScreen } from './src/screens/CheckoutScreen';
import { OrderTrackingScreen } from './src/screens/OrderTrackingScreen';
import { AddressManageModal } from './src/screens/AddressManageModal';
import { AuthModal } from './src/screens/AuthModal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
    },
  },
});

type TabType = 'home' | 'categories' | 'cart' | 'orders' | 'profile';

export function CustomerApp() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [checkoutScreenOpen, setCheckoutScreenOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedCategoryFromHome, setSelectedCategoryFromHome] = useState<Category | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);

  const { getTotalCount } = useCartStore();
  const cartTotalCount = getTotalCount();

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategoryFromHome(cat);
    setActiveTab('categories');
  };

  const handleOrderPlaced = (orderId: string, orderNumber: string) => {
    setCheckoutScreenOpen(false);
    setTrackingOrderId(orderId);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        {/* Main Tab Screen Content */}
        <View style={styles.content}>
          {activeTab === 'home' && (
            <HomeScreen
              onSelectProduct={(p) => setSelectedProduct(p)}
              onOpenSearch={() => setSearchModalOpen(true)}
              onOpenCart={() => setActiveTab('cart')}
              onSelectCategory={handleSelectCategory}
              onOpenAddressSelector={() => setAddressModalOpen(true)}
              selectedAddressText={
                selectedAddress
                  ? `${selectedAddress.area}, ${selectedAddress.city} - ${selectedAddress.pincode}`
                  : 'Indiranagar, Bengaluru - 560038'
              }
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesScreen
              initialCategoryId={selectedCategoryFromHome?.id}
              onSelectProduct={(p) => setSelectedProduct(p)}
              onOpenCart={() => setActiveTab('cart')}
            />
          )}

          {activeTab === 'cart' && (
            <CartScreen
              onProceedToCheckout={() => setCheckoutScreenOpen(true)}
              onExploreProducts={() => setActiveTab('home')}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersListScreen
              onTrackOrder={(id) => setTrackingOrderId(id)}
              onExploreProducts={() => setActiveTab('home')}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileScreen
              onOpenOrders={() => setActiveTab('orders')}
              onOpenAddresses={() => setAddressModalOpen(true)}
              onOpenAuth={() => setAuthModalOpen(true)}
            />
          )}
        </View>

        {/* Bottom Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('home')}
            style={styles.tabItem}
          >
            <Text style={[styles.tabIcon, activeTab === 'home' && styles.tabIconActive]}>
              🏠
            </Text>
            <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('categories')}
            style={styles.tabItem}
          >
            <Text style={[styles.tabIcon, activeTab === 'categories' && styles.tabIconActive]}>
              🏷️
            </Text>
            <Text
              style={[styles.tabLabel, activeTab === 'categories' && styles.tabLabelActive]}
            >
              Categories
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('cart')}
            style={styles.tabItem}
          >
            <View style={styles.cartTabIconWrapper}>
              <Text style={[styles.tabIcon, activeTab === 'cart' && styles.tabIconActive]}>
                🛒
              </Text>
              {cartTotalCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartTotalCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, activeTab === 'cart' && styles.tabLabelActive]}>
              Cart
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('orders')}
            style={styles.tabItem}
          >
            <Text style={[styles.tabIcon, activeTab === 'orders' && styles.tabIconActive]}>
              📦
            </Text>
            <Text style={[styles.tabLabel, activeTab === 'orders' && styles.tabLabelActive]}>
              Orders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('profile')}
            style={styles.tabItem}
          >
            <Text style={[styles.tabIcon, activeTab === 'profile' && styles.tabIconActive]}>
              👤
            </Text>
            <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* Product Details Modal */}
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onOpenCart={() => {
              setSelectedProduct(null);
              setActiveTab('cart');
            }}
          />
        )}

        {/* Search Screen Modal */}
        {searchModalOpen && (
          <SearchScreen
            onClose={() => setSearchModalOpen(false)}
            onSelectProduct={(p) => {
              setSearchModalOpen(false);
              setSelectedProduct(p);
            }}
          />
        )}

        {/* Checkout Screen Modal */}
        {checkoutScreenOpen && (
          <CheckoutScreen
            onBack={() => setCheckoutScreenOpen(false)}
            onOrderPlaced={handleOrderPlaced}
            onManageAddresses={() => setAddressModalOpen(true)}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        )}

        {/* Order Tracking Modal */}
        {trackingOrderId && (
          <OrderTrackingScreen
            orderId={trackingOrderId}
            onBackToHome={() => setTrackingOrderId(null)}
          />
        )}

        {/* Address Manage Modal */}
        {addressModalOpen && (
          <AddressManageModal
            onClose={() => setAddressModalOpen(false)}
            onSelectAddress={(addr) => {
              setSelectedAddress(addr);
              setAddressModalOpen(false);
            }}
          />
        )}

        {/* Authentication Modal */}
        {authModalOpen && (
          <AuthModal
            onClose={() => setAuthModalOpen(false)}
            onSuccess={() => setAuthModalOpen(false)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CustomerApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabIconActive: {
    transform: [{ scale: 1.15 }],
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  tabLabelActive: {
    color: '#16a34a',
    fontWeight: '900',
  },
  cartTabIconWrapper: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
});
