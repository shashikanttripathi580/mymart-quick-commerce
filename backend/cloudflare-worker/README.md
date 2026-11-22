# MyMart Cloudflare R2 Image Upload Worker

This Cloudflare Worker provides a secure, free-first microservice for managing product image uploads directly to Cloudflare R2 using AWS S3-compatible presigned upload URLs.

---

## Architecture & Security Highlights

1. **Zero Secret Exposure**:
   - Cloudflare R2 secret credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) and Supabase Service Role Key are stored securely inside Cloudflare Worker secrets.
   - Neither the Admin Dashboard nor Customer Mobile App ever receives private storage keys.

2. **Strict Admin Verification**:
   - Every upload request (`POST /api/upload-url`) requires a Supabase JWT token in `Authorization: Bearer <token>`.
   - The worker validates the JWT with Supabase Auth (`/auth/v1/user`) and verifies that `profiles.role === 'admin'`. Non-admins are rejected with HTTP 403 Forbidden.

3. **Short-Lived S3 Presigned URLs**:
   - The worker creates an `@aws-sdk/s3-request-presigner` PUT URL valid for only 15 minutes (900 seconds).
   - The frontend uploads image bytes directly to Cloudflare R2 via HTTP PUT, preventing heavy file buffering on the worker or database.

4. **100% Free Tier Compliant**:
   - Cloudflare R2 offers 10 GB free monthly storage and 10 million free Class B reads, with **zero egress bandwidth charges**.
   - Cloudflare Workers offer 100,000 requests/day completely free.

---

## Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Health check |
| `POST` | `/api/upload-url` | Admin Only | Generates 15-min presigned PUT URL for R2 |
| `DELETE` | `/api/delete-image` | Admin Only | Deletes an image object from R2 |

### `POST /api/upload-url`
**Headers:**
```http
Authorization: Bearer <supabase_admin_access_token>
Content-Type: application/json
```
**Body:**
```json
{
  "fileName": "fresh-apples.webp",
  "contentType": "image/webp"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "uploadUrl": "https://<account_id>.r2.cloudflarestorage.com/mymart-product-images/products/...?...X-Amz-Signature=...",
  "publicUrl": "https://images.mymartdelivery.in/products/17111222-xyz-fresh_apples.webp",
  "key": "products/17111222-xyz-fresh_apples.webp",
  "expiresInSeconds": 900
}
```

---

## Deployment Instructions

### 1. Create Cloudflare R2 Bucket
1. Log in to your free [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, click **R2 Storage** -> **Create Bucket**.
3. Name your bucket: `mymart-product-images`.
4. Click **Settings** on the bucket -> Under **Public Access**, connect a custom domain (e.g. `images.mymartdelivery.in`) or enable **R2.dev subdomain**.

### 2. Generate R2 S3 Credentials
1. Go to **R2 Storage** -> **Manage R2 API Tokens**.
2. Click **Create API Token**.
3. Permissions: **Admin Read & Write**.
4. TTL: Forever (or as needed).
5. Copy the:
   - Access Key ID
   - Secret Access Key
   - Cloudflare Account ID

### 3. Configure Secrets in Wrangler
Inside `backend/cloudflare-worker/`:
```bash
# Login to Cloudflare CLI
npx wrangler login

# Set Supabase environment variables
npx wrangler secret put SUPABASE_URL
# Enter your Supabase URL (e.g. https://xyzcompany.supabase.co)

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Enter your Supabase Service Role Key (from Supabase Dashboard -> Project Settings -> API)

# Set Cloudflare R2 credentials
npx wrangler secret put R2_ACCOUNT_ID
# Enter your Cloudflare Account ID

npx wrangler secret put R2_ACCESS_KEY_ID
# Enter your R2 Access Key ID

npx wrangler secret put R2_SECRET_ACCESS_KEY
# Enter your R2 Secret Access Key

npx wrangler secret put R2_BUCKET_NAME
# Enter: mymart-product-images

npx wrangler secret put R2_PUBLIC_DOMAIN
# Enter: https://images.mymartdelivery.in (or your r2.dev public URL)
```

### 4. Deploy Worker
```bash
npm run deploy
```
Wrangler will output your live worker URL:
```
https://mymart-image-worker.<your-account>.workers.dev
```

### 5. Add Worker URL to Admin Dashboard
In `apps/admin-dashboard/.env`:
```env
VITE_IMAGE_WORKER_URL=https://mymart-image-worker.<your-account>.workers.dev
```
All product images uploaded by the owner in the admin dashboard will now upload directly and securely to Cloudflare R2!
