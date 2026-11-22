# MyMart – Quick Commerce Grocery Delivery Platform

A production-grade, 100% free-technology-first quick-commerce grocery delivery platform inspired by the UX of **Zepto**, **Swiggy Instamart**, and **Blinkit**.

Built with a unified monorepo architecture featuring an **Android Customer Mobile App** (React Native / Expo), an **Owner & Admin Web Dashboard** (React / Vite / Tailwind), a **Cloudflare Worker & R2 Image Storage Pipeline**, and an atomic **Supabase PostgreSQL Backend** with Row Level Security (RLS) and Realtime event streaming.

---

## 1. Primary Requirement: Free Technology Stack

| Platform Layer | Technology | Free Tier Allocation | Cost |
|---|---|---|---|
| **Customer Mobile App** | React Native, Expo, TypeScript, Zustand, TanStack Query | Open source & free Expo Go / EAS build free tier | **₹0 / $0** |
| **Admin Dashboard** | React, Vite, TypeScript, Tailwind CSS, Lucide React, TanStack Query | Hosted on Cloudflare Pages free tier (Unlimited requests, unlimited bandwidth) | **₹0 / $0** |
| **Backend Database & Auth** | Supabase (PostgreSQL, Supabase Auth, Realtime, SQL RPCs, RLS) | 500 MB database, 50,000 MAU, Realtime channels included free | **₹0 / $0** |
| **Product Media Storage** | Cloudflare R2 (S3-compatible) & Cloudflare Worker | 10 GB/month storage, 1M Class A ops, 10M Class B ops, **Zero egress fees** | **₹0 / $0** |
| **Payment Gateway** | Cash on Delivery (COD) in Release 1 | No payment gateway setup fee, zero transaction surcharge | **₹0 / $0** |
| **Maps & Addresses** | Form-based Indian postal addresses with 6-digit PIN code serviceability validation | No paid Google Maps or Places API dependencies | **₹0 / $0** |

---

## 2. Monorepo Project Architecture

```
mymart/
├── apps/
│   ├── admin-dashboard/            # React + Vite + Tailwind Admin Web Application
│   │   ├── src/
│   │   │   ├── components/         # AdminLayout, ImageUploader, StatusBadge, ConfirmModal, PriceDisplay
│   │   │   ├── context/            # AuthContext (Admin role verification)
│   │   │   ├── lib/                # Supabase client, API query functions, Cloudflare R2 presigned upload
│   │   │   ├── pages/              # Dashboard, Products, ProductForm, Categories, Orders, Inventory, Offers, Settings, Login
│   │   │   ├── App.tsx             # React Router routing
│   │   │   └── main.tsx            # App entrypoint
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tailwind.config.js
│   │   └── vite.config.ts
│   │
│   └── customer-app/               # React Native + Expo Customer Mobile Application
│       ├── assets/                 # App icons and splash screen placeholders
│       ├── src/
│       │   ├── components/         # ProductCard, CategoryPill, BannerCarousel
│       │   ├── context/            # Customer AuthContext (Guest browse + Authenticated checkout)
│       │   ├── lib/                # Supabase client, Customer API helpers, Offline mock data
│       │   ├── screens/            # Home, Categories, ProductDetail, Cart, Checkout, OrderTracking, OrdersList, Profile, AddressManage, AuthModal
│       │   └── store/              # Zustand persistent cart store (AsyncStorage) with backend revalidation
│       ├── app.json                # Expo configuration (Android package: com.mymart.delivery)
│       ├── App.tsx                 # Root navigation, Tab bar, and screen modals
│       ├── index.js                # registerRootComponent entry
│       └── package.json
│
├── backend/
│   ├── cloudflare-worker/          # Cloudflare Worker for Presigned R2 Uploads
│   │   ├── src/
│   │   │   └── index.ts            # Worker with Supabase Admin JWT verification & S3 presigner
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── wrangler.toml           # Worker deployment manifest
│   │   └── README.md
│   │
│   └── supabase/
│       ├── migrations/
│       │   └── 001_initial_schema.sql  # 9 tables, RLS policies, atomic order RPC, status transition RPC, Realtime publication
│       └── seed.sql                # 10 realistic grocery categories, 30+ products, default store settings, banners
│
├── packages/
│   └── shared/                     # Shared TypeScript types, constants, formatters, and validators
│       ├── src/
│       │   ├── types.ts            # Product, Order, Category, Profile, StoreSettings, CartItem
│       │   ├── constants.ts        # Order status progression, transition guards, default settings
│       │   ├── utils.ts            # Integer paise formatters (₹), discount % calculation, phone & PIN validation
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── test/
│   └── run-tests.mjs               # Comprehensive unit and integration test suite (59 assertions)
│
├── .env.example                    # Unified environment variables template
├── .gitignore
├── package.json                    # Monorepo workspaces manifest
└── README.md                       # Complete documentation
```

---

## 3. Database Schema & Security Architecture

### Tables

1. **`profiles`**: User metadata, phone, and role (`customer` or `admin`). Always defaults to `customer`. Protected by a trigger preventing unauthorized self-elevation to `admin`.
2. **`categories`**: Aisles/departments with slug, image, description, display sort order, and active toggle.
3. **`products`**: Full catalog with SKU, brand, category, unit/weight label (e.g. `500 g`, `1 kg`), `selling_price_paise` (INT), `mrp_paise` (INT), `stock_quantity`, `low_stock_threshold`, image URLs, and active/featured flags.
4. **`customer_addresses`**: Full Indian delivery address records: Full name, 10-digit phone, house/flat number, street, area, landmark, city, state, and 6-digit PIN code.
5. **`orders`**: Realtime order fulfillment record with immutable `address_snapshot` (JSONB), `subtotal_paise`, `delivery_fee_paise`, `discount_paise`, `total_paise`, `payment_method` (`COD`), `order_status` (`placed`, `confirmed`, `packed`, `out_for_delivery`, `delivered`, `cancelled`), and `is_stock_restored` guard.
6. **`order_items`**: Point-in-time snapshot of product details, images, unit labels, unit prices in paise, quantities, and line totals.
7. **`store_settings`**: Global store control record: store name, logo, support hotline & email, delivery fee, minimum order value, free delivery threshold, `is_store_open` master switch, and `serviceable_pincodes` array.
8. **`promotions`**: Hero banners with promotional title, subtitle, image URL, category link, sort order, and active toggle.
9. **`admin_activity_logs`**: Audit trail of admin stock adjustments and order status changes.

### Atomic Database Functions & RPCs

#### 1. `place_order(p_address_id UUID, p_items JSONB)`
Executed atomically with `SECURITY DEFINER` inside a PostgreSQL transaction:
- Validates caller authentication (`auth.uid() = user_id`).
- Checks `store_settings.is_store_open`. If false, raises exception: *'Store is currently closed'*.
- Verifies address exists and belongs to the caller.
- Validates address PIN code against `store_settings.serviceable_pincodes`.
- Row-level locks all product rows (`FOR UPDATE`) to prevent simultaneous overselling race conditions.
- Validates active status and stock availability for every requested item.
- Re-calculates subtotal and line totals using current database prices (never trusting client-submitted prices).
- Enforces `store_settings.minimum_order_paise`.
- Calculates delivery fee (waived if subtotal >= `free_delivery_threshold_paise`).
- Inserts order record with unique `MYM-YYYYMMDD-XXXX` order number.
- Inserts `order_items` snapshots.
- Atomically decrements product stock: `stock_quantity = stock_quantity - item.quantity`.
- Returns created order summary.

#### 2. `admin_update_order_status(p_order_id UUID, p_new_status TEXT, p_cancel_reason TEXT)`
Executed with `SECURITY DEFINER`:
- Validates that caller is an owner/admin via `is_admin(auth.uid())`.
- Locks order row (`FOR UPDATE`).
- Validates workflow transition guards:
  - `placed` ➔ `confirmed` or `cancelled`
  - `confirmed` ➔ `packed` or `cancelled`
  - `packed` ➔ `out_for_delivery` or `cancelled`
  - `out_for_delivery` ➔ `delivered` or `cancelled`
  - Prevents transitions once `delivered` or `cancelled`.
- **Cancellation & Inventory Restoration**:
  - If status becomes `cancelled`, checks `is_stock_restored`.
  - If false, loops through all `order_items` and adds back item quantities to `products.stock_quantity`.
  - Sets `is_stock_restored = true`, guaranteeing stock is restored **exactly once**.
- When marked `delivered`, automatically updates `payment_status = 'paid'` (COD settlement).
- Records audit event into `admin_activity_logs`.

---

## 4. Cloudflare R2 & Image Upload Pipeline

```
[Admin Web Dashboard]
       │
       │ 1. Request presigned upload URL with Admin Supabase JWT
       ▼
[Cloudflare Worker]
       │ 2. Validates JWT & checks profiles.role === 'admin'
       │ 3. Generates S3 presigned PUT URL (15-min expiration)
       ▼
[Admin Web Dashboard]
       │ 4. Direct HTTP PUT upload of image binary (JPG/PNG/WebP)
       ▼
[Cloudflare R2 Bucket] (Zero egress fees)
       │
       ▼ 5. Serves optimized WebP to Customer App & Admin Dashboard
```

---

## 5. Environment Variables Setup

Create `.env` file in the project root or configure in your deployment dashboard:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Supabase Service Role Key (ONLY for Cloudflare Worker & CLI)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Cloudflare R2 & Worker Configuration
VITE_IMAGE_WORKER_URL=https://mymart-image-worker.your-subdomain.workers.dev
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
R2_BUCKET_NAME=mymart-product-images
R2_ACCESS_KEY_ID=your-r2-s3-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-s3-secret-access-key
R2_PUBLIC_DOMAIN=https://images.mymartdelivery.in
```

---

## 6. Supabase Setup Guide (Free Tier)

1. **Create Free Project**:
   - Go to [database.new](https://database.new) and create a new project named `mymart`.
   - Choose region close to your target users (e.g. `ap-south-1` Mumbai).

2. **Run Migrations**:
   - Open **SQL Editor** in your Supabase Dashboard.
   - Copy and paste `backend/supabase/migrations/001_initial_schema.sql` and click **Run**.
   - Copy and paste `backend/supabase/seed.sql` and click **Run**.

3. **Bootstrap Owner/Admin User**:
   - Register your owner email in Supabase Auth (or via the mobile app/dashboard).
   - In Supabase SQL Editor, run:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'owner@mymartdelivery.in');
   ```

4. **Verify Realtime**:
   - In Supabase Dashboard -> **Database** -> **Replication**, verify `orders`, `products`, `categories`, and `store_settings` have Realtime enabled.

---

## 7. How to Run the Applications (1-Click Zero-Configuration)

Everything is pre-built, seeded, and ready to run with **zero external account setup** required!

```bash
# Start both Local Server & Web Apps simultaneously with 1 command:
npm start
```

### Direct URLs Ready Right Now:
- **Admin Dashboard**: [http://localhost:5173](http://localhost:5173) (Click *"Store Owner Demo"* for 1-click login)
- **Customer Mobile App View**: [http://localhost:5173/customer-preview](http://localhost:5173/customer-preview) (Interactive Zepto/Instamart grocery storefront with mobile frame & live tracking)
- **Local Unified Server & Realtime SSE**: [http://localhost:5001/api/health](http://localhost:5001/api/health)

---

## 8. Real-Time Customer & Admin Sync Testing

1. Open **Admin Dashboard** in one window: [http://localhost:5173/orders](http://localhost:5173/orders).
2. Open **Customer Storefront** in another window or tab: [http://localhost:5173/customer-preview](http://localhost:5173/customer-preview).
3. In the Customer Storefront, add items to your basket (e.g. *Amul Milk* + *Shimla Apples*).
4. Go to **Basket**, verify the free delivery progress bar, and click **Pay on Delivery (COD)**.
5. Watch the **Admin Dashboard** update instantly via Server-Sent Events!
6. In the Admin Dashboard, click **Confirm Order** -> **Mark Packed** -> **Out for Delivery**.
7. In the Customer Storefront, watch the **Live Delivery Tracker** advance through each stage in real time!

---

## 9. Deploying to Production Supabase (When Ready)

When you are ready to connect a live Supabase Cloud project:
```bash
node backend/supabase/auto-deploy.mjs
```
This prompts for your Supabase URL & Anon Key, creates your `.env`, and gives you the exact SQL commands to paste into the Supabase SQL editor.

---

## 10. Android APK Build Instructions (Free via EAS CLI)

To generate a standalone `.apk` installable on any Android phone without Expo Go:

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Log into free Expo account**:
   ```bash
   eas login
   ```

3. **Configure Build Profile**:
   Create `apps/customer-app/eas.json`:
   ```json
   {
     "cli": {
       "version": ">= 9.0.0"
     },
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal"
       },
       "preview": {
         "distribution": "internal",
         "android": {
           "buildType": "apk"
         }
       },
       "production": {}
     }
   }
   ```

4. **Run Build**:
   ```bash
   cd apps/customer-app
   eas build -p android --profile preview
   ```
   EAS will compile your release APK in the cloud for free and provide a direct download link / QR code to install on your phone.

---

## 9. Cloudflare Pages Deployment (Admin Dashboard)

1. Connect your GitHub repository to [Cloudflare Pages](https://pages.cloudflare.com/).
2. Build Settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build:shared && npm --prefix apps/admin-dashboard run build`
   - **Build Output Directory**: `apps/admin-dashboard/dist`
   - **Root Directory**: `/`
3. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_IMAGE_WORKER_URL`
4. Click **Deploy**. Cloudflare Pages gives you a free `.pages.dev` domain with free SSL and edge caching!

---

## 10. Test Verification Results

Run the full automated test suite:
```bash
node test/run-tests.mjs
```

**Results:**
- **Money & Integer Paise Calculations**: 6 / 6 Passed
- **Discounts & Savings Calculations**: 3 / 3 Passed
- **Indian Phone & Postal PIN Validations**: 15 / 15 Passed
- **Order Status Workflow & Transitions**: 6 / 6 Passed
- **Cart Business Rules & Delivery Thresholds**: 3 / 3 Passed
- **Database Migration & RLS Security Audit**: 26 / 26 Passed
- **Total: 59 Passed, 0 Failed (100% Pass Rate)**

---

## 11. Remaining Limitations & Future Roadmap

1. **Online Payments**: The platform is built with Cash on Delivery (COD) as the primary payment method. For future expansion, free UPI deep linking (Intent URLs like `upi://pay`) or Razorpay / Cashfree webhooks can be attached to the existing `payment_status` column.
2. **Push Notifications**: In-app realtime notifications are currently delivered via Supabase Realtime WebSocket events. The architecture is prepared for Expo Notifications (`expo-notifications`) by storing the push token in `profiles.expo_push_token`.
3. **Multi-Store Dark Stores**: Current implementation supports a central dark store with dynamic PIN code serviceability; the database schema can be extended to multi-store inventory partitions using the existing `store_settings` structure.
