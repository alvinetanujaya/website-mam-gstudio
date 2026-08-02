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
  // 1. Direct Supabase Client Query
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        return { data, error: null };
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
        return { data: json.data, error: null };
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

// Seed initial default products into Supabase if empty
export async function seedProductsToSupabase(itemsToSeed: MenuItem[] = MENU_ITEMS): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase belum terhubung. Konfigurasi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di .env.' };
  }

  try {
    const payload = itemsToSeed.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      stock: item.stock ?? 50
    }));

    const { data, error } = await supabase
      .from('products')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Error seeding products:', error);
      return { success: false, message: `Gagal seeding: ${formatSupabaseErrorMessage(error)}` };
    }

    return { success: true, message: `Berhasil menambahkan ${data?.length || 0} produk ke tabel Supabase!` };
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
  items: { productId: number; quantity: number; price: number }[];
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
      const orderItemsData = params.items.map(item => ({
        order_id: params.orderId,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) {
        console.error('❌ Error inserting order_items into Supabase:', itemsError);
      }
    }

    // 3. Decrement Stock for each product
    for (const item of params.items) {
      if (item.productId) {
        // Fetch current stock first
        const { data: prodData } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.productId)
          .single();

        if (prodData && typeof prodData.stock === 'number') {
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

// Fetch order history from Supabase
export async function fetchSupabaseOrders(): Promise<{ data: (DbOrder & { items?: DbOrderItem[] })[] | null; error: any }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase tidak terhubung') };
  }

  try {
    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (ordersErr) {
      return { data: null, error: ordersErr };
    }

    return { data: orders, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}
