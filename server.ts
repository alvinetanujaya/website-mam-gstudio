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
  const serverKey = process.env.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVERKEY || "";
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || process.env.MIDTRANS_CLIENT_KEY || "";
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

    const serverKey = process.env.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVERKEY;
    if (!serverKey) {
      return res.status(400).json({
        error: "MIDTRANS_SERVER_KEY is missing",
        message: "Silakan masukkan MIDTRANS_SERVER_KEY di variabel lingkungan (.env atau Vercel / Secrets AI Studio).",
      });
    }

    const orderId = order_id || `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const amount = Number(gross_amount) || 0;

    if (amount <= 0) {
      return res.status(400).json({ error: "Invalid gross_amount" });
    }

    const snap = getMidtransSnap();

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: Math.round(amount),
      },
      customer_details: {
        first_name: customer_details?.name || customer_details?.first_name || "Pelanggan",
        email: customer_details?.email || "pelanggan@example.com",
        phone: customer_details?.phone || customer_details?.whatsapp || "08123456789",
        billing_address: {
          address: customer_details?.address || "Alamat Pengiriman",
        },
        shipping_address: {
          address: customer_details?.address || "Alamat Pengiriman",
        },
      },
      item_details: item_details && Array.isArray(item_details) && item_details.length > 0 
        ? item_details.map((item: { id?: string; name: string; price: number; quantity: number }) => ({
            id: item.id || `ITEM-${Math.random().toString(36).substring(7)}`,
            name: item.name.substring(0, 50), // Max 50 chars for Midtrans
            price: Math.round(item.price),
            quantity: Math.max(1, Math.round(item.quantity)),
          }))
        : [
            {
              id: "ITEM-1",
              price: Math.round(amount),
              quantity: 1,
              name: "Pesanan Kuliner Nusantara",
            },
          ],
    };

    console.log(`[Midtrans API] Creating Snap Token for Order ID: ${orderId}, Amount: ${amount}`);
    const transaction = await snap.createTransaction(parameter);
    console.log(`[Midtrans API] Snap Token created successfully:`, transaction.token);

    return res.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId,
    });
  } catch (error: any) {
    console.error("[Midtrans API Error] Failed to create Snap Token:", error);
    return res.status(500).json({
      error: "Failed to create transaction token",
      message: error.message || "An unexpected error occurred",
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
