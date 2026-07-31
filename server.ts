import express from "express";
import path from "path";
import dotenv from "dotenv";
import midtransClient from "midtrans-client";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to initialize Midtrans Snap client
function getMidtransSnap() {
  const rawServerKey = process.env.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVERKEY || "";
  const rawClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || process.env.MIDTRANS_CLIENT_KEY || "";
  
  const serverKey = rawServerKey.trim().replace(/[\r\n]/g, "");
  const clientKey = rawClientKey.trim().replace(/[\r\n]/g, "");
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
  try {
    const { order_id, gross_amount, customer_details, item_details } = req.body;

    const rawServerKey = process.env.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVERKEY || "";
    const serverKey = rawServerKey.trim().replace(/[\r\n]/g, "");

    if (!serverKey) {
      console.error("[Midtrans API Error] Server key missing.");
      return res.status(400).json({
        error: "MIDTRANS_SERVER_KEY is missing",
        message: "Silakan masukkan MIDTRANS_SERVER_KEY di variabel lingkungan (.env atau Vercel / Secrets AI Studio).",
      });
    }

    // 1. Clean order_id (alphanumeric and dash only, max 50 chars)
    const rawOrderId = typeof order_id === "string" ? order_id : "";
    let cleanOrderId = rawOrderId.replace(/[^a-zA-Z0-9-]/g, "").substring(0, 50);
    if (!cleanOrderId) {
      cleanOrderId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    // 2. Clean customer details
    const rawName = String(customer_details?.name || customer_details?.first_name || "Pelanggan").trim();
    const cleanFirstName = rawName.replace(/[^a-zA-Z0-9\s]/g, "").trim().substring(0, 50) || "Pelanggan";
    const rawEmail = String(customer_details?.email || "").trim();
    const cleanEmail = rawEmail.includes("@") ? rawEmail : "pelanggan@example.com";
    const rawPhone = String(customer_details?.phone || customer_details?.whatsapp || "08123456789").trim();
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "").substring(0, 15) || "08123456789";
    const cleanAddress = String(customer_details?.address || "Alamat Pengiriman").trim().substring(0, 200) || "Alamat Pengiriman";

    // 3. Clean item details & compute exact sum
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

    // 4. Calculate total amount to guarantee gross_amount == sum(item_details)
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

    console.log(`[Midtrans API] Requesting Snap Token for Order ID: ${cleanOrderId}, Amount: Rp${amount}`);

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
        throw new Error(
          responseData?.error_messages
            ? responseData.error_messages.join(", ")
            : responseData?.message || `Midtrans API returned status ${apiResponse.status}`
        );
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
      message: error.message,
      apiResponse: error.ApiResponse || error.response || error,
      stack: error.stack,
    });

    return res.status(500).json({
      error: "Failed to create transaction token",
      message: error.message || "Terjadi kesalahan saat berkomunikasi dengan server Midtrans.",
    });
  }
};

app.post("/api/tokenizer", handleTokenizer);
app.post("/app/api/tokenizer", handleTokenizer); // Support Next.js App Router route alias request

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
        }
      } else if (transactionStatus === "settlement") {
        console.log(`✅ Order ${orderId} payment settled successfully!`);
      } else if (transactionStatus === "cancel" || transactionStatus === "deny" || transactionStatus === "expire") {
        console.log(`❌ Order ${orderId} status changed to ${transactionStatus}.`);
      } else if (transactionStatus === "pending") {
        console.log(`⏳ Order ${orderId} is pending payment.`);
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
