import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface Env {
  ENVIRONMENT?: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_DOMAIN: string;
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message, success: false }, status);
}

/**
 * Validates Supabase JWT and ensures the authenticated user is an 'admin'
 */
async function verifyAdminAuth(request: Request, env: Env): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) return null;

  try {
    // 1. Verify user identity via Supabase Auth
    const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });

    if (!userRes.ok) return null;
    const userData = (await userRes.json()) as { id?: string };
    if (!userData?.id) return null;

    // 2. Query profiles table to verify admin role
    const profileRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${userData.id}&select=role`,
      {
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (!profileRes.ok) return null;
    const profiles = (await profileRes.json()) as Array<{ role?: string }>;
    if (!profiles || profiles.length === 0 || profiles[0].role !== 'admin') {
      return null;
    }

    return { userId: userData.id };
  } catch (err) {
    console.error('Auth verification exception:', err);
    return null;
  }
}

/**
 * Creates S3 Client configured for Cloudflare R2
 */
function getR2Client(env: Env): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health' || url.pathname === '/') {
      return jsonResponse({
        status: 'healthy',
        service: 'mymart-image-worker',
        timestamp: new Date().toISOString(),
      });
    }

    // 1. POST /api/upload-url: Generate Presigned R2 PUT URL
    if (request.method === 'POST' && url.pathname === '/api/upload-url') {
      const admin = await verifyAdminAuth(request, env);
      if (!admin) {
        return errorResponse('Forbidden: Only authorized MyMart admins can upload images', 403);
      }

      let body: { fileName?: string; contentType?: string };
      try {
        body = await request.json();
      } catch {
        return errorResponse('Invalid JSON body');
      }

      const { fileName, contentType } = body;
      if (!fileName || !contentType) {
        return errorResponse('Missing required fields: fileName and contentType');
      }

      if (!ALLOWED_MIME_TYPES.has(contentType.toLowerCase())) {
        return errorResponse(
          `Unsupported file type: ${contentType}. Allowed types: JPG, PNG, WebP, GIF`
        );
      }

      // Generate a unique, sanitized key
      const ext = fileName.split('.').pop()?.toLowerCase() || 'webp';
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const cleanName = fileName
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 30);
      const key = `products/${timestamp}-${randomStr}-${cleanName}.${ext}`;

      try {
        const s3 = getR2Client(env);
        const command = new PutObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: key,
          ContentType: contentType,
        });

        // 15 minutes presigned URL
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

        // Public URL for serving
        const baseDomain = env.R2_PUBLIC_DOMAIN.replace(/\/+$/, '');
        const publicUrl = `${baseDomain}/${key}`;

        return jsonResponse({
          success: true,
          uploadUrl,
          publicUrl,
          key,
          expiresInSeconds: 900,
        });
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Failed to generate presigned URL:', error);
        return errorResponse(`Storage error: ${error.message}`, 500);
      }
    }

    // 2. DELETE /api/delete-image: Remove object from R2
    if (request.method === 'DELETE' && url.pathname === '/api/delete-image') {
      const admin = await verifyAdminAuth(request, env);
      if (!admin) {
        return errorResponse('Forbidden: Admin access required to delete images', 403);
      }

      let body: { key?: string };
      try {
        body = await request.json();
      } catch {
        return errorResponse('Invalid JSON body');
      }

      const { key } = body;
      if (!key) {
        return errorResponse('Missing required field: key');
      }

      try {
        const s3 = getR2Client(env);
        const command = new DeleteObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: key,
        });

        await s3.send(command);
        return jsonResponse({ success: true, message: 'Image deleted successfully' });
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Failed to delete image:', error);
        return errorResponse(`Deletion error: ${error.message}`, 500);
      }
    }

    return errorResponse('Endpoint not found', 404);
  },
};
