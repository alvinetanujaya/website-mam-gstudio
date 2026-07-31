import midtransClient from "midtrans-client";

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const order_id = body.order_id;
    const gross_amount = body.gross_amount;
    const customer_details = body.customer_details || body.customerDetails;
    const item_details = body.item_details || body.items;

    const rawServerKey = process.env.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVERKEY || "";
    const rawClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || process.env.MIDTRANS_CLIENT_KEY || "";
    
    const serverKey = (rawServerKey || "").trim().replace(/[\r\n]/g, "");
    const clientKey = (rawClientKey || "").trim().replace(/[\r\n]/g, "");
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true" || process.env.MIDTRANS_IS_PRODUCTION === "true";

    if (!serverKey) {
      return res.status(500).json({
        error: "MIDTRANS_SERVER_KEY belum dikonfigurasi di environment variables.",
      });
    }

    const rawOrderId = typeof order_id === "string" ? order_id : "";
    const sanitizedOrderId = rawOrderId.replace(/[^a-zA-Z0-9-]/g, "").substring(0, 50);
    const cleanOrderId = sanitizedOrderId || `ORDER-${Date.now()}`;

    const rawPhone = String(customer_details?.phone || customer_details?.whatsapp || customer_details?.phone_number || "").trim();
    const digitsOnlyPhone = rawPhone.replace(/[^0-9]/g, "");
    const cleanPhone = (digitsOnlyPhone && digitsOnlyPhone.length >= 10) 
      ? digitsOnlyPhone.substring(0, 15) 
      : "08123456789";

    const rawName = String(customer_details?.name || customer_details?.first_name || "Pelanggan").trim();
    const cleanFirstName = rawName.replace(/[^a-zA-Z0-9\s]/g, "").trim().substring(0, 50) || "Pelanggan";
    const rawEmail = String(customer_details?.email || "").trim();
    const cleanEmail = rawEmail.includes("@") ? rawEmail : "pelanggan@example.com";
    const cleanAddress = String(customer_details?.address || "Alamat Pengiriman").trim().substring(0, 200) || "Alamat Pengiriman";

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
        billing_address: { address: cleanAddress },
        shipping_address: { address: cleanAddress },
      },
    };

    if (cleanItems.length > 0) {
      parameter.item_details = cleanItems;
    }

    try {
      const snap = new midtransClient.Snap({
        isProduction,
        serverKey,
        clientKey,
      });
      const transaction = await snap.createTransaction(parameter);
      return res.status(200).json({
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        order_id: cleanOrderId,
      });
    } catch (sdkError: any) {
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
        const errMsg = responseData?.error_messages
          ? responseData.error_messages.join(", ")
          : responseData?.message || `Midtrans API returned status ${apiResponse.status}`;
        throw new Error(errMsg);
      }

      return res.status(200).json({
        token: responseData.token,
        redirect_url: responseData.redirect_url,
        order_id: cleanOrderId,
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Gagal memproses transaksi dengan Midtrans",
    });
  }
}
