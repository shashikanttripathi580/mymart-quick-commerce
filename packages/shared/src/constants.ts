import { OrderStatus } from './types.js';

export const CURRENCY_SYMBOL = '₹';

export const ORDER_STATUS_DETAILS: Record<
  OrderStatus,
  {
    label: string;
    step: number;
    color: string;
    bgColor: string;
    borderColor: string;
    description: string;
  }
> = {
  placed: {
    label: 'Order Placed',
    step: 1,
    color: '#D97706', // amber-600
    bgColor: '#FEF3C7', // amber-100
    borderColor: '#FDE68A',
    description: 'We have received your order and sent it to the store',
  },
  confirmed: {
    label: 'Order Confirmed',
    step: 2,
    color: '#2563EB', // blue-600
    bgColor: '#DBEAFE', // blue-100
    borderColor: '#BFDBFE',
    description: 'Store manager confirmed your items are ready to pack',
  },
  packed: {
    label: 'Order Packed',
    step: 3,
    color: '#7C3AED', // violet-600
    bgColor: '#EDE9FE', // violet-100
    borderColor: '#DDD6FE',
    description: 'Your items have been safely packed in sanitized bags',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    step: 4,
    color: '#0284C7', // sky-600
    bgColor: '#E0F2FE', // sky-100
    borderColor: '#BAE6FD',
    description: 'Delivery partner is speeding to your doorstep',
  },
  delivered: {
    label: 'Delivered',
    step: 5,
    color: '#16A34A', // green-600
    bgColor: '#DCFCE7', // green-100
    borderColor: '#BBF7D0',
    description: 'Order delivered successfully. Enjoy your groceries!',
  },
  cancelled: {
    label: 'Cancelled',
    step: 0,
    color: '#DC2626', // red-600
    bgColor: '#FEE2E2', // red-100
    borderColor: '#FECACA',
    description: 'This order was cancelled and inventory was restored',
  },
};

export const ORDER_STATUS_PROGRESS: OrderStatus[] = [
  'placed',
  'confirmed',
  'packed',
  'out_for_delivery',
  'delivered',
];

export const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export const DEFAULT_STORE_SETTINGS = {
  store_name: 'MyMart Quick Commerce',
  logo_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
  support_phone: '+91 9876543210',
  support_email: 'support@mymartdelivery.in',
  delivery_fee_paise: 2500, // ₹25
  minimum_order_paise: 9900, // ₹99
  free_delivery_threshold_paise: 24900, // ₹249
  is_store_open: true,
  serviceable_pincodes: ['560001', '560002', '560025', '560034', '560038', '560068', '110001', '400001'],
  store_address: 'Plot 42, Green Glen Layout, Bellandur, Bengaluru, Karnataka - 560103',
};

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Chandigarh',
] as const;
