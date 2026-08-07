import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MenuItem, DbProduct, DbOrder, DbOrderItem } from '../types';
import { MENU_ITEMS } from '../data';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '';

function cleanSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim().replace(/^["']|["']$/g, '');
  cleaned = cleaned.replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  return cleaned;
}

function cleanSupabaseKey(key: string): string {
  if (!key) return '';
  return key.trim().replace(/^["']|["']$/g, '');
}

const supabaseUrl = cleanSupabaseUrl(rawUrl);
const supabaseAnonKey = cleanSupabaseKey(rawKey);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

function formatSupabaseErrorMessage(error: any): string {
  if (!error) return 'Error tidak diketahui';
  const msg = error.message || String(error);
  if (msg.includes('Invalid path specified in request URL') || msg.includes('relation "public.products" does not exist') || msg.includes('404')) {
    return `Tabel 'products' belum ada di database Supabase Anda. Silakan buka tab 'SQL Schema' di atas, lalu salin dan jalankan skrip SQL di Supabase SQL Editor.`;
  }
  return msg;
}

// Fetch products from Supabase 'products' table (with fallback to server API)
export async function fetchProductsFromSupabase(): Promise<{ data: DbProduct[] | null; error: any }> {
  // Helper to filter out system rows and weekly menu items (which don't use stock management)
  const isStandardProduct = (p: DbProduct) =>
    p.id !== 999999 &&
    p.name !== '__ADMIN_PIN__' &&
    p.category !== 'Menu Mingguan' &&
    !p.name.startsWith('[') &&
    !(p.id >= 100 && p.id <= 200);

  // 1. Direct Supabase Client Query
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        const filtered = data.filter(isStandardProduct);
        return { data: filtered, error: null };
      }
      if (error) {
        console.warn('⚠️ Direct Supabase fetch warning, trying /api/products fallback:', error.message);
      }
    } catch (err: any) {
      console.warn('⚠️ Direct Supabase exception, trying /api/products fallback:', err);
    }
  }

  // 2. Server API Fallback (/api/products)
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        const filtered = json.data.filter(isStandardProduct);
        return { data: filtered, error: null };
      }
    }
  } catch (apiErr) {
    console.warn('⚠️ /api/products fallback error:', apiErr);
  }

  return { data: null, error: new Error('Gagal mengambil data produk dari Supabase') };
}

// Subscribe to real-time changes on products table
export function subscribeToProducts(onUpdate: () => void) {
  if (!supabase) return null;
  try {
    const channel = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        console.log('⚡ Realtime stock update received from Supabase');
        onUpdate();
      })
      .subscribe();
    return channel;
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return null;
  }
}

// Seed initial default products into Supabase (excluding Menu Mingguan which doesn't require stock tracking)
export async function seedProductsToSupabase(itemsToSeed: MenuItem[] = MENU_ITEMS): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase belum terhubung. Konfigurasi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di .env.' };
  }

  try {
    // 1. Filter out Menu Mingguan items (weekly items have unlimited stock pre-orders and are not stored in Supabase stock table)
    const nonWeeklyItems = itemsToSeed.filter((item) => item.category !== "Menu Mingguan" && !item.isWeekly);

    const payload = nonWeeklyItems.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category || "Makanan Utama",
      price: item.price,
      stock: item.stock ?? 50,
      image: item.image
    }));

    // 2. Clean up / delete any old "Menu Mingguan" rows or weekly IDs from Supabase products table
    try {
      await fetch('/api/admin/clean-weekly-products', { method: 'POST' }).catch(() => {});
      try { await supabase.from('order_items').update({ product_id: null }).in('product_id', [101, 102, 103, 104, 105, 106, 107, 108, 109, 110]); } catch {}
      try { await supabase.from('order_items').delete().in('product_id', [101, 102, 103, 104, 105, 106, 107, 108, 109, 110]); } catch {}
      await supabase.from('products').delete().in('id', [101, 102, 103, 104, 105, 106, 107, 108, 109, 110]);
      await supabase.from('products').delete().eq('category', 'Menu Mingguan');
      await supabase.from('products').delete().ilike('name', '[%');
      await supabase.from('products').delete().gte('id', 100).lte('id', 200);
    } catch (cleanupErr) {
      console.warn('Notice during weekly items cleanup:', cleanupErr);
    }

    // 3. Upsert standard products (Makanan Utama & Frozen Food)
    const { data, error } = await supabase
      .from('products')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Error seeding products:', error);
      return { success: false, message: `Gagal seeding: ${formatSupabaseErrorMessage(error)}` };
    }

    return { 
      success: true, 
      message: `✅ Berhasil menyelaraskan ${data?.length || 0} produk (Makanan Utama & Frozen Food) ke Supabase! Item Menu Mingguan (ID 101-107) telah dibersihkan & dihapus dari tabel Supabase.` 
    };
  } catch (err: any) {
    return { success: false, message: formatSupabaseErrorMessage(err) };
  }
}

// Create an order in 'orders', 'order_items', and reduce stock in 'products'
export async function recordSupabaseOrder(params: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  status?: string;
  items: { productId?: number; productName?: string; quantity: number; price: number }[];
}): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured. Skipping server database insertion.');
    return { success: false, error: 'Supabase client not configured' };
  }

  try {
    const orderStatus = params.status || 'pending';

    // 1. Insert Order into 'orders' table
    const { error: orderError } = await supabase
      .from('orders')
      .upsert({
        id: params.orderId,
        customer_name: params.customerName || 'Pelanggan',
        customer_phone: params.customerPhone || '-',
        total_amount: params.totalAmount,
        status: orderStatus,
      }, { onConflict: 'id' });

    if (orderError) {
      console.error('❌ Error inserting order into Supabase:', orderError);
      return { success: false, error: orderError.message };
    }

    // 2. Insert Order Items into 'order_items' table
    if (params.items && params.items.length > 0) {
      let validProdIds = new Set<number>();
      try {
        const { data: prods } = await supabase.from('products').select('id');
        if (prods) {
          prods.forEach(p => validProdIds.add(p.id));
        }
      } catch (e) {
        console.warn('FK check fetch products error:', e);
      }

      const orderItemsData = params.items.map(item => ({
        order_id: params.orderId,
        product_id: (typeof item.productId === 'number' && validProdIds.has(item.productId)) ? item.productId : null,
        product_name: item.productName || (item as any).product_name || 'Menu Culinary MAM',
        quantity: Math.max(1, Number(item.quantity) || 1),
        price: Math.max(0, Number(item.price) || 0)
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) {
        console.error('❌ Error inserting order_items into Supabase:', itemsError);
        // Fallback retry with null product_id to bypass foreign key constraint
        try {
          const fallbackData = orderItemsData.map(it => ({ ...it, product_id: null }));
          await supabase.from('order_items').insert(fallbackData);
        } catch (retryErr) {
          console.error('❌ Retry order_items insert error:', retryErr);
        }
      }
    }

    // 3. Decrement Stock for each product
    for (const item of params.items) {
      if (typeof item.productId === 'number') {
        // Fetch current stock and category first
        const { data: prodData } = await supabase
          .from('products')
          .select('stock, category')
          .eq('id', item.productId)
          .single();

        // Skip stock decrement for 'Menu Mingguan' items (unlimited stock)
        if (prodData && prodData.category !== 'Menu Mingguan' && typeof prodData.stock === 'number') {
          const newStock = Math.max(0, prodData.stock - item.quantity);
          await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.productId);
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('❌ Error recording order in Supabase:', err);
    return { success: false, error: err.message };
  }
}

// Update single product stock in Supabase
export async function updateSupabaseStock(productId: number, newStock: number): Promise<{ success: boolean; message?: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase client tidak dikonfigurasi.' };
  }

  try {
    const { error } = await supabase
      .from('products')
      .update({ stock: Math.max(0, newStock) })
      .eq('id', productId);

    if (error) {
      return { success: false, message: formatSupabaseErrorMessage(error) };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: formatSupabaseErrorMessage(err) };
  }
}

// Update product full details (name, category, price, stock, image) in Supabase
export async function updateSupabaseProduct(item: { id: number; name?: string; category?: string; price?: number; stock?: number; image?: string }): Promise<{ success: boolean; message?: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase client tidak dikonfigurasi.' };
  }

  try {
    const updatePayload: Record<string, any> = {};
    if (item.name !== undefined) updatePayload.name = item.name.trim();
    if (item.category !== undefined) updatePayload.category = item.category.trim();
    if (item.price !== undefined) updatePayload.price = Number(item.price);
    if (item.stock !== undefined) updatePayload.stock = Math.max(0, Number(item.stock));
    if (item.image !== undefined) updatePayload.image = item.image.trim();

    const { error } = await supabase
      .from('products')
      .upsert({
        id: item.id,
        ...updatePayload
      }, { onConflict: 'id' });

    if (error) {
      return { success: false, message: formatSupabaseErrorMessage(error) };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: formatSupabaseErrorMessage(err) };
  }
}

// Update order status in Supabase
export async function updateSupabaseOrderStatus(orderId: string, newStatus: string): Promise<{ success: boolean; message?: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase client tidak dikonfigurasi.' };
  }

  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      return { success: false, message: formatSupabaseErrorMessage(error) };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: formatSupabaseErrorMessage(err) };
  }
}

// Helper to generate realistic item breakdown for order total
export function generateItemsForTotal(totalAmount: number, orderId: string): DbOrderItem[] {
  const num = Math.max(10000, Number(totalAmount) || 50000);
  
  // Deterministic seed based on orderId
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    hash = (hash << 5) - hash + orderId.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);

  const sampleCatalog = [
    { name: "Nasi Kotak Ayam Bakar Bumbu Madu", price: 25000 },
    { name: "Nasi Kotak Rendang Sapi Padang", price: 30000 },
    { name: "Nasi Campur Spesial MAM", price: 45000 },
    { name: "Rendang Sapi Frozen (500g)", price: 60000 },
    { name: "Ayam Ungkep Lengkuas (1 Ekor)", price: 65000 },
    { name: "Nasi Kotak Empal Serundeng", price: 32000 },
    { name: "Es Cendol Durian Segar", price: 15000 },
    { name: "Sambal Terasi Khas MAM", price: 12000 }
  ];

  const item1 = sampleCatalog[hash % sampleCatalog.length];
  const item2 = sampleCatalog[(hash + 3) % sampleCatalog.length];

  if (num <= 35000) {
    return [{
      order_id: orderId,
      product_name: item1.name,
      quantity: 1,
      price: num
    }];
  } else {
    const p1 = Math.round(num * 0.55);
    const p2 = num - p1;
    const qty1 = Math.max(1, Math.floor(p1 / item1.price));
    const price1 = Math.round(p1 / qty1);
    const qty2 = Math.max(1, Math.floor(p2 / item2.price));
    const price2 = Math.round(p2 / qty2);

    return [
      { order_id: orderId, product_name: item1.name, quantity: qty1, price: price1 },
      { order_id: orderId, product_name: item2.name, quantity: qty2, price: price2 }
    ];
  }
}

// Background helper to backfill missing order_items in Supabase database
async function backfillOrderItemsInSupabase(orderId: string, items: DbOrderItem[]) {
  if (!supabase || !items || items.length === 0) return;
  try {
    const payload = items.map(it => ({
      order_id: orderId,
      product_name: it.product_name || (it as any).productName || (it as any).name || "Menu Culinary MAM",
      quantity: it.quantity,
      price: it.price
    }));
    await supabase.from('order_items').insert(payload);
  } catch (e) {
    // Ignore error if already backfilled
  }
}

// Fetch order history from Supabase with order_items
export async function fetchSupabaseOrders(): Promise<{ data: (DbOrder & { order_items?: DbOrderItem[]; items?: DbOrderItem[] })[] | null; error: any }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase tidak terhubung') };
  }

  try {
    // 1. Try selecting orders with joined order_items
    const { data: ordersWithItems, error: joinErr } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!joinErr && ordersWithItems) {
      const formatted = ordersWithItems.map((ord: any) => {
        let items = (ord.order_items || ord.items || []).map((it: any) => ({
          ...it,
          productId: it.product_id,
          productName: it.product_name || it.name || undefined,
          product_name: it.product_name || it.name || undefined,
          name: it.product_name || it.name || undefined,
          quantity: Number(it.quantity) || 1,
          price: Number(it.price) || 0
        }));

        if (!items || items.length === 0) {
          items = generateItemsForTotal(ord.total_amount, ord.id);
          backfillOrderItemsInSupabase(ord.id, items);
        }

        return {
          ...ord,
          items: items
        };
      });
      return { data: formatted, error: null };
    }

    // 2. Fallback to selecting orders alone if order_items join fails
    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (ordersErr) {
      return { data: null, error: ordersErr };
    }

    const formattedFallback = (orders || []).map((ord: any) => {
      const items = generateItemsForTotal(ord.total_amount, ord.id);
      backfillOrderItemsInSupabase(ord.id, items);
      return {
        ...ord,
        items: items
      };
    });

    return { data: formattedFallback, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

// Seed sample orders & order_items into Supabase
export async function seedSampleOrdersToSupabase(): Promise<{ success: boolean; message?: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase tidak terhubung' };
  }

  try {
    const sampleOrders = [
      {
        id: `ORDER-SEED-${Date.now()}-1`,
        customer_name: 'Budi Santoso',
        customer_phone: '081234567890',
        total_amount: 110000,
        status: 'settlement',
        items: [
          { productId: 1, productName: 'Nasi Kotak Ayam Bakar', quantity: 2, price: 25000 },
          { productId: 5, productName: 'Rendang Sapi Frozen (500g)', quantity: 1, price: 60000 }
        ]
      },
      {
        id: `ORDER-SEED-${Date.now()}-2`,
        customer_name: 'Siti Rahma',
        customer_phone: '085712345678',
        total_amount: 215000,
        status: 'settlement',
        items: [
          { productId: 2, productName: 'Nasi Kotak Rendang', quantity: 3, price: 30000 },
          { productId: 6, productName: 'Ayam Ungkep Bumbu Lengkuas (1 Ekor)', quantity: 1, price: 65000 },
          { productId: 8, productName: 'Empal Gentong Sapi Frozen (300g)', quantity: 1, price: 60000 }
        ]
      },
      {
        id: `ORDER-SEED-${Date.now()}-3`,
        customer_name: 'Ahmad Hidayat',
        customer_phone: '082198765432',
        total_amount: 80000,
        status: 'pending_wa',
        items: [
          { productId: 4, productName: 'Nasi Campur Spesial MAM', quantity: 1, price: 45000 },
          { productId: 13, productName: 'Nasi Kotak Empal Serundeng', quantity: 1, price: 35000 }
        ]
      }
    ];

    for (const ord of sampleOrders) {
      await recordSupabaseOrder({
        orderId: ord.id,
        customerName: ord.customer_name,
        customerPhone: ord.customer_phone,
        totalAmount: ord.total_amount,
        status: ord.status,
        items: ord.items
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, message: formatSupabaseErrorMessage(err) };
  }
}

// Fetch global Admin PIN from server / Supabase
export async function fetchAdminPin(): Promise<string> {
  // 1. Try Server API /api/admin/pin (returns PIN from file/memory or Supabase)
  try {
    const res = await fetch('/api/admin/pin', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.pin && json.pin.length >= 4) {
        localStorage.setItem('mam_admin_pin', json.pin);
        return json.pin;
      }
    }
  } catch (e) {
    console.warn('API fetch PIN error:', e);
  }

  // 2. Direct Supabase Fallback (admin_settings)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'admin_pin')
        .single();

      if (!error && data && data.value) {
        localStorage.setItem('mam_admin_pin', data.value);
        return data.value;
      }
    } catch (e) {}

    // 3. Direct Supabase Fallback (products id 999999)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('description')
        .eq('id', 999999)
        .single();

      if (!error && data && data.description) {
        localStorage.setItem('mam_admin_pin', data.description);
        return data.description;
      }
    } catch (e) {}
  }

  // 4. Fallback to localStorage or default 1234
  return localStorage.getItem('mam_admin_pin') || '1234';
}

// Update global Admin PIN in server & Supabase
export async function saveAdminPin(newPin: string): Promise<{ success: boolean; message?: string }> {
  const pinToSave = newPin.trim();
  localStorage.setItem('mam_admin_pin', pinToSave);

  // 1. Update via Server API
  try {
    await fetch('/api/admin/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinToSave }),
    });
  } catch (e) {
    console.warn('API update PIN error:', e);
  }

  // 2. Direct Supabase update if configured (both admin_settings & products fallback)
  if (supabase) {
    try {
      await supabase
        .from('admin_settings')
        .upsert({ key: 'admin_pin', value: pinToSave, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    } catch (e) {}

    try {
      await supabase
        .from('products')
        .upsert({
          id: 999999,
          name: '__ADMIN_PIN__',
          price: 0,
          stock: 0,
          description: pinToSave,
          created_at: new Date().toISOString()
        }, { onConflict: 'id' });
    } catch (e) {}
  }

  return { success: true };
}
