import express from "express";
import path from "path";
import dotenv from "dotenv";
import midtransClient from "midtrans-client";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to initialize Supabase Server client
function getSupabaseServerClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (url && key) {
    return createClient(url, key);
  }
  return null;
}

// Helper to record order & decrement product stock in Supabase
async function recordOrderToSupabase(params: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  status?: string;
  items: { productId?: number; quantity: number; price: number }[];
}) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.log("[Supabase Server] Client not configured. Skipping server database insertion.");
    return;
  }

  try {
    const orderStatus = params.status || "pending";
    console.log(`[Supabase Server] Saving order ${params.orderId} to 'orders' table...`);

    // 1. Upsert Order
    const { error: orderErr } = await supabase.from("orders").upsert(
      {
        id: params.orderId,
        customer_name: params.customerName || "Pelanggan",
        customer_phone: params.customerPhone || "-",
        total_amount: params.totalAmount,
        status: orderStatus,
      },
      { onConflict: "id" }
    );

    if (orderErr) {
      console.error("[Supabase Server Error] Failed to insert order:", orderErr.message);
      return;
    }

    // 2. Insert order_items
    if (params.items && params.items.length > 0) {
      const orderItems = params.items.map((it) => ({
        order_id: params.orderId,
        product_id: typeof it.productId === "number" ? it.productId : null,
        quantity: it.quantity,
        price: it.price,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) {
        console.error("[Supabase Server Error] Failed to insert order_items:", itemsErr.message);
      }
    }

    // 3. Decrement Product stock
    for (const item of params.items) {
      if (typeof item.productId === "number") {
        const { data: prodData } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.productId)
          .single();

        if (prodData && typeof prodData.stock === "number") {
          const newStock = Math.max(0, prodData.stock - item.quantity);
          await supabase
            .from("products")
            .update({ stock: newStock })
            .eq("id", item.productId);
          console.log(`[Supabase Server] Stock updated for product #${item.productId}: ${prodData.stock} -> ${newStock}`);
        }
      }
    }
  } catch (err: any) {
    console.error("[Supabase Server Exception]:", err?.message || err);
  }
}

// Helper to update order status in Supabase
async function updateSupabaseOrderStatus(orderId: string, status: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("orders")
      .update({ status: status })
      .eq("id", orderId);

    if (error) {
      console.error(`[Supabase Server] Error updating order ${orderId} status to ${status}:`, error.message);
    } else {
      console.log(`[Supabase Server] Order ${orderId} status updated to: ${status}`);
    }
  } catch (err: any) {
    console.error("[Supabase Server Exception]:", err?.message || err);
  }
}

// Helper function to initialize Midtrans Snap client
function getMidtransSnap() {
  const rawServerKey = process.env.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVERKEY || "";
  const rawClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || process.env.MIDTRANS_CLIENT_KEY || "";
  
  const serverKey = (rawServerKey || "").trim().replace(/[\r\n]/g, "");
  const clientKey = (rawClientKey || "").trim().replace(/[\r\n]/g, "");
  const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true" || process.env.MIDTRANS_IS_PRODUCTION === "true";

  if (!serverKey) {
    console.warn("⚠️ MIDTRANS_SERVER_KEY is not set in environment variables.");
  }

  return new midtransClient.Snap({
    isProduction: isProduction,
    serverKey: serverKey,
    clientKey: clientKey,
  });
}

// 1. API Route: Snap Transaction Token Generator
const handleTokenizer = async (req: express.Request, res: express.Response) => {
  console.log(`[Express API Handler] ${req.method} ${req.originalUrl} triggered`);
  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    body = body || {};

    const order_id = body.order_id;
    const gross_amount = body.gross_amount;
    const customer_details = body.customer_details || body.customerDetails;
    const item_details = body.item_details || body.items;

    // 3. SANITASI SERVER KEY
    const serverKey = (process.env.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVERKEY || process.env.SERVER_KEY || "").trim().replace(/[\r\n]/g, "");

    if (!serverKey) {
      console.error("[Midtrans API Error] Server key missing.");
      return res.status(500).json({
        error: "MIDTRANS_SERVER_KEY belum dikonfigurasi di environment variables (.env / Secrets).",
      });
    }

    // 2. SANITASI ORDER ID (alphanumeric dan hyphen)
    const rawOrderId = typeof order_id === "string" ? order_id : "";
    const sanitizedOrderId = rawOrderId.replace(/[^a-zA-Z0-9-]/g, "").substring(0, 50);
    const cleanOrderId = sanitizedOrderId || `ORDER-${Date.now()}`;

    // 1. SANITASI TELEPON
    const rawPhone = String(customer_details?.phone || customer_details?.whatsapp || customer_details?.phone_number || "").trim();
    const digitsOnlyPhone = rawPhone.replace(/[^0-9]/g, "");
    const cleanPhone = (digitsOnlyPhone && digitsOnlyPhone.length >= 10) 
      ? digitsOnlyPhone.substring(0, 15) 
      : "08123456789";

    // Sanitasi detail pelanggan lainnya
    const rawName = String(customer_details?.name || customer_details?.first_name || "Pelanggan").trim();
    const cleanFirstName = rawName.replace(/[^a-zA-Z0-9\s]/g, "").trim().substring(0, 50) || "Pelanggan";
    const rawEmail = String(customer_details?.email || "").trim();
    const cleanEmail = rawEmail.includes("@") ? rawEmail : "pelanggan@example.com";
    const cleanAddress = String(customer_details?.address || "Alamat Pengiriman").trim().substring(0, 200) || "Alamat Pengiriman";

    // Sanitasi item details
    const cleanItems = (Array.isArray(item_details) && item_details.length > 0 ? item_details : []).map((item: any, idx: number) => {
      const rawId = String(item.id || `ITEM-${idx + 1}`).replace(/[^a-zA-Z0-9-]/g, "").substring(0, 50);
      const cleanId = rawId || `ITEM-${idx + 1}`;
      const rawItemName = String(item.name || `Item ${idx + 1}`).replace(/[^\x20-\x7E]/g, "").substring(0, 50).trim();
      const cleanName = rawItemName || `Item ${idx + 1}`;
      const price = Math.max(0, Math.round(Number(item.price) || 0));
      const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));

      return {
        id: cleanId,
        name: cleanName,
        price: price,
        quantity: quantity,
      };
    });

    // Hitung total amount agar gross_amount persis sama dengan jumlah item_details
    const itemsSum = cleanItems.reduce((acc: number, it: any) => acc + (it.price * it.quantity), 0);
    const amount = itemsSum > 0 ? itemsSum : Math.max(1, Math.round(Number(gross_amount) || 0));

    const parameter: any = {
      transaction_details: {
        order_id: cleanOrderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: cleanFirstName,
        email: cleanEmail,
        phone: cleanPhone,
        billing_address: {
          address: cleanAddress,
        },
        shipping_address: {
          address: cleanAddress,
        },
      },
    };

    if (cleanItems.length > 0) {
      parameter.item_details = cleanItems;
    }

    console.log(`[Midtrans API] Requesting Snap Token for Order ID: ${cleanOrderId}, Phone: ${cleanPhone}, Amount: Rp${amount}`);

    // Record order in Supabase background
    recordOrderToSupabase({
      orderId: cleanOrderId,
      customerName: cleanFirstName,
      customerPhone: cleanPhone,
      totalAmount: amount,
      status: "pending",
      items: (Array.isArray(item_details) ? item_details : []).map((it: any) => ({
        productId: Number(it.productId || it.product_id || it.id) || undefined,
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
      })),
    });

    // Try creating via Midtrans SDK first
    try {
      const snap = getMidtransSnap();
      const transaction = await snap.createTransaction(parameter);
      console.log(`[Midtrans API] Snap Token created successfully via SDK:`, transaction.token);

      return res.json({
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        order_id: cleanOrderId,
      });
    } catch (sdkError: any) {
      console.warn("[Midtrans SDK Failed] Falling back to direct REST API fetch...", sdkError?.message || sdkError);
      
      // Fallback: Direct Fetch call to Midtrans Snap REST API
      const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true" || process.env.MIDTRANS_IS_PRODUCTION === "true";
      const apiUrl = isProduction
        ? "https://app.midtrans.com/snap/v1/transactions"
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

      const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;

      const apiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify(parameter),
      });

      const responseData: any = await apiResponse.json();

      if (!apiResponse.ok || !responseData.token) {
        console.error("❌ [Midtrans REST API Error Output]:", JSON.stringify(responseData, null, 2));
        const errMsg = responseData?.error_messages
          ? responseData.error_messages.join(", ")
          : responseData?.message || `Midtrans API returned status ${apiResponse.status}`;
        throw new Error(errMsg);
      }

      console.log(`[Midtrans API] Snap Token created successfully via REST API:`, responseData.token);
      return res.json({
        token: responseData.token,
        redirect_url: responseData.redirect_url,
        order_id: cleanOrderId,
      });
    }
  } catch (error: any) {
    console.error("❌ [Midtrans API Tokenizer Error Details]:", {
      message: error?.message,
      stack: error?.stack,
    });

    // 4. RESPONSE ERROR rapi { error: error.message } status 500
    return res.status(500).json({
      error: error?.message || "Gagal memproses transaksi dengan Midtrans",
    });
  }
};

app.post("/api/tokenizer", handleTokenizer);
app.post("/api/payment", handleTokenizer);
app.post("/api/checkout", handleTokenizer);
app.post("/api/midtrans", handleTokenizer);
app.post("/app/api/tokenizer", handleTokenizer);
app.post("/app/api/payment", handleTokenizer);
app.post("/app/api/checkout", handleTokenizer);
app.post("/app/api/midtrans", handleTokenizer); // Support Next.js App Router route alias request

// API Route: Get Products & Stock from Supabase
const handleGetProducts = async (req: express.Request, res: express.Response) => {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return res.status(500).json({ error: "Supabase client not configured on server" });
    }
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("[Supabase Server] Error fetching products:", error.message);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ data });
  } catch (err: any) {
    console.error("[Supabase Server] Exception fetching products:", err?.message || err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
};

app.get("/api/products", handleGetProducts);
app.get("/app/api/products", handleGetProducts);

// Global server in-memory Admin PIN (synced with Supabase admin_settings)
let serverAdminPin = "1234";

// API Route: Get Admin PIN
const handleGetAdminPin = async (req: express.Request, res: express.Response) => {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "admin_pin")
        .single();

      if (!error && data && data.value) {
        serverAdminPin = data.value;
      }
    }
    return res.json({ pin: serverAdminPin });
  } catch (err) {
    return res.json({ pin: serverAdminPin });
  }
};

// API Route: Update Admin PIN
const handleUpdateAdminPin = async (req: express.Request, res: express.Response) => {
  try {
    const { pin } = req.body || {};
    if (!pin || typeof pin !== "string" || pin.trim().length < 4) {
      return res.status(400).json({ error: "PIN harus minimal 4 karakter" });
    }

    const newPin = pin.trim();
    serverAdminPin = newPin;

    const supabase = getSupabaseServerClient();
    if (supabase) {
      await supabase
        .from("admin_settings")
        .upsert({ key: "admin_pin", value: newPin, updated_at: new Date().toISOString() }, { onConflict: "key" });
    }

    return res.json({ success: true, pin: newPin });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Gagal memperbarui PIN Admin" });
  }
};

app.get("/api/admin/pin", handleGetAdminPin);
app.post("/api/admin/pin", handleUpdateAdminPin);
app.get("/app/api/admin/pin", handleGetAdminPin);
app.post("/app/api/admin/pin", handleUpdateAdminPin);

// 2. API Route: Notification Handler (Webhook)
const handleNotification = async (req: express.Request, res: express.Response) => {
  try {
    const notificationJson = req.body;
    console.log("==========================================");
    console.log("📩 [Midtrans Webhook] Payment Notification Received:");
    console.log(JSON.stringify(notificationJson, null, 2));
    console.log("==========================================");

    const serverKey = process.env.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVERKEY;
    if (serverKey) {
      const snap = getMidtransSnap();
      const statusResponse = await snap.transaction.notification(notificationJson);
      
      const orderId = statusResponse.order_id;
      const transactionStatus = statusResponse.transaction_status;
      const fraudStatus = statusResponse.fraud_status;

      console.log(`[Midtrans Webhook Processed] Order ID: ${orderId}`);
      console.log(`Transaction Status: ${transactionStatus}, Fraud Status: ${fraudStatus}`);

      if (transactionStatus === "capture") {
        if (fraudStatus === "accept") {
          console.log(`✅ Order ${orderId} successfully captured & accepted.`);
          await updateSupabaseOrderStatus(orderId, "settlement");
        }
      } else if (transactionStatus === "settlement") {
        console.log(`✅ Order ${orderId} payment settled successfully!`);
        await updateSupabaseOrderStatus(orderId, "settlement");
      } else if (transactionStatus === "cancel" || transactionStatus === "deny" || transactionStatus === "expire") {
        console.log(`❌ Order ${orderId} status changed to ${transactionStatus}.`);
        await updateSupabaseOrderStatus(orderId, transactionStatus);
      } else if (transactionStatus === "pending") {
        console.log(`⏳ Order ${orderId} is pending payment.`);
        await updateSupabaseOrderStatus(orderId, "pending");
      }
    } else {
      console.log("⚠️ MIDTRANS_SERVER_KEY not provided. Skipping signature verification.");
    }

    return res.status(200).json({ status: "OK", message: "Notification received successfully" });
  } catch (error: any) {
    console.error("❌ [Midtrans Webhook Error]:", error);
    return res.status(500).json({ error: error.message || "Failed to process notification" });
  }
};

app.post("/api/payment-notification", handleNotification);
app.post("/app/api/payment-notification", handleNotification); // Support Next.js App Router route alias request

// 3. Serve Frontend / Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
