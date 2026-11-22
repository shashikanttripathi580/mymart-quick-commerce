import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5001;
const DB_PATH = path.resolve(__dirname, 'data/store.json');
const UPLOADS_DIR = path.resolve(__dirname, 'public/uploads');

// Ensure uploads dir exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Load in-memory DB
function loadDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading DB, creating fresh state:', err.message);
    return {
      store_settings: {},
      categories: [],
      products: [],
      orders: [],
      promotions: [],
      users: []
    };
  }
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store.json:', err.message);
  }
}

let db = loadDB();

// Active SSE client connections for real-time live events
const sseClients = new Set();

function broadcastEvent(type, payload) {
  const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Helper: send JSON response with standard CORS
function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(body));
}

// Helper: parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

// Valid Order Status State Machine Transitions
const VALID_TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost:5001'}`);
  const pathname = reqUrl.pathname;
  const method = req.method;

  // 1. Serve Uploaded Static Files: /uploads/<filename>
  if (pathname.startsWith('/uploads/') && method === 'GET') {
    const filename = path.basename(pathname);
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
      };
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      });
      return fs.createReadStream(filePath).pipe(res);
    }
    return sendJson(res, 404, { error: 'File not found' });
  }

  // 2. Real-Time SSE Stream: /api/events
  if (pathname === '/api/events' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('event: connected\ndata: {"status":"connected"}\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  try {
    // 3. Health Check
    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, {
        status: 'ok',
        store: db.store_settings.store_name,
        productsCount: db.products.length,
        categoriesCount: db.categories.length,
        ordersCount: db.orders.length,
        timestamp: new Date().toISOString()
      });
    }

    // 4. Store Settings
    if (pathname === '/api/store-settings') {
      if (method === 'GET') {
        return sendJson(res, 200, db.store_settings);
      }
      if (method === 'PUT') {
        const body = await parseBody(req);
        db.store_settings = {
          ...db.store_settings,
          ...body,
          updated_at: new Date().toISOString()
        };
        saveDB(db);
        broadcastEvent('SETTINGS_UPDATED', db.store_settings);
        return sendJson(res, 200, db.store_settings);
      }
    }

    // 5. Dashboard Summary Stats
    if (pathname === '/api/dashboard/stats' && method === 'GET') {
      const today = new Date().toDateString();
      const totalOrders = db.orders.length;
      const todayOrders = db.orders.filter(o => new Date(o.created_at).toDateString() === today).length;
      const pendingOrders = db.orders.filter(o => ['placed', 'confirmed', 'packed'].includes(o.order_status)).length;
      const completedOrders = db.orders.filter(o => o.order_status === 'delivered').length;

      const validOrders = db.orders.filter(o => o.order_status !== 'cancelled');
      const totalSalesPaise = validOrders.reduce((sum, o) => sum + (o.total_paise || 0), 0);
      const todaySalesPaise = validOrders
        .filter(o => new Date(o.created_at).toDateString() === today)
        .reduce((sum, o) => sum + (o.total_paise || 0), 0);

      const totalProducts = db.products.length;
      const lowStockProducts = db.products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold).length;
      const outOfStockProducts = db.products.filter(p => p.stock_quantity === 0).length;

      return sendJson(res, 200, {
        totalOrders,
        todayOrders,
        pendingOrders,
        completedOrders,
        totalSalesPaise,
        todaySalesPaise,
        totalProducts,
        lowStockProducts,
        outOfStockProducts
      });
    }

    // 6. Categories Endpoints
    if (pathname === '/api/categories') {
      if (method === 'GET') {
        const includeInactive = reqUrl.searchParams.get('include_inactive') === 'true';
        let categories = db.categories;
        if (!includeInactive) {
          categories = categories.filter(c => c.is_active);
        }
        categories = categories.map(c => ({
          ...c,
          product_count: db.products.filter(p => p.category_id === c.id && p.is_active).length
        }));
        categories.sort((a, b) => a.sort_order - b.sort_order);
        return sendJson(res, 200, categories);
      }
      if (method === 'POST') {
        const body = await parseBody(req);
        const newCat = {
          id: `c${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          name: body.name,
          slug: body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          image_url: body.image_url,
          description: body.description || '',
          sort_order: Number(body.sort_order) || (db.categories.length + 1),
          is_active: body.is_active !== false,
          created_at: new Date().toISOString()
        };
        db.categories.push(newCat);
        saveDB(db);
        broadcastEvent('CATEGORY_CREATED', newCat);
        return sendJson(res, 201, newCat);
      }
    }

    // Category By ID: /api/categories/:id
    const catMatch = pathname.match(/^\/api\/categories\/([^\/]+)$/);
    if (catMatch) {
      const catId = catMatch[1];
      const index = db.categories.findIndex(c => c.id === catId);

      if (method === 'GET') {
        if (index === -1) return sendJson(res, 404, { error: 'Category not found' });
        return sendJson(res, 200, db.categories[index]);
      }
      if (method === 'PUT') {
        if (index === -1) return sendJson(res, 404, { error: 'Category not found' });
        const body = await parseBody(req);
        db.categories[index] = { ...db.categories[index], ...body, updated_at: new Date().toISOString() };
        saveDB(db);
        broadcastEvent('CATEGORY_UPDATED', db.categories[index]);
        return sendJson(res, 200, db.categories[index]);
      }
      if (method === 'DELETE') {
        if (index === -1) return sendJson(res, 404, { error: 'Category not found' });
        // Check if category has active products
        const activeProds = db.products.filter(p => p.category_id === catId && p.is_active);
        if (activeProds.length > 0) {
          return sendJson(res, 400, {
            error: `Cannot delete category: it has ${activeProds.length} active products. Reassign or delete products first.`
          });
        }
        const removed = db.categories.splice(index, 1)[0];
        saveDB(db);
        broadcastEvent('CATEGORY_DELETED', { id: catId });
        return sendJson(res, 200, { success: true, removed });
      }
    }

    // 7. Products Endpoints: /api/products
    if (pathname === '/api/products') {
      if (method === 'GET') {
        let prods = [...db.products];
        const categoryId = reqUrl.searchParams.get('category_id');
        const isFeatured = reqUrl.searchParams.get('is_featured');
        const search = reqUrl.searchParams.get('search');
        const includeInactive = reqUrl.searchParams.get('include_inactive') === 'true';

        if (!includeInactive) {
          prods = prods.filter(p => p.is_active);
        }
        if (categoryId) {
          prods = prods.filter(p => p.category_id === categoryId);
        }
        if (isFeatured === 'true') {
          prods = prods.filter(p => p.is_featured);
        }
        if (search) {
          const q = search.toLowerCase();
          prods = prods.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
          );
        }

        // Attach category object
        const categoriesMap = new Map(db.categories.map(c => [c.id, c]));
        prods = prods.map(p => ({
          ...p,
          category: categoriesMap.get(p.category_id)
        }));

        return sendJson(res, 200, prods);
      }
      if (method === 'POST') {
        const body = await parseBody(req);
        if (!body.name || !body.selling_price_paise || !body.category_id) {
          return sendJson(res, 400, { error: 'Missing required fields: name, selling_price_paise, category_id' });
        }
        const newProduct = {
          id: `p${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          name: body.name,
          slug: body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          sku: body.sku || `SKU-${Date.now()}`,
          brand: body.brand || 'Generic',
          description: body.description || '',
          category_id: body.category_id,
          unit_label: body.unit_label || '1 unit',
          selling_price_paise: Number(body.selling_price_paise),
          mrp_paise: Number(body.mrp_paise || body.selling_price_paise),
          stock_quantity: Number(body.stock_quantity ?? 0),
          low_stock_threshold: Number(body.low_stock_threshold ?? 10),
          image_urls: Array.isArray(body.image_urls) ? body.image_urls : [body.image_urls || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'],
          is_active: body.is_active !== false,
          is_featured: body.is_featured === true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        db.products.push(newProduct);
        saveDB(db);
        broadcastEvent('PRODUCT_CREATED', newProduct);
        return sendJson(res, 201, newProduct);
      }
    }

    // Product By ID: /api/products/:id
    const prodMatch = pathname.match(/^\/api\/products\/([^\/]+)$/);
    if (prodMatch) {
      const prodId = prodMatch[1];
      const index = db.products.findIndex(p => p.id === prodId);

      if (method === 'GET') {
        if (index === -1) return sendJson(res, 404, { error: 'Product not found' });
        const prod = { ...db.products[index] };
        prod.category = db.categories.find(c => c.id === prod.category_id);
        return sendJson(res, 200, prod);
      }
      if (method === 'PUT') {
        if (index === -1) return sendJson(res, 404, { error: 'Product not found' });
        const body = await parseBody(req);
        db.products[index] = {
          ...db.products[index],
          ...body,
          selling_price_paise: body.selling_price_paise !== undefined ? Number(body.selling_price_paise) : db.products[index].selling_price_paise,
          mrp_paise: body.mrp_paise !== undefined ? Number(body.mrp_paise) : db.products[index].mrp_paise,
          stock_quantity: body.stock_quantity !== undefined ? Number(body.stock_quantity) : db.products[index].stock_quantity,
          updated_at: new Date().toISOString()
        };
        saveDB(db);
        broadcastEvent('PRODUCT_UPDATED', db.products[index]);
        return sendJson(res, 200, db.products[index]);
      }
      if (method === 'DELETE') {
        if (index === -1) return sendJson(res, 404, { error: 'Product not found' });
        const removed = db.products.splice(index, 1)[0];
        saveDB(db);
        broadcastEvent('PRODUCT_DELETED', { id: prodId });
        return sendJson(res, 200, { success: true, removed });
      }
    }

    // Adjust Product Stock: POST /api/products/:id/adjust-stock
    const adjustStockMatch = pathname.match(/^\/api\/products\/([^\/]+)\/adjust-stock$/);
    if (adjustStockMatch && method === 'POST') {
      const prodId = adjustStockMatch[1];
      const prod = db.products.find(p => p.id === prodId);
      if (!prod) return sendJson(res, 404, { error: 'Product not found' });

      const body = await parseBody(req);
      const delta = Number(body.adjustment_delta ?? 0);
      const newStock = Number(body.new_stock_quantity !== undefined ? body.new_stock_quantity : (prod.stock_quantity + delta));

      if (newStock < 0) {
        return sendJson(res, 400, { error: 'Stock quantity cannot be negative' });
      }
      prod.stock_quantity = newStock;
      prod.updated_at = new Date().toISOString();
      saveDB(db);

      broadcastEvent('STOCK_UPDATED', { productId: prod.id, stock_quantity: newStock });
      return sendJson(res, 200, { success: true, product_id: prod.id, stock_quantity: newStock });
    }

    // 8. Orders Endpoints: /api/orders
    if (pathname === '/api/orders') {
      if (method === 'GET') {
        const userId = reqUrl.searchParams.get('user_id');
        const status = reqUrl.searchParams.get('status');
        let orders = [...db.orders];
        if (userId) {
          orders = orders.filter(o => o.user_id === userId);
        }
        if (status) {
          orders = orders.filter(o => o.order_status === status);
        }
        orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return sendJson(res, 200, orders);
      }

      // ATOMIC CHECKOUT PLACE ORDER: POST /api/orders
      if (method === 'POST') {
        const body = await parseBody(req);
        const { items, address, user_id = 'cust-demo' } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
          return sendJson(res, 400, { error: 'Order must contain at least 1 item' });
        }
        if (!address) {
          return sendJson(res, 400, { error: 'Delivery address is required' });
        }

        // Check if store is open
        if (!db.store_settings.is_store_open) {
          return sendJson(res, 400, { error: 'Store is currently closed. Please check back later.' });
        }

        // Atomic Stock Check & Price Verification
        let calculatedSubtotalPaise = 0;
        const verifiedItems = [];

        for (const item of items) {
          const product = db.products.find(p => p.id === item.product_id);
          if (!product) {
            return sendJson(res, 400, { error: `Product ${item.product_id} no longer exists.` });
          }
          if (!product.is_active) {
            return sendJson(res, 400, { error: `Product "${product.name}" is currently inactive.` });
          }
          if (product.stock_quantity < item.quantity) {
            return sendJson(res, 400, {
              error: `Insufficient stock for "${product.name}". Available: ${product.stock_quantity}, requested: ${item.quantity}.`
            });
          }

          const lineTotalPaise = product.selling_price_paise * item.quantity;
          calculatedSubtotalPaise += lineTotalPaise;

          verifiedItems.push({
            id: `item-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
            product_id: product.id,
            product_name: product.name,
            product_image_url: product.image_urls[0] || '',
            unit_label: product.unit_label,
            quantity: item.quantity,
            price_paise: product.selling_price_paise,
            subtotal_paise: lineTotalPaise
          });
        }

        // Enforce Minimum Order Value
        if (calculatedSubtotalPaise < db.store_settings.minimum_order_paise) {
          return sendJson(res, 400, {
            error: `Minimum order amount is ₹${(db.store_settings.minimum_order_paise / 100).toFixed(2)}. Current subtotal is ₹${(calculatedSubtotalPaise / 100).toFixed(2)}.`
          });
        }

        // Calculate delivery fee
        const deliveryFeePaise = calculatedSubtotalPaise >= db.store_settings.free_delivery_threshold_paise
          ? 0
          : db.store_settings.delivery_fee_paise;

        const totalPaise = calculatedSubtotalPaise + deliveryFeePaise;

        // Atomically Decrement Stock
        for (const item of items) {
          const product = db.products.find(p => p.id === item.product_id);
          product.stock_quantity -= item.quantity;
          product.updated_at = new Date().toISOString();
        }

        // Generate Order
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `MYM-${dateStr}-${randomNum}`;
        const newOrderId = `ord-${Date.now()}`;

        const newOrder = {
          id: newOrderId,
          order_number: orderNumber,
          user_id,
          customer_name: address.recipient_name || 'Customer',
          customer_phone: address.phone || '+919999999999',
          address_snapshot: address,
          subtotal_paise: calculatedSubtotalPaise,
          delivery_fee_paise: deliveryFeePaise,
          discount_paise: 0,
          total_paise: totalPaise,
          payment_method: 'COD',
          payment_status: 'pending',
          order_status: 'placed',
          is_stock_restored: false,
          cancel_reason: null,
          items: verifiedItems,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        db.orders.unshift(newOrder);
        saveDB(db);

        // Real-Time Broadcast to Admin & Customer
        broadcastEvent('ORDER_CREATED', newOrder);
        broadcastEvent('STOCK_BATCH_UPDATED', verifiedItems.map(i => ({ product_id: i.product_id })));

        return sendJson(res, 201, {
          order_id: newOrder.id,
          order_number: newOrder.order_number,
          order: newOrder
        });
      }
    }

    // Order By ID: /api/orders/:id
    const orderMatch = pathname.match(/^\/api\/orders\/([^\/]+)$/);
    if (orderMatch && method === 'GET') {
      const orderId = orderMatch[1];
      const order = db.orders.find(o => o.id === orderId || o.order_number === orderId);
      if (!order) return sendJson(res, 404, { error: 'Order not found' });
      return sendJson(res, 200, order);
    }

    // Update Order Status: PATCH /api/orders/:id/status
    const orderStatusMatch = pathname.match(/^\/api\/orders\/([^\/]+)\/status$/);
    if (orderStatusMatch && method === 'PATCH') {
      const orderId = orderStatusMatch[1];
      const order = db.orders.find(o => o.id === orderId);
      if (!order) return sendJson(res, 404, { error: 'Order not found' });

      const body = await parseBody(req);
      const { new_status, cancel_reason } = body;

      const allowedTransitions = VALID_TRANSITIONS[order.order_status] || [];
      if (!allowedTransitions.includes(new_status)) {
        return sendJson(res, 400, {
          error: `Invalid status transition from "${order.order_status}" to "${new_status}". Allowed: ${allowedTransitions.join(', ')}`
        });
      }

      // Exact-Once Stock Restoration on Cancellation
      if (new_status === 'cancelled' && !order.is_stock_restored) {
        if (Array.isArray(order.items)) {
          for (const item of order.items) {
            const prod = db.products.find(p => p.id === item.product_id);
            if (prod) {
              prod.stock_quantity += item.quantity;
              prod.updated_at = new Date().toISOString();
            }
          }
        }
        order.is_stock_restored = true;
        order.cancel_reason = cancel_reason || 'Cancelled by store operator';
      }

      // Update payment status if delivered
      if (new_status === 'delivered') {
        order.payment_status = 'paid';
      }

      order.order_status = new_status;
      order.updated_at = new Date().toISOString();
      saveDB(db);

      // Real-Time Broadcast
      broadcastEvent('ORDER_UPDATED', order);
      return sendJson(res, 200, order);
    }

    // 9. Promotions Endpoints: /api/promotions
    if (pathname === '/api/promotions' && method === 'GET') {
      return sendJson(res, 200, db.promotions || []);
    }

    // 10. Local Image Upload: POST /api/upload
    if (pathname === '/api/upload' && method === 'POST') {
      const body = await parseBody(req);
      if (!body.base64 && !body.data) {
        return sendJson(res, 400, { error: 'Missing base64 data' });
      }

      const rawBase64 = body.base64 || body.data;
      const matches = rawBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let ext = '.png';
      let buffer;

      if (matches && matches.length === 3) {
        const mime = matches[1];
        if (mime === 'image/jpeg') ext = '.jpg';
        else if (mime === 'image/webp') ext = '.webp';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(rawBase64, 'base64');
      }

      const filename = `img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, buffer);

      const publicUrl = `http://localhost:${PORT}/uploads/${filename}`;
      return sendJson(res, 201, {
        success: true,
        filename,
        public_url: publicUrl,
        size_bytes: buffer.length
      });
    }

    // 11. Mock Auth: POST /api/auth/login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseBody(req);
      const email = body.email?.toLowerCase();
      const user = db.users.find(u => u.email.toLowerCase() === email) || {
        id: `user-${Date.now()}`,
        email: body.email,
        full_name: 'Customer',
        role: email?.includes('admin') ? 'admin' : 'customer'
      };

      return sendJson(res, 200, {
        token: `mock-jwt-token-${user.id}`,
        user
      });
    }

    // 404 for unknown endpoints
    return sendJson(res, 404, { error: `Route not found: ${method} ${pathname}` });

  } catch (err) {
    console.error('API Error:', err);
    return sendJson(res, 500, { error: err.message || 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 MyMart Local Unified Backend Server is running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`⚡ Real-Time SSE: http://localhost:${PORT}/api/events`);
  console.log(`📦 Seeded: ${db.categories.length} categories, ${db.products.length} products, ${db.orders.length} orders`);
  console.log(`=======================================================`);
});
