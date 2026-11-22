import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, CartItem } from '@mymart/shared';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
  getSubtotalPaise: () => number;
  getTotalCount: () => number;
  revalidateCart: () => Promise<{ isValid: boolean; updatedItems: CartItem[]; changes: string[] }>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product) => {
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((item) => item.product.id === product.id);

        if (existingIndex > -1) {
          const currentQty = currentItems[existingIndex].quantity;
          if (currentQty >= product.stock_quantity) {
            // Cannot exceed available stock
            return;
          }
          const updated = [...currentItems];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: currentQty + 1,
            product, // update with latest product snapshot
          };
          set({ items: updated });
        } else {
          if (product.stock_quantity <= 0) return;
          set({ items: [...currentItems, { product, quantity: 1 }] });
        }
      },

      removeItem: (productId: string) => {
        set({
          items: get().items.filter((item) => item.product.id !== productId),
        });
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        const currentItems = get().items;
        const updated = currentItems.map((item) => {
          if (item.product.id === productId) {
            const cappedQty = Math.min(quantity, item.product.stock_quantity);
            return { ...item, quantity: cappedQty };
          }
          return item;
        });

        set({ items: updated });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getItemQuantity: (productId: string) => {
        const item = get().items.find((i) => i.product.id === productId);
        return item ? item.quantity : 0;
      },

      getSubtotalPaise: () => {
        return get().items.reduce((sum, item) => {
          return sum + item.product.selling_price_paise * item.quantity;
        }, 0);
      },

      getTotalCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      revalidateCart: async () => {
        const currentItems = get().items;
        if (currentItems.length === 0) return { isValid: true, updatedItems: [], changes: [] };

        if (!isSupabaseConfigured) {
          return { isValid: true, updatedItems: currentItems, changes: [] };
        }

        const productIds = currentItems.map((i) => i.product.id);
        const { data: latestProducts, error } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);

        if (error || !latestProducts) {
          return { isValid: true, updatedItems: currentItems, changes: [] };
        }

        const updatedItems: CartItem[] = [];
        const changes: string[] = [];

        for (const item of currentItems) {
          const fresh = latestProducts.find((p) => p.id === item.product.id);
          if (!fresh || !fresh.is_active || fresh.stock_quantity <= 0) {
            changes.push(`"${item.product.name}" went out of stock and was removed from cart.`);
            continue; // Dropped
          }

          let finalQty = item.quantity;
          if (item.quantity > fresh.stock_quantity) {
            finalQty = fresh.stock_quantity;
            changes.push(`"${fresh.name}" quantity adjusted to maximum available (${fresh.stock_quantity}).`);
          }

          if (fresh.selling_price_paise !== item.product.selling_price_paise) {
            changes.push(`"${fresh.name}" price updated from ₹${item.product.selling_price_paise / 100} to ₹${fresh.selling_price_paise / 100}.`);
          }

          updatedItems.push({
            product: fresh as Product,
            quantity: finalQty,
          });
        }

        set({ items: updatedItems });
        return {
          isValid: changes.length === 0,
          updatedItems,
          changes,
        };
      },
    }),
    {
      name: 'mymart-customer-cart',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
