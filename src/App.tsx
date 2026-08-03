import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Menu as MenuIcon,
  ShoppingBag,
  X,
  Plus,
  Minus,
  MapPin,
  Clock,
  Check,
  Send,
  Star,
  Share2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Smartphone,
  ShieldCheck,
  UtensilsCrossed,
  Sparkles,
  ShoppingBag as BagIcon,
  Truck,
  MessageCircle,
  Calendar,
  AlertCircle,
  CreditCard,
  Receipt,
  Lock
} from "lucide-react";
import { MENU_ITEMS, CUSTOMIZATION_OPTIONS, FAQS } from "./data";
import { MenuItem, CustomizationOption, CartItem, CustomerDetails, DbProduct } from "./types";
import { MamLogo } from "./components/MamLogo";
import { AdminDashboard } from "./components/AdminDashboard";
import { 
  isSupabaseConfigured, 
  fetchProductsFromSupabase, 
  recordSupabaseOrder,
  subscribeToProducts
} from "./lib/supabase";
import heroSapiLadaHitam from "./assets/images/regenerated_image_1785694387233.png";

export default function App() {
  // Navigation & UI States
  const [currentTab, setCurrentTab] = useState<"home" | "menu" | "checkout">("home");
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isBottomCartExpanded, setIsBottomCartExpanded] = useState<boolean>(false);
  const [isCartBouncing, setIsCartBouncing] = useState<boolean>(false);

  // Hidden Admin Dashboard State
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const searchParams = new URLSearchParams(window.location.search);
    const isQueryAdmin = searchParams.get("admin") === "true" || searchParams.get("dashboard") === "admin";
    const isPathAdmin = window.location.pathname.startsWith("/admin");
    const isHashAdmin = window.location.hash === "#admin";
    return isQueryAdmin || isPathAdmin || isHashAdmin;
  });

  const [copyrightClicks, setCopyrightClicks] = useState<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Secret Shortcut: Ctrl + Shift + A to open Admin Dashboard
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };

    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const isQueryAdmin = searchParams.get("admin") === "true" || searchParams.get("dashboard") === "admin";
      const isPathAdmin = window.location.pathname.startsWith("/admin");
      const isHashAdmin = window.location.hash === "#admin";
      if (isQueryAdmin || isPathAdmin || isHashAdmin) {
        setIsAdminOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const handleCopyrightClick = () => {
    const next = copyrightClicks + 1;
    setCopyrightClicks(next);
    if (next >= 3) {
      setIsAdminOpen(true);
      setCopyrightClicks(0);
    }
  };

  // Dynamic Menu Items State with Supabase stock integration
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);

  // Function to sync products/name/price/stock from Supabase
  const loadSupabaseProducts = async () => {
    const res = await fetchProductsFromSupabase();
    if (res && res.data && res.data.length > 0) {
      // Deduplicate Supabase items by ID and normalized Name to prevent duplicate entries
      const uniqueDbItems: DbProduct[] = [];
      const seenIds = new Set<string>();
      const seenNames = new Set<string>();

      for (const item of res.data) {
        const idStr = String(item.id);
        const nameClean = (item.name || '').trim().toLowerCase();
        
        if (!seenIds.has(idStr) && (!nameClean || !seenNames.has(nameClean))) {
          if (idStr) seenIds.add(idStr);
          if (nameClean) seenNames.add(nameClean);
          uniqueDbItems.push(item);
        }
      }

      // Map unique Supabase products directly to App menu items
      const itemsFromDb: MenuItem[] = uniqueDbItems.map((dbItem) => {
        // Find local item metadata (desc, image, etc.) if matching
        const localMatch = MENU_ITEMS.find(
          (m) =>
            String(m.id) === String(dbItem.id) ||
            m.name.trim().toLowerCase() === (dbItem.name || '').trim().toLowerCase()
        );

        const parsedStock = typeof dbItem.stock === 'number' ? dbItem.stock : Number(dbItem.stock);
        const nameLower = (dbItem.name || '').toLowerCase();

        let cat = dbItem.category;
        if (!cat) {
          if (
            nameLower.includes("frozen") ||
            nameLower.includes("ungkep") ||
            nameLower.includes("paru") ||
            nameLower.includes("bakso") ||
            nameLower.includes("empal gentong") ||
            nameLower.includes("ati ampela")
          ) {
            cat = "Frozen Food";
          } else {
            cat = localMatch?.category || "Makanan Utama";
          }
        }

        return {
          id: Number(dbItem.id),
          name: dbItem.name || localMatch?.name || 'Menu',
          desc: localMatch?.desc || "Menu lezat pilihan dari MAM Culinary Heritage.",
          price: Number(dbItem.price) || (localMatch?.price || 25000),
          category: cat,
          image: dbItem.image || localMatch?.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600",
          featured: localMatch?.featured ?? true,
          stock: isNaN(parsedStock) ? (localMatch?.stock ?? 50) : parsedStock,
        };
      });

      setMenuItems(itemsFromDb);
    }
  };

  useEffect(() => {
    loadSupabaseProducts();

    // Subscribe to realtime stock updates
    const channel = subscribeToProducts(() => {
      loadSupabaseProducts();
    });

    // Also poll every 5s as a fallback
    const interval = setInterval(() => {
      loadSupabaseProducts();
    }, 5000);

    return () => {
      if (channel) channel.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const triggerCartAnimation = () => {
    setIsCartBouncing(true);
    setTimeout(() => setIsCartBouncing(false), 650);
  };

  // Scroll refs for horizontal slider carousels
  const menuScrollRef = useRef<HTMLDivElement>(null);
  const homeMenuScrollRef = useRef<HTMLDivElement>(null);

  const scrollMenu = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (ref.current) {
      const scrollAmount = direction === "left" ? -340 : 340;
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Scroll to top automatically when changing tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentTab]);
  
  // Cart State (initialized from localStorage if available)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("mam_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Customization selection in Detail Modal
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [selectedCustomizations, setSelectedCustomizations] = useState<CustomizationOption[]>([]);

  // Customer Form details
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    fullName: "",
    phone: "",
    deliveryAddress: "",
    deliveryDate: "",
    notes: ""
  });

  // Delivery date generator for Open PO H-1 system with 8 PM (20:00 WIB) cutoff
  const deliveryDateData = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const isPastCutoff = currentHour >= 20; // 20:00 WIB cut-off (8 PM)

    // If >= 20:00, earliest delivery is H+2 (Besok Lusa)
    // If < 20:00, earliest delivery is H+1 (Besok)
    const startOffset = isPastCutoff ? 2 : 1;

    const daysIndo = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const monthsIndo = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const fullMonthsIndo = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const options = [];

    for (let i = 0; i < 7; i++) {
      const offset = startOffset + i;
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + offset);

      const dayName = daysIndo[targetDate.getDay()];
      const dateNum = targetDate.getDate();
      const monthShort = monthsIndo[targetDate.getMonth()];
      const monthFull = fullMonthsIndo[targetDate.getMonth()];
      const year = targetDate.getFullYear();

      let tag = "";
      if (i === 0) {
        tag = isPastCutoff ? "Besok Lusa (Tercepat)" : "Besok (Tercepat)";
      } else if (i === 1 && !isPastCutoff) {
        tag = "Besok Lusa";
      }

      const fullFormatted = `${dayName}, ${dateNum} ${monthFull} ${year}`;
      const dateFormatted = `${dateNum} ${monthShort}`;

      options.push({
        fullFormatted,
        dayName,
        dateFormatted,
        isEarliest: i === 0,
        tag
      });
    }

    return {
      isPastCutoff,
      options,
      earliestDate: options[0]?.fullFormatted || ""
    };
  }, []);

  // Auto-set default delivery date to earliest available date
  useEffect(() => {
    if (!customerDetails.deliveryDate && deliveryDateData.earliestDate) {
      setCustomerDetails((prev) => ({
        ...prev,
        deliveryDate: deliveryDateData.earliestDate
      }));
    }
  }, [deliveryDateData.earliestDate, customerDetails.deliveryDate]);

  // FAQ open states tracker
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Success screen or Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Persist Cart
  useEffect(() => {
    localStorage.setItem("mam_cart", JSON.stringify(cart));
  }, [cart]);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Format IDR Currency
  const formatIDR = (num: number) => {
    return "Rp " + num.toLocaleString("id-ID");
  };

  // Helper: Find current active category items
  const filteredMenu = useMemo(() => {
    if (activeCategory === "Semua") return menuItems;
    return menuItems.filter((item) => item.category === activeCategory);
  }, [activeCategory, menuItems]);

  // Flat shipping fee (Ongkos Kirim Flat)
  const SHIPPING_FEE = 15000;

  // Helper: Cart calculations
  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const totalPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    return cart.length > 0 ? totalPrice + SHIPPING_FEE : 0;
  }, [cart, totalPrice]);

  // Open detail view modal
  const handleOpenDetail = (item: MenuItem) => {
    setSelectedItem(item);
    setModalQuantity(1);
    setSelectedCustomizations([]);
  };

  // Toggle option selection in Detail Modal
  const handleToggleCustomization = (option: CustomizationOption) => {
    setSelectedCustomizations((prev) => {
      const exists = prev.some((o) => o.name === option.name);
      if (exists) {
        return prev.filter((o) => o.name !== option.name);
      } else {
        return [...prev, option];
      }
    });
  };

  // Calculate current unit price in Detail Modal
  const currentModalUnitPrice = useMemo(() => {
    if (!selectedItem) return 0;
    const customizationsCost = selectedCustomizations.reduce((sum, opt) => sum + opt.price, 0);
    return selectedItem.price + customizationsCost;
  }, [selectedItem, selectedCustomizations]);

  // Add Item to Cart from Detail Modal with stock check
  const handleAddToCartFromModal = () => {
    if (!selectedItem) return;

    const availableStock = selectedItem.stock ?? 50;
    if (availableStock <= 0) {
      setToastMessage(`Maaf, stok ${selectedItem.name} sedang habis.`);
      return;
    }

    // Check existing count in cart
    const existingInCart = cart
      .filter((c) => c.menuItem.id === selectedItem.id)
      .reduce((sum, c) => sum + c.quantity, 0);

    if (existingInCart + modalQuantity > availableStock) {
      setToastMessage(`Stok ${selectedItem.name} terbatas! Sisa stok: ${availableStock}`);
      return;
    }

    // Generate unique ID based on item ID + sorted customization names
    const sortedOptNames = [...selectedCustomizations].map((o) => o.name).sort();
    const cartItemId = `${selectedItem.id}-${sortedOptNames.join("_")}`;

    const newCartItem: CartItem = {
      id: cartItemId,
      menuItem: selectedItem,
      quantity: modalQuantity,
      selectedOptions: selectedCustomizations,
      unitPrice: currentModalUnitPrice
    };

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((item) => item.id === cartItemId);
      if (existingIdx > -1) {
        const updated = [...prevCart];
        updated[existingIdx].quantity += modalQuantity;
        return updated;
      }
      return [...prevCart, newCartItem];
    });

    setToastMessage(`Berhasil menambahkan ${selectedItem.name} ke pesanan`);
    triggerCartAnimation();
    setSelectedItem(null);
  };

  // Quick Direct Add to Cart from Catalog with stock check
  const handleQuickAdd = (item: MenuItem) => {
    const availableStock = item.stock ?? 50;
    if (availableStock <= 0) {
      setToastMessage(`Maaf, stok ${item.name} sedang habis.`);
      return;
    }

    const existingInCart = cart
      .filter((c) => c.menuItem.id === item.id)
      .reduce((sum, c) => sum + c.quantity, 0);

    if (existingInCart + 1 > availableStock) {
      setToastMessage(`Stok ${item.name} terbatas! Sisa stok: ${availableStock}`);
      return;
    }

    const cartItemId = `${item.id}-`; // base with no customizations
    const newCartItem: CartItem = {
      id: cartItemId,
      menuItem: item,
      quantity: 1,
      selectedOptions: [],
      unitPrice: item.price
    };

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((c) => c.id === cartItemId);
      if (existingIdx > -1) {
        const updated = [...prevCart];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [...prevCart, newCartItem];
    });

    setToastMessage(`Menambahkan ${item.name}`);
    triggerCartAnimation();
  };

  // Update Cart quantities (plus/minus) on Summary screen or widgets with stock check
  const handleUpdateCartQuantity = (id: string, change: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.id === id) {
            const availableStock = item.menuItem.stock ?? 50;
            const nextQty = item.quantity + change;
            if (change > 0 && nextQty > availableStock) {
              setToastMessage(`Stok ${item.menuItem.name} maksimal ${availableStock} porsi.`);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  // Share Application
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'MAM Culinary Heritage',
        text: 'Solusi makan harian Anda - Hidangan autentik Nusantara!',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setToastMessage("Link web berhasil disalin!");
    }
  };

  // Midtrans Payment States
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentResult, setPaymentResult] = useState<{
    show: boolean;
    status: 'success' | 'pending' | 'error';
    orderId?: string;
    message?: string;
  } | null>(null);

  // Load Midtrans Snap Script dynamically
  useEffect(() => {
    try {
      const rawClientKey =
        (import.meta.env &&
          (import.meta.env.VITE_MIDTRANS_CLIENT_KEY ||
            import.meta.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY)) ||
        "SB-Mid-client-demo";
      const clientKey = String(rawClientKey || "").trim();

      const isProduction =
        import.meta.env?.VITE_MIDTRANS_IS_PRODUCTION === "true" ||
        import.meta.env?.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";

      const snapUrl = isProduction
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";

      const scriptId = "midtrans-snap-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = snapUrl;
        if (clientKey) {
          script.setAttribute("data-client-key", clientKey);
        }
        script.async = true;
        document.body.appendChild(script);
      } else {
        script.src = snapUrl;
        if (clientKey) {
          script.setAttribute("data-client-key", clientKey);
        }
      }
    } catch (err) {
      console.warn("Gagal memuat script Midtrans Snap:", err);
    }
  }, []);

  // Midtrans Snap Payment Trigger (Pure XHR for Safari iOS Compatibility)
  const handlePayWithMidtrans = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    try {
      const cleanName = String(customerDetails?.fullName || "").trim();
      const cleanPhone = String(customerDetails?.phone || "").trim();
      const cleanAddress = String(customerDetails?.deliveryAddress || "").trim();
      const cleanDate = String(customerDetails?.deliveryDate || "").trim();
      const cleanNotes = String(customerDetails?.notes || "").trim();

      if (!cleanName) {
        alert("Silakan masukkan nama lengkap Anda untuk pengiriman.");
        return;
      }
      if (!cleanPhone) {
        alert("Silakan masukkan nomor handphone / WhatsApp Anda untuk koordinasi pengiriman.");
        return;
      }
      if (!cleanAddress) {
        alert("Silakan masukkan alamat lengkap pengiriman Anda.");
        return;
      }
      if (!cleanDate) {
        alert("Silakan pilih tanggal pengiriman pesanan Anda.");
        return;
      }

      setIsProcessingPayment(true);
      setToastMessage("Menyiapkan transaksi Midtrans Snap...");

      const itemsList = Array.isArray(cart) ? cart.map((item) => {
        const itemId = String(item?.menuItem?.id || "");
        const itemName = item?.selectedOptions && item.selectedOptions.length > 0
          ? String(`${item?.menuItem?.name || ""} (+${item.selectedOptions.map((o: any) => o?.name || "").join(", ")})`)
          : String(item?.menuItem?.name || "");
        const itemPrice = Number(item?.unitPrice || 0);
        const itemQty = Number(item?.quantity || 1);
        return {
          id: String(`ITEM-${itemId}`),
          name: itemName,
          price: itemPrice,
          quantity: itemQty,
        };
      }) : [];

      itemsList.push({
        id: "SHIPPING-FEE",
        name: "Ongkos Kirim (Flat Rate)",
        price: Number(SHIPPING_FEE || 0),
        quantity: 1,
      });

      const payloadString = JSON.stringify({
        name: cleanName,
        phone: cleanPhone,
        address: cleanAddress,
        notes: cleanNotes,
        selectedDate: cleanDate,
        gross_amount: Number(grandTotal || 0),
        items: itemsList,
        item_details: itemsList,
        customerDetails: {
          name: cleanName,
          phone: cleanPhone,
          address: cleanAddress,
          notes: cleanNotes,
          delivery_date: cleanDate,
        },
        customer_details: {
          name: cleanName,
          phone: cleanPhone,
          address: cleanAddress,
          notes: cleanNotes,
          delivery_date: cleanDate,
        },
      });

      const backendBase = (import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/$/, "");
      const targetUrl = backendBase ? `${backendBase}/api/checkout` : "/api/checkout";

      const xhr = new XMLHttpRequest();
      xhr.open("POST", targetUrl, true);
      xhr.setRequestHeader("Content-Type", "application/json");

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          setIsProcessingPayment(false);
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              const orderId = data.order_id || `ORDER-${Date.now()}`;

              // Record order & decrement stock in Supabase directly from client
              recordSupabaseOrder({
                orderId: orderId,
                customerName: cleanName,
                customerPhone: cleanPhone,
                totalAmount: grandTotal,
                status: "pending",
                items: cart.map((c) => ({
                  productId: c.menuItem.id,
                  quantity: c.quantity,
                  price: c.unitPrice,
                })),
              }).then(() => {
                loadSupabaseProducts();
              });

              if (data.token && window.snap && typeof window.snap.pay === "function") {
                window.snap.pay(data.token, {
                  onSuccess: function (result: any) {
                    console.log("Midtrans payment success:", result);
                    setCart([]);
                    loadSupabaseProducts();
                    setPaymentResult({
                      show: true,
                      status: "success",
                      orderId: orderId || result?.order_id,
                      message: "Pembayaran Anda berhasil terverifikasi! Pesanan segera disiapkan.",
                    });
                    setToastMessage("Pembayaran Berhasil! Terima kasih.");
                  },
                  onPending: function (result: any) {
                    console.log("Midtrans payment pending:", result);
                    loadSupabaseProducts();
                    setPaymentResult({
                      show: true,
                      status: "pending",
                      orderId: orderId || result?.order_id,
                      message: "Pesanan berhasil disimpan. Silakan selesaikan pembayaran sesuai instruksi.",
                    });
                    setToastMessage("Menunggu pembayaran (Pending).");
                  },
                  onError: function (result: any) {
                    console.error("Midtrans payment error:", result);
                    setPaymentResult({
                      show: true,
                      status: "error",
                      orderId: data.order_id || result?.order_id,
                      message: "Pembayaran gagal atau dibatalkan oleh pengguna.",
                    });
                    setToastMessage("Pembayaran gagal.");
                  },
                  onClose: function () {
                    console.log("Midtrans Snap popup closed.");
                    setToastMessage("Pop-up pembayaran ditutup.");
                  },
                });
              } else if (data.redirect_url) {
                window.location.href = String(data.redirect_url);
              } else {
                alert("Gagal mendapatkan token Midtrans: " + JSON.stringify(data));
              }
            } catch (parseErr: any) {
              alert("Gagal membaca respon server: " + String(parseErr?.message || parseErr));
            }
          } else {
            alert("Server Error Status: " + xhr.status + " - " + xhr.responseText);
          }
        }
      };

      xhr.onerror = function () {
        setIsProcessingPayment(false);
        alert("XHR Network Error saat menghubungi /api/checkout");
      };

      xhr.send(payloadString);
    } catch (err: any) {
      setIsProcessingPayment(false);
      alert("XHR Catch Error: " + String(err?.message || err));
    }
  };

  return (
    <div className="min-h-screen bg-soft-cream text-espresso-dark font-sans relative pb-16 md:pb-0 overflow-x-hidden">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-espresso-dark text-soft-cream px-6 py-3 rounded-full shadow-lg flex items-center gap-3 border border-outline-variant/20 font-medium text-sm md:text-base max-w-[90vw] whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-terracotta" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Application Bar */}
      <header className="fixed top-0 w-full z-40 bg-surface/95 backdrop-blur-md shadow-[0_4px_30px_rgba(44,27,18,0.04)] border-b border-outline-variant/20">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-7xl mx-auto">
          {/* Menu Drawer Toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsDrawerOpen(true)}
            className="text-espresso-dark hover:text-terracotta p-2 -ml-2 transition-colors duration-200 focus:outline-none cursor-pointer"
            aria-label="Buka Menu Samping"
          >
            <MenuIcon className="w-6 h-6" />
          </motion.button>

          {/* Logo Brand */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setCurrentTab("home"); setIsDrawerOpen(false); }}
            className="flex items-center gap-2 cursor-pointer select-none transition-transform"
          >
            <MamLogo className="h-7 md:h-8 text-espresso-dark hover:text-terracotta transition-colors" />
          </motion.div>

          <div className="flex items-center gap-2">
            {/* Cart Icon Toggle with count Badge */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              animate={
                isCartBouncing
                  ? {
                      scale: [1, 1.35, 0.9, 1.2, 0.95, 1.1, 1],
                      rotate: [0, -18, 18, -12, 12, -6, 0],
                    }
                  : { scale: 1, rotate: 0 }
              }
              transition={{ duration: 0.6, ease: "easeOut" }}
              onClick={() => setCurrentTab("checkout")}
              className="text-espresso-dark hover:text-terracotta p-2 -mr-2 transition-colors duration-200 relative cursor-pointer"
              aria-label="Keranjang Belanja"
            >
              <ShoppingBag className="w-6 h-6" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-terracotta text-soft-cream text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-soft-cream animate-pulse">
                  {totalItemsCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Navigation Drawer (Sidebar Overlay) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-espresso-dark/60 backdrop-blur-xs z-50 cursor-pointer"
            />

            {/* Panel Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-[85%] max-w-sm bg-soft-cream z-50 shadow-2xl flex flex-col p-6 border-r border-outline-variant/30"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-6 border-b border-outline-variant/20 mb-6">
                <div className="flex items-center gap-2">
                  <MamLogo className="h-8 text-espresso-dark" />
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 text-espresso-dark hover:text-terracotta transition-colors rounded-full hover:bg-espresso-dark/5"
                  aria-label="Tutup Menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 space-y-2 overflow-y-auto">
                <button
                  onClick={() => { setCurrentTab("home"); setIsDrawerOpen(false); }}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-semibold text-left transition-all ${
                    currentTab === "home"
                      ? "bg-terracotta/15 text-terracotta shadow-xs"
                      : "text-espresso-dark hover:bg-espresso-dark/5"
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Beranda</span>
                </button>

                <button
                  onClick={() => { setCurrentTab("menu"); setActiveCategory("Semua"); setIsDrawerOpen(false); }}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-semibold text-left transition-all ${
                    currentTab === "menu" && activeCategory === "Semua"
                      ? "bg-terracotta/15 text-terracotta shadow-xs"
                      : "text-espresso-dark hover:bg-espresso-dark/5"
                  }`}
                >
                  <UtensilsCrossed className="w-5 h-5" />
                  <span>Daftar Menu</span>
                </button>

                {/* Sub-menu categories */}
                <div className="pl-8 space-y-1">
                  {["Makanan Utama", "Frozen Food"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setCurrentTab("menu");
                        setActiveCategory(cat);
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                        currentTab === "menu" && activeCategory === cat
                          ? "text-terracotta font-semibold bg-terracotta/10"
                          : "text-espresso-dark/70 hover:text-terracotta"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-outline-variant/20 my-4" />

                <button
                  onClick={() => {
                    const el = document.getElementById("lokasi-section");
                    if (el) {
                      try { el.scrollIntoView({ behavior: "smooth" }); } catch (_) { el.scrollIntoView(); }
                    } else {
                      setCurrentTab("home");
                      setTimeout(() => {
                        const target = document.getElementById("lokasi-section");
                        if (target) { try { target.scrollIntoView({ behavior: "smooth" }); } catch (_) { target.scrollIntoView(); } }
                      }, 100);
                    }
                    setIsDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl font-semibold text-left text-espresso-dark hover:bg-espresso-dark/5 transition-colors"
                >
                  <MapPin className="w-5 h-5 text-espresso-dark/60" />
                  <span>Lokasi & Jam Buka</span>
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById("faq-section");
                    if (el) {
                      try { el.scrollIntoView({ behavior: "smooth" }); } catch (_) { el.scrollIntoView(); }
                    } else {
                      setCurrentTab("home");
                      setTimeout(() => {
                        const target = document.getElementById("faq-section");
                        if (target) { try { target.scrollIntoView({ behavior: "smooth" }); } catch (_) { target.scrollIntoView(); } }
                      }, 100);
                    }
                    setIsDrawerOpen(false);
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl font-semibold text-left text-espresso-dark hover:bg-espresso-dark/5 transition-colors"
                >
                  <Info className="w-5 h-5 text-espresso-dark/60" />
                  <span>Tentang Kami (FAQ)</span>
                </button>
              </nav>

              {/* Drawer Customer Support Area */}
              <div className="pt-4 border-t border-outline-variant/20 mt-auto">
                <a
                  href="https://wa.me/6282233009957"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-3 bg-white border border-terracotta text-terracotta font-semibold py-3 px-4 rounded-xl shadow-xs hover:bg-terracotta/5 transition-all text-sm"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-wasabi-green animate-ping" />
                  <span>Hubungi Kami (WhatsApp)</span>
                </a>
                
                <div className="mt-4 flex items-center gap-3 bg-espresso-dark/5 p-3 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-terracotta/20 flex items-center justify-center text-terracotta font-bold text-xs shrink-0">
                    M
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-espresso-dark truncate">Halo Sahabat MAM!</p>
                    <span className="text-[11px] text-espresso-dark/60 block truncate">Kelezatan Nusantara siap diantar</span>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Container Content */}
      <main className="pt-20">
        
        {/* TAB 1: HOME/LANDING PAGE */}
        {currentTab === "home" && (
          <div className="animate-fade-in">
            
            {/* HERO HERO SECTION */}
            <section className="px-6 py-12 md:py-20 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-10">
              <div className="w-full lg:w-1/2 flex flex-col items-start gap-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-espresso-dark leading-tight tracking-tight">
                  Life is Busy, Meals Shouldn't Be.
                </h1>
                
                <p className="text-base md:text-lg text-espresso-dark/75 leading-relaxed max-w-lg">
                  Kami percaya setiap orang berhak makan enak dan berkualitas setiap hari.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mt-2 w-full sm:w-auto">
                  <motion.button
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setCurrentTab("menu")}
                    className="bg-terracotta text-soft-cream px-8 py-4 rounded-full font-bold text-base transition-all shadow-[0_4px_20px_rgba(211,84,0,0.25)] hover:shadow-[0_6px_25px_rgba(211,84,0,0.35)] text-center cursor-pointer flex items-center justify-center gap-2 group"
                  >
                    <span>Lihat Katalog & Pesan</span>
                    <UtensilsCrossed className="w-4 h-4 group-hover:rotate-12 transition-transform shrink-0" />
                  </motion.button>

                </div>
              </div>

              {/* Delicious Hero Product Photo */}
              <div className="w-full lg:w-1/2">
                <div className="relative aspect-[3/4] max-w-md mx-auto lg:max-w-none rounded-3xl overflow-hidden shadow-2xl group border-4 border-white">
                  <img
                    className="w-full h-full object-cover transform group-hover:scale-[1.03] transition-transform duration-700"
                    alt="Daging Sapi Lada Hitam MAM"
                    src={heroSapiLadaHitam}
                    referrerPolicy="no-referrer"
                  />
                  {/* Subtle Elegant Badge Overlay */}
                  <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-outline-variant/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-terracotta font-bold uppercase tracking-wider">Highlight Menu</p>
                      <h4 className="text-sm md:text-base font-bold text-espresso-dark">Daging Sapi Lada Hitam</h4>
                    </div>
                    <span className="text-sm font-bold text-terracotta bg-terracotta/10 px-3 py-1 rounded-full">Rp 55.000</span>
                  </div>
                </div>
              </div>
            </section>

            {/* FEATURED SLIDE MENU SECTION ON HOME PAGE */}
            <section className="px-6 py-12 max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                  <span className="text-xs font-bold text-terracotta tracking-widest uppercase">Spesial Hari Ini</span>
                  <h2 className="text-3xl font-extrabold text-espresso-dark mt-1">Menu Pilihan MAM</h2>
                  <p className="text-sm md:text-base text-espresso-dark/70 mt-1">Geser untuk melihat kreasi rasa Nusantara terfavorit kami.</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-espresso-dark/50 hidden sm:inline font-medium">Geser menu &rarr;</span>
                  <button
                    onClick={() => scrollMenu(homeMenuScrollRef, "left")}
                    className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 text-espresso-dark hover:bg-terracotta hover:text-white transition-all shadow-xs flex items-center justify-center cursor-pointer active:scale-95"
                    title="Geser Kiri"
                    aria-label="Geser Kiri"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => scrollMenu(homeMenuScrollRef, "right")}
                    className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 text-espresso-dark hover:bg-terracotta hover:text-white transition-all shadow-xs flex items-center justify-center cursor-pointer active:scale-95"
                    title="Geser Kanan"
                    aria-label="Geser Kanan"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Horizontal Slider Carousel for Home Page */}
              <div 
                ref={homeMenuScrollRef}
                className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-8 pt-3 px-1 hide-scrollbar scroll-smooth"
              >
                {menuItems.map((item, index) => {
                  const itemStock = item.stock ?? 50;
                  const isOut = itemStock <= 0;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 24, scale: 0.95 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true, margin: "-30px" }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.07,
                        ease: [0.25, 0.1, 0.25, 1.0],
                      }}
                      whileHover={{ 
                        y: -8, 
                        scale: 1.015,
                        transition: { duration: 0.25, ease: "easeOut" }
                      }}
                      className="flex-none w-[280px] sm:w-[320px] md:w-[350px] snap-start bg-white rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(44,27,18,0.04)] hover:shadow-[0_16px_36px_rgba(44,27,18,0.12)] border border-outline-variant/25 transition-all duration-300 flex flex-col group relative"
                    >
                      {item.featured && (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + index * 0.05 }}
                          className="absolute top-4 left-4 bg-terracotta text-soft-cream font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-lg z-10 flex items-center gap-1 shadow-md border border-white/20"
                        >
                          <Star className="w-3.5 h-3.5 fill-current animate-pulse" />
                          <span>Best Seller</span>
                        </motion.div>
                      )}

                      <div 
                        onClick={() => handleOpenDetail(item)}
                        className="relative overflow-hidden cursor-pointer bg-espresso-dark/5 shrink-0 w-full h-48 md:h-52"
                      >
                        <img
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                          alt={item.name}
                          src={item.image}
                        />

                        {/* Stock badge overlay */}
                        <div className="absolute bottom-3 right-3 z-10">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-xs backdrop-blur-md ${
                              isOut
                                ? "bg-red-600/90 text-white border-red-500"
                                : itemStock < 10
                                ? "bg-amber-500/90 text-white border-amber-400"
                                : "bg-black/60 text-white border-white/20"
                            }`}
                          >
                            {isOut ? "Stok Habis" : `Stok: ${itemStock}`}
                          </span>
                        </div>

                        <div className="absolute inset-0 bg-espresso-dark/25 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-xs">
                          <motion.span 
                            whileHover={{ scale: 1.08 }}
                            className="bg-white/95 text-espresso-dark px-4 py-2 rounded-full font-bold text-xs shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300"
                          >
                            Lihat Detail
                          </motion.span>
                        </div>
                      </div>

                      <div className="p-5 flex flex-col justify-between flex-grow">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-terracotta font-bold uppercase tracking-wider">
                              {item.category}
                            </span>
                          </div>
                          <h3 
                            onClick={() => handleOpenDetail(item)}
                            className="text-lg font-bold text-espresso-dark hover:text-terracotta transition-colors cursor-pointer leading-snug line-clamp-2"
                          >
                            {item.name}
                          </h3>
                          <p className="text-xs text-espresso-dark/70 mt-1 mb-3 leading-relaxed line-clamp-2">
                            {item.desc}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20 mt-auto">
                          <span className="text-base font-extrabold text-terracotta">
                            {formatIDR(item.price)}
                          </span>
                          
                          <motion.button
                            whileHover={{ scale: 1.1, backgroundColor: "#D35400", color: "#FDFBF7" }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handleQuickAdd(item)}
                            disabled={isOut}
                            className={`font-bold px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 flex items-center gap-1 cursor-pointer shadow-xs ${
                              isOut 
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                                : "bg-terracotta/10 text-terracotta"
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span>{isOut ? "Habis" : "Tambah"}</span>
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>

            {/* USP SECTION - BRAND VALUES */}
            <section className="px-6 py-12 max-w-7xl mx-auto bg-surface-container-low rounded-[32px] shadow-[0_4px_30px_rgba(44,27,18,0.02)] border border-outline-variant/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto">
                <div className="flex flex-col items-center gap-4 p-4">
                  <div className="w-14 h-14 bg-terracotta/10 rounded-full flex items-center justify-center text-terracotta shadow-xs">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-espresso-dark">100% Halal & Segar</h3>
                  <p className="text-sm md:text-base text-espresso-dark/70 leading-relaxed">
                    Setiap porsi diolah dari bahan baku pilihan dan segar, bersertifikat halal 100%.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-4 p-4 border-y md:border-y-0 md:border-x border-outline-variant/20">
                  <div className="w-14 h-14 bg-terracotta/10 rounded-full flex items-center justify-center text-terracotta shadow-xs">
                    <Clock className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-espresso-dark">Higenis & Cepat</h3>
                  <p className="text-sm md:text-base text-espresso-dark/70 leading-relaxed">
                    Diproduksi dengan standar kebersihan tinggi, siap dihangatkan dalam 3 menit.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-4 p-4">
                  <div className="w-14 h-14 bg-terracotta/10 rounded-full flex items-center justify-center text-terracotta shadow-xs">
                    <Truck className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-espresso-dark">Siap Kirim / Ambil</h3>
                  <p className="text-sm md:text-base text-espresso-dark/70 leading-relaxed">
                    Pengemasan yang apik dan rapat untuk dinikmati dengan praktis di mana saja.
                  </p>
                </div>
              </div>
            </section>

            {/* BRAND STORY */}
            <section className="px-6 py-16 md:py-24 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 md:gap-16">
              <div className="w-full lg:w-5/12 aspect-[4/5] rounded-3xl overflow-hidden shadow-xl relative order-last lg:order-first">
                <img
                  className="w-full h-full object-cover"
                  alt="Minimalist modern food lifestyle"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaM1WwtTXydeNX4KaeAd_6CoyTpwThCe44u9Jry_eAZ8zskdyBYXhUxLo-vtcFOMQYERZt1u7oSqB-HfpI6219oSOMiW690XiP1UYKUAG3lPVJdCMQx2WeJKhIqmbpy0doCAhr0xqoUCCmOfYCmqeuRYME6xVAy0ntrZsxj9nPPyNU313y1aF8iASLSUNcvRqSh9iOegQO4cMKLo7i25ggNICpKJUNSHuJNt8KIGqwaVF1ntc3OzTqbQ"
                />
              </div>
              <div className="w-full lg:w-7/12 flex flex-col gap-6">
                <span className="text-xs font-bold text-terracotta tracking-widest uppercase">Cerita Kami</span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-espresso-dark tracking-tight leading-snug">
                  Makanan enak. Tanpa pusing.
                </h2>
                <div className="flex flex-col gap-5 text-espresso-dark/85 leading-relaxed">
                  <p className="text-base md:text-lg">
                    Kami percaya bahwa makan enak tidak harus mengorbankan waktu berharga dan kesehatan Anda. MAM hadir untuk memberikan nutrisi harian tanpa repot menyiapkan peralatan dapur dan mencuci piring kotor.
                  </p>
                  <p className="text-sm md:text-base opacity-90">
                    Setiap hidangan diracik dengan penuh perhatian oleh tim koki profesional kami, menggunakan bumbu rempah Nusantara asli pilihan. Kami yang mengurus dapur agar Anda bisa fokus mengurus keseharian dan hobi Anda dengan maksimal.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setCurrentTab("menu")}
                    className="border-b-2 border-terracotta text-terracotta font-bold pb-1 hover:text-espresso-dark hover:border-espresso-dark transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>Eksplorasi Menu Kami</span>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>

            {/* UNBOXING EXPERIENCE - BENTO GRID */}
            <section className="px-6 py-12 max-w-7xl mx-auto">
              <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                  <span className="text-xs font-bold text-terracotta tracking-widest uppercase">Premium Packaging</span>
                  <h2 className="text-3xl font-extrabold text-espresso-dark mt-1">Unboxing MAM</h2>
                </div>
                <p className="text-sm md:text-base text-espresso-dark/70 max-w-md">
                  Dikemas rapi, higenis, dan kedap udara untuk menjaga kesegaran rasa, nutrisi, dan tampil cantik di dalam kulkas Anda.
                </p>
              </div>

              {/* Bento Grid Design */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Large Main Box */}
                <div className="md:col-span-2 rounded-2xl overflow-hidden relative group aspect-video md:aspect-[16/10] border border-outline-variant/10 shadow-md">
                  <img
                    className="w-full h-full object-cover transform group-hover:scale-[1.02] transition-transform duration-700"
                    alt="Premium Kraft Paper Box MAM"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAkhkRfznJOMRpfUJCGVxMbnWiOESQDhsMVbwSuuCbGHlm773YM8K6a6w6VqRZRtPTY_VXIt5rGOzHKuTVddVTy73Y7i-YOrFnuDnNUKPfbkZxvx6QGuqZ4qHLD6hJYTomIFwSgk7z51DwGFgsu0eutlinEKBq517JEkmxgGBDN1p6eYC57YCPBOzBqihfT0SuQsC_ZsvxYGFjZPUqci9Q8uVDOYjBZySOYdiQLHq5NvUqgqyabyUpAg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso-dark/70 via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-6 left-6 text-soft-cream">
                    <h3 className="text-xl font-bold">Kemasan Praktis & Higenis</h3>
                    <p className="text-sm opacity-90 mt-1">Pengalaman membuka kotak yang menyenangkan dengan segel aman.</p>
                  </div>
                </div>

                {/* Vertical Small Block 1 */}
                <div className="rounded-2xl overflow-hidden relative group aspect-square md:aspect-auto border border-outline-variant/10 shadow-md">
                  <img
                    className="w-full h-full object-cover transform group-hover:scale-[1.02] transition-transform duration-700"
                    alt="Close up of food container"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcWJwWStrQep_oOalLrYS-y_EQf3Imdf8A-_ZBeHnDKjuw3Iv9woAY66cl_GNPZk2NsKsPgd1aRKJez6QSVe4BRG-YlaRzFe1RJm4z_dXNhySaIbPnIG3Bppr157D0OrkWchUXwkvTQAHFbiBEnN3SHQ7FIZGTZ_Jy6iNpPnnN406prP2pPA7I8XsGOM4WEwOU-a2syDE72ZhXefXjb9JqT6UrUIhkm7Og0oyjLuXhnycIffm6P1MLCw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso-dark/60 to-transparent" />
                  <div className="absolute bottom-6 left-6 text-soft-cream">
                    <h3 className="text-lg font-bold">Food-Grade Materials</h3>
                  </div>
                </div>
              </div>
            </section>

            {/* HOW IT WORKS SECTION */}
            <section className="px-6 py-16 max-w-7xl mx-auto border-t border-outline-variant/20">
              <span className="text-xs font-bold text-terracotta tracking-widest uppercase block text-center mb-2">Langkah Mudah</span>
              <h2 className="text-3xl font-extrabold text-espresso-dark text-center mb-16">Bagaimana Cara Pemesanan?</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
                {/* Stepper Grid Items */}
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-terracotta/10 flex items-center justify-center border-2 border-terracotta text-2xl font-extrabold text-terracotta shadow-xs">
                    1
                  </div>
                  <h3 className="text-lg font-bold text-espresso-dark">Pilih Menu</h3>
                  <p className="text-sm text-espresso-dark/70 leading-relaxed">
                    Eksplorasi dan pilih kuliner Nusantara favorit Anda di daftar menu.
                  </p>
                </div>

                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-terracotta/10 flex items-center justify-center border-2 border-terracotta text-2xl font-extrabold text-terracotta shadow-xs">
                    2
                  </div>
                  <h3 className="text-lg font-bold text-espresso-dark">Pesan Online</h3>
                  <p className="text-sm text-espresso-dark/70 leading-relaxed">
                    Konfirmasi pesanan instan langsung via formulir WhatsApp kami yang praktis.
                  </p>
                </div>

                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-terracotta/10 flex items-center justify-center border-2 border-terracotta text-2xl font-extrabold text-terracotta shadow-xs">
                    3
                  </div>
                  <h3 className="text-lg font-bold text-espresso-dark">Hangatkan</h3>
                  <p className="text-sm text-espresso-dark/70 leading-relaxed">
                    Terima porsi segar Anda, cukup hangatkan 3 menit di microwave/kukusan.
                  </p>
                </div>

                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-terracotta text-soft-cream rounded-full flex items-center justify-center border-2 border-terracotta text-2xl font-extrabold shadow-md">
                    4
                  </div>
                  <h3 className="text-lg font-bold text-espresso-dark">Siap Dinikmati</h3>
                  <p className="text-sm text-espresso-dark/70 leading-relaxed">
                    Selamat menikmati sajian nikmat kaya rasa bersama orang tercinta Anda!
                  </p>
                </div>
              </div>
            </section>

            {/* LOCATION & HOURS SECTION */}
            <section id="lokasi-section" className="px-6 py-16 bg-surface-container-lowest border-y border-outline-variant/20 scroll-mt-20">
              <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 items-center">
                <div className="w-full lg:w-1/2 flex flex-col gap-6">
                  <div>
                    <span className="text-xs font-bold text-terracotta tracking-widest uppercase">Hubungi & Kunjungi</span>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-espresso-dark mt-1">Kunjungi Kedai Kami</h2>
                    <p className="text-base text-espresso-dark/70 mt-4 leading-relaxed">
                      Nikmati suasana hangat, wangi aroma dapur, dan pelayanan ramah langsung di outlet kami, atau pesan untuk bawa pulang (takeaway).
                    </p>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-terracotta/10 flex items-center justify-center text-terracotta shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-espresso-dark text-sm uppercase tracking-wider">Jam Operasional</h4>
                      <p className="text-sm text-espresso-dark/70 mt-1">Setiap Hari: 09.00 - 21.00 WIB</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-terracotta/10 flex items-center justify-center text-terracotta shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-espresso-dark text-sm uppercase tracking-wider">Lokasi Kami</h4>
                      <p className="text-sm text-espresso-dark/70 mt-1 leading-relaxed">
                        Jl. Kuliner Nusantara No. 88,<br />
                        Kawasan Selatan, Surabaya, Jawa Timur 60234
                      </p>
                    </div>
                  </div>
                </div>

                {/* Simulated Google Map */}
                <div className="w-full lg:w-1/2">
                  <div className="w-full h-80 rounded-3xl overflow-hidden shadow-lg border border-outline-variant/30 relative flex items-center justify-center">
                    {/* Simulated Map Visual using a beautiful warm canvas vector map style background */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center filter saturate-[0.8]"
                      style={{
                        backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCTRLD0izvn6P5-SjQVYveHO0Nss9oSN4wDU2BRawudi_lpzLS_ik9BKF9IQoCDohCtqZpFdA6MF2FOZFQfbZwHD1qVInF-T1zFmqiqfkmZ6zd3fZOSjUTSvWRZvFkesiTTg6btlDvLqOiQQCXdkyiQSMFE1cKSA8BEF_oHiAhzUFkHii7NwjZi01mz8hwlsIqLr2TfIUxvzlxJS9y4dsPQBCfRr970Cjy1JH9agvdM1DkyU3ra6M3tsw')"
                      }}
                    />
                    
                    {/* Pin Map overlay card */}
                    <div className="z-10 bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-xl text-center border border-outline-variant/20 max-w-[280px]">
                      <MapPin className="w-10 h-10 text-terracotta mx-auto mb-2 animate-bounce" />
                      <h5 className="font-bold text-base text-espresso-dark">MAM Culinary Heritage</h5>
                      <p className="text-xs text-espresso-dark/60 mt-1 mb-3">Surabaya, Indonesia</p>
                      <a 
                        href="https://maps.google.com" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="bg-terracotta text-soft-cream font-semibold text-xs px-4 py-2 rounded-full inline-block hover:opacity-90 transition-all shadow-xs"
                      >
                        Buka di Google Maps
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* INTENDED FAQ ACCORDION SECTION */}
            <section id="faq-section" className="px-6 py-16 max-w-3xl mx-auto scroll-mt-20">
              <span className="text-xs font-bold text-terracotta tracking-widest uppercase block text-center mb-2">Butuh Bantuan?</span>
              <h2 className="text-3xl font-extrabold text-espresso-dark text-center mb-10">Pertanyaan yang Sering Diajukan</h2>
              
              <div className="flex flex-col border-t border-outline-variant/30">
                {FAQS.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div key={index} className="border-b border-outline-variant/30 py-5">
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="w-full flex justify-between items-center text-left text-espresso-dark hover:text-terracotta font-bold text-base md:text-lg focus:outline-none cursor-pointer"
                      >
                        <span>{faq.question}</span>
                        <ChevronDown 
                          className={`w-5 h-5 text-espresso-dark/50 transition-transform duration-300 shrink-0 ${
                            isOpen ? "rotate-180 text-terracotta" : ""
                          }`} 
                        />
                      </button>
                      
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="pt-3 text-sm md:text-base text-espresso-dark/75 leading-relaxed">
                              {faq.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* FINAL CTA BANNER */}
            <section className="px-6 py-12 text-center max-w-7xl mx-auto mb-16">
              <div className="bg-espresso-dark text-soft-cream rounded-[32px] p-8 md:p-16 flex flex-col items-center gap-6 relative overflow-hidden border border-outline-variant/10 shadow-2xl">
                {/* Ambient decorations */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-terracotta/10 rounded-full filter blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-terracotta/5 rounded-full filter blur-3xl" />

                <span className="text-xs font-bold text-terracotta tracking-widest uppercase">MAM Premium</span>
                <h2 className="text-3xl md:text-5xl font-extrabold max-w-2xl leading-tight">
                  Biar kami yang mengurus hidangan harian Anda.
                </h2>
                
                <p className="text-sm md:text-base text-soft-cream/80 max-w-md leading-relaxed">
                  Hemat waktu memasak Anda dan nikmati kelezatan rasa autentik Nusantara bersama keluarga sekarang juga.
                </p>

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentTab("menu")}
                  className="bg-terracotta text-soft-cream px-10 py-4 rounded-full font-bold text-base hover:shadow-xl transition-all shadow-lg mt-2 cursor-pointer"
                >
                  Pesan Hidangan Mingguan
                </motion.button>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: MENU CATALOG SECTION */}
        {currentTab === "menu" && (
          <div className="px-6 py-8 max-w-7xl mx-auto animate-fade-in">
            {/* Header Title */}
            <div className="mb-8 text-center md:text-left">
              <span className="text-xs font-bold text-terracotta tracking-widest uppercase">Segar & Praktis</span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-espresso-dark mt-1">Katalog Menu Kami</h1>
              <p className="text-sm md:text-base text-espresso-dark/70 mt-2">Pilih menu Nusantara favorit dan sesuaikan dengan keinginan Anda.</p>
            </div>

            {/* Filter Pill-Tabs & Carousel Navigation Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-outline-variant/10">
              {/* Filter Pill-Tabs */}
              <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1 max-w-full">
                {["Semua", "Makanan Utama", "Frozen Food"].map((cat) => (
                  <motion.button
                    key={cat}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      activeCategory === cat
                        ? "bg-terracotta text-soft-cream shadow-md"
                        : "bg-surface-container-high/60 text-espresso-dark hover:bg-espresso-dark/5"
                    }`}
                  >
                    {cat}
                  </motion.button>
                ))}
              </div>

              {/* Slide Navigation Buttons */}
              <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                <span className="text-xs text-espresso-dark/50 hidden sm:inline font-medium">Geser menu &rarr;</span>
                <button
                  onClick={() => scrollMenu(menuScrollRef, "left")}
                  className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 text-espresso-dark hover:bg-terracotta hover:text-white transition-all shadow-xs flex items-center justify-center cursor-pointer active:scale-95"
                  title="Geser Kiri"
                  aria-label="Geser Kiri"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollMenu(menuScrollRef, "right")}
                  className="w-10 h-10 rounded-full bg-white border border-outline-variant/30 text-espresso-dark hover:bg-terracotta hover:text-white transition-all shadow-xs flex items-center justify-center cursor-pointer active:scale-95"
                  title="Geser Kanan"
                  aria-label="Geser Kanan"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Horizontal Slide Carousel Menu Catalog */}
            <div 
              ref={menuScrollRef}
              className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-8 pt-2 hide-scrollbar scroll-smooth"
            >
              {filteredMenu.map((item) => {
                const itemStock = item.stock ?? 50;
                const isOut = itemStock <= 0;

                return (
                  <div
                    key={item.id}
                    className="flex-none w-[280px] sm:w-[320px] md:w-[360px] snap-start bg-white rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(44,27,18,0.04)] hover:shadow-xl hover:-translate-y-1 border border-outline-variant/25 transition-all duration-300 flex flex-col group relative"
                  >
                    {/* Best Seller Overlay badge */}
                    {item.featured && (
                      <div className="absolute top-4 left-4 bg-terracotta text-soft-cream font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg z-10 flex items-center gap-1 shadow-sm">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>Best Seller</span>
                      </div>
                    )}

                    {/* Product Image Clickable to trigger detail modal */}
                    <div 
                      onClick={() => handleOpenDetail(item)}
                      className="relative overflow-hidden cursor-pointer bg-espresso-dark/5 shrink-0 w-full h-48 md:h-52"
                    >
                      <img
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        alt={item.name}
                        src={item.image}
                      />

                      {/* Stock badge overlay */}
                      <div className="absolute bottom-3 right-3 z-10">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-xs backdrop-blur-md ${
                            isOut
                              ? "bg-red-600/90 text-white border-red-500"
                              : itemStock < 10
                              ? "bg-amber-500/90 text-white border-amber-400"
                              : "bg-black/60 text-white border-white/20"
                          }`}
                        >
                          {isOut ? "Stok Habis" : `Stok: ${itemStock}`}
                        </span>
                      </div>

                      <div className="absolute inset-0 bg-espresso-dark/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                        <span className="bg-white/95 text-espresso-dark px-4 py-2 rounded-full font-bold text-xs shadow-md">
                          Lihat Detail & Tambahan
                        </span>
                      </div>
                    </div>

                    {/* Food Card details */}
                    <div className="p-6 flex flex-col justify-between flex-grow">
                      <div>
                        <span className="text-xs text-terracotta font-bold uppercase tracking-wider block mb-1">
                          {item.category}
                        </span>
                        <h3 
                          onClick={() => handleOpenDetail(item)}
                          className="text-xl font-bold text-espresso-dark hover:text-terracotta transition-colors cursor-pointer leading-snug line-clamp-2"
                        >
                          {item.name}
                        </h3>
                        <p className="text-xs md:text-sm text-espresso-dark/70 mt-2 mb-4 leading-relaxed line-clamp-2">
                          {item.desc}
                        </p>
                      </div>

                      {/* Bottom row: Price tag & actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20 mt-auto">
                        <span className="text-lg md:text-xl font-extrabold text-terracotta">
                          {formatIDR(item.price)}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {/* Quick Add Button */}
                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handleQuickAdd(item)}
                            disabled={isOut}
                            className={`font-bold px-4 py-2 rounded-full text-xs md:text-sm transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-xs ${
                              isOut
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-terracotta/10 text-terracotta hover:bg-terracotta hover:text-soft-cream hover:shadow-md"
                            }`}
                          >
                            <Plus className="w-4 h-4 shrink-0" />
                            <span>{isOut ? "Habis" : "Tambah"}</span>
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Catalog Info Warning */}
            <div className="mt-16 bg-surface-container-high/40 p-6 rounded-2xl max-w-3xl mx-auto flex gap-4 items-center border border-outline-variant/15 text-xs md:text-sm text-espresso-dark/85">
              <span className="w-2.5 h-2.5 rounded-full bg-terracotta shrink-0 animate-ping" />
              <p>
                <strong>💡 Info Kustomisasi:</strong> Klik pada foto atau judul hidangan di atas untuk menambahkan ekstra sambal matah, sate lilit, atau telur asin khusus sesuai selera Anda!
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: CHECKOUT / CART SUMMARY */}
        {currentTab === "checkout" && (
          <div className="px-6 py-8 max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-extrabold text-espresso-dark mb-8 text-center md:text-left">Pesanan Anda</h1>
            
            {cart.length === 0 ? (
              /* Empty Cart view */
              <div className="bg-white rounded-3xl p-12 text-center border border-outline-variant/20 shadow-md max-w-lg mx-auto flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-terracotta/10 flex items-center justify-center text-terracotta animate-bounce">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-espresso-dark">Keranjang Belanja Kosong</h3>
                  <p className="text-sm text-espresso-dark/60 mt-2 leading-relaxed">
                    Anda belum memilih hidangan apapun. Silakan kunjungi katalog menu kami yang lezat untuk memulai pemesanan.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentTab("menu")}
                  className="bg-terracotta text-soft-cream px-8 py-3 rounded-full font-bold text-sm shadow-md hover:opacity-95 transition-all cursor-pointer"
                >
                  Lihat Katalog Menu
                </button>
              </div>
            ) : (
              /* Full Cart View & Checkout Form */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* List of Cart Items */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(44,27,18,0.03)] border border-outline-variant/20">
                    <h2 className="text-lg font-bold text-espresso-dark mb-4 border-b border-outline-variant/20 pb-3 flex items-center gap-2">
                      <BagIcon className="w-5 h-5 text-terracotta" />
                      <span>Ringkasan Hidangan</span>
                    </h2>

                    <div className="flex flex-col gap-6 divide-y divide-outline-variant/15">
                      {cart.map((item) => (
                        <div key={item.id} className="flex gap-4 pt-4 first:pt-0 items-start">
                          <img
                            className="w-16 h-16 object-cover rounded-xl shrink-0 border border-outline-variant/10"
                            alt={item.menuItem.name}
                            src={item.menuItem.image}
                          />
                          <div className="flex-1">
                            <h3 className="font-bold text-sm md:text-base text-espresso-dark leading-snug">
                              {item.menuItem.name}
                            </h3>
                            
                            {/* Display Customizations if any */}
                            {item.selectedOptions.length > 0 && (
                              <p className="text-xs text-espresso-dark/60 mt-1 italic">
                                + {item.selectedOptions.map((o) => o.name).join(", ")}
                              </p>
                            )}

                            <p className="text-sm font-extrabold text-terracotta mt-1.5">
                              {formatIDR(item.unitPrice * item.quantity)}
                              <span className="text-xs font-normal text-espresso-dark/50 ml-1">
                                ({formatIDR(item.unitPrice)} / porsi)
                              </span>
                            </p>
                          </div>

                          {/* Stepper Quantities */}
                          <div className="flex items-center gap-2.5 bg-soft-cream rounded-full px-2 py-1 border border-outline-variant/20 shrink-0">
                            <motion.button
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.8 }}
                              onClick={() => handleUpdateCartQuantity(item.id, -1)}
                              className="text-espresso-dark/70 hover:text-terracotta p-1 transition-colors cursor-pointer"
                              aria-label="Kurangi porsi"
                            >
                              <Minus className="w-4 h-4" />
                            </motion.button>
                            <span className="font-bold text-sm w-4 text-center select-none">
                              {item.quantity}
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.8 }}
                              onClick={() => handleUpdateCartQuantity(item.id, 1)}
                              className="text-espresso-dark/75 hover:text-terracotta p-1 transition-colors cursor-pointer"
                              aria-label="Tambah porsi"
                            >
                              <Plus className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Calculating Totals block */}
                    <div className="border-t border-outline-variant/20 pt-4 mt-6">
                      <div className="flex justify-between items-center text-sm mb-2 text-espresso-dark/70">
                        <span>Subtotal Hidangan</span>
                        <span>{formatIDR(totalPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mb-3 text-espresso-dark/70">
                        <div className="flex items-center gap-1.5">
                          <span>Ongkos Kirim (Flat)</span>
                          <span className="text-[10px] font-bold text-wasabi-green bg-wasabi-green/10 px-2 py-0.5 rounded-md uppercase">
                            Flat Rate
                          </span>
                        </div>
                        <span className="font-semibold text-espresso-dark">
                          {formatIDR(SHIPPING_FEE)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-outline-variant/20 font-extrabold text-base md:text-lg text-espresso-dark">
                        <span>Total Pembayaran</span>
                        <span className="text-terracotta">{formatIDR(grandTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCurrentTab("menu")}
                    className="w-full py-3 border border-dashed border-terracotta/40 text-terracotta hover:border-terracotta hover:bg-terracotta/5 font-bold rounded-2xl transition-all text-sm md:text-base flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Menu Hidangan Lain</span>
                  </motion.button>
                </div>

                {/* Delivery Customer Details Form */}
                <div className="lg:col-span-5">
                  <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(44,27,18,0.03)] border border-outline-variant/20">
                    <h2 className="text-lg font-bold text-espresso-dark mb-4 border-b border-outline-variant/20 pb-3 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-terracotta" />
                      <span>Detail Pengiriman</span>
                    </h2>

                    <form onSubmit={handlePayWithMidtrans} className="flex flex-col gap-5">
                      <div>
                        <label className="block text-xs font-bold text-espresso-dark uppercase tracking-wider mb-2" htmlFor="nama">
                          Nama Lengkap <span className="text-terracotta">*</span>
                        </label>
                        <input
                          id="nama"
                          type="text"
                          required
                          value={customerDetails.fullName}
                          onChange={(e) => setCustomerDetails({ ...customerDetails, fullName: e.target.value })}
                          placeholder="Masukkan nama lengkap Anda"
                          className="w-full bg-soft-cream/40 border border-outline/30 focus:border-terracotta focus:ring-1 focus:ring-terracotta rounded-xl px-4 py-3 text-sm md:text-base outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-espresso-dark uppercase tracking-wider mb-2" htmlFor="phone">
                          Nomor Handphone / WhatsApp <span className="text-terracotta">*</span>
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          required
                          value={customerDetails.phone}
                          onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                          placeholder="Contoh: 081234567890"
                          className="w-full bg-soft-cream/40 border border-outline/30 focus:border-terracotta focus:ring-1 focus:ring-terracotta rounded-xl px-4 py-3 text-sm md:text-base outline-none transition-colors"
                        />
                      </div>

                      {/* Delivery Date Selection (Open PO H-1) */}
                      <div className="bg-terracotta/5 border border-terracotta/20 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-terracotta" />
                          <label className="text-xs font-bold text-espresso-dark uppercase tracking-wider">
                            Tanggal Pengiriman (Pre-Order) <span className="text-terracotta">*</span>
                          </label>
                        </div>

                        {/* Cutoff Status Notice Banner */}
                        <div className={`p-3 rounded-xl mb-3 text-xs leading-relaxed flex items-start gap-2 ${
                          deliveryDateData.isPastCutoff 
                            ? "bg-amber-500/10 text-amber-900 border border-amber-500/20"
                            : "bg-wasabi-green/15 text-muted-herb border border-wasabi-green/30"
                        }`}>
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-terracotta" />
                          <div>
                            {deliveryDateData.isPastCutoff ? (
                              <span>
                                <strong>🌙 Lewat Jam 20.00 WIB:</strong> Pesanan setelah jam 8 malam tidak bisa dikirim besok. Pengiriman tercepat adalah <strong>Besok Lusa ({deliveryDateData.earliestDate})</strong>.
                              </span>
                            ) : (
                              <span>
                                <strong>⏰ Open PO H-1 (Cut-off Jam 20.00 WIB):</strong> Pesan sebelum jam 20.00 WIB untuk dikirim <strong>Besok ({deliveryDateData.earliestDate})</strong>.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Date selection grid cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 hide-scrollbar">
                          {deliveryDateData.options.map((option) => {
                            const isSelected = customerDetails.deliveryDate === option.fullFormatted;
                            return (
                              <motion.button
                                key={option.fullFormatted}
                                type="button"
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setCustomerDetails({ ...customerDetails, deliveryDate: option.fullFormatted })}
                                className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                                  isSelected
                                    ? "bg-terracotta text-soft-cream border-terracotta shadow-xs font-bold"
                                    : "bg-white text-espresso-dark border-outline-variant/30 hover:border-terracotta/50 hover:bg-terracotta/5"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className={`text-[11px] ${isSelected ? "text-soft-cream/90" : "text-espresso-dark/60 font-medium"}`}>
                                    {option.dayName}
                                  </span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-soft-cream shrink-0" />}
                                </div>
                                <span className="text-xs font-extrabold mt-0.5">
                                  {option.dateFormatted}
                                </span>
                                {option.tag && (
                                  <span className={`mt-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold text-center inline-block ${
                                    isSelected
                                      ? "bg-white/20 text-soft-cream"
                                      : "bg-terracotta/10 text-terracotta"
                                  }`}>
                                    {option.tag}
                                  </span>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-espresso-dark/70 mt-2 font-medium">
                          Dipilih: <strong className="text-terracotta">{customerDetails.deliveryDate || "Belum dipilih"}</strong>
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-espresso-dark uppercase tracking-wider mb-2" htmlFor="alamat">
                          Alamat Pengiriman Lengkap <span className="text-terracotta">*</span>
                        </label>
                        <textarea
                          id="alamat"
                          required
                          rows={3}
                          value={customerDetails.deliveryAddress}
                          onChange={(e) => setCustomerDetails({ ...customerDetails, deliveryAddress: e.target.value })}
                          placeholder="Masukkan nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
                          className="w-full bg-soft-cream/40 border border-outline/30 focus:border-terracotta focus:ring-1 focus:ring-terracotta rounded-xl px-4 py-3 text-sm md:text-base outline-none transition-colors resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-espresso-dark uppercase tracking-wider mb-2" htmlFor="catatan">
                          Catatan Tambahan <span className="text-espresso-dark/40 font-normal">(Opsional)</span>
                        </label>
                        <input
                          id="catatan"
                          type="text"
                          value={customerDetails.notes}
                          onChange={(e) => setCustomerDetails({ ...customerDetails, notes: e.target.value })}
                          placeholder="Cth: Sambal dipisah, ekstra garpu"
                          className="w-full bg-soft-cream/40 border border-outline/30 focus:border-terracotta focus:ring-1 focus:ring-terracotta rounded-xl px-4 py-3 text-sm md:text-base outline-none transition-colors"
                        />
                      </div>

                      <div className="pt-2 space-y-3">
                        <motion.button
                          type="submit"
                          disabled={isProcessingPayment}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.96 }}
                          className="w-full bg-terracotta text-soft-cream font-extrabold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-base group disabled:opacity-60"
                        >
                          <CreditCard className="w-5 h-5 group-hover:scale-110 transition-transform shrink-0" />
                          <span>
                            {isProcessingPayment ? "Memproses Pembayaran..." : "Bayar Sekarang (Midtrans Snap)"}
                          </span>
                        </motion.button>

                        <div className="flex items-center justify-center gap-1.5 text-[11px] text-espresso-dark/60 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Mendukung QRIS, BCA/Mandiri/BRI VA, GoPay, ShopeePay & Kartu</span>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </main>

      {/* Floating Bottom Cart Bar & Order Summary */}
      {totalItemsCount > 0 && currentTab !== "checkout" && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-outline-variant/30 p-4 shadow-[0_-8px_30px_rgba(44,27,18,0.12)] animate-slide-up transition-all">
          <div className="max-w-7xl mx-auto flex flex-col gap-3">
            
            {/* Header: Daftar Orderan yang Sudah Ditambah */}
            <div className="flex flex-col gap-1.5 pb-2 border-b border-outline-variant/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-terracotta uppercase tracking-wider bg-terracotta/10 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 shrink-0" />
                    <span>Orderan Ditambahkan ({totalItemsCount} item)</span>
                  </span>
                  <button
                    onClick={() => setIsBottomCartExpanded(!isBottomCartExpanded)}
                    className="text-xs text-espresso-dark/60 hover:text-terracotta font-semibold underline flex items-center gap-0.5 cursor-pointer ml-1"
                  >
                    <span>{isBottomCartExpanded ? "Sembunyikan" : "Rincian Menu"}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isBottomCartExpanded ? "rotate-180" : ""}`} />
                  </button>
                </div>
                <span className="text-xs text-espresso-dark/50 hidden sm:inline">
                  + Ongkir Rp 15.000
                </span>
              </div>

              {/* Added Items List (Compact Horizontal Badge Pills or Expanded List) */}
              {!isBottomCartExpanded ? (
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-1">
                  {cart.map((cartItem) => (
                    <div
                      key={cartItem.id}
                      className="flex items-center gap-1.5 bg-surface-container-high/80 text-espresso-dark px-3 py-1 rounded-full text-xs shrink-0 border border-outline-variant/20 shadow-2xs font-medium"
                    >
                      <span className="font-extrabold text-terracotta">{cartItem.quantity}x</span>
                      <span className="truncate max-w-[130px] sm:max-w-[180px] font-semibold">{cartItem.menuItem.name}</span>
                      <span className="text-espresso-dark/50 font-normal">({formatIDR(cartItem.unitPrice * cartItem.quantity)})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 py-2 pr-1 hide-scrollbar">
                  {cart.map((cartItem) => (
                    <div
                      key={cartItem.id}
                      className="flex items-center justify-between gap-3 bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/15 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-terracotta">{cartItem.quantity}x</span>
                          <span className="font-bold text-espresso-dark truncate">{cartItem.menuItem.name}</span>
                        </div>
                        {cartItem.selectedOptions.length > 0 && (
                          <p className="text-[10px] text-espresso-dark/60 truncate pl-5">
                            + {cartItem.selectedOptions.map(o => o.name).join(", ")}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-espresso-dark">
                          {formatIDR(cartItem.unitPrice * cartItem.quantity)}
                        </span>
                        <div className="flex items-center gap-1 bg-white border border-outline-variant/30 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQuantity(cartItem.id, -1)}
                            className="w-5 h-5 flex items-center justify-center text-espresso-dark hover:bg-terracotta/10 rounded cursor-pointer"
                            title="Kurangi"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-4 text-center font-bold text-xs">{cartItem.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQuantity(cartItem.id, 1)}
                            className="w-5 h-5 flex items-center justify-center text-espresso-dark hover:bg-terracotta/10 rounded cursor-pointer"
                            title="Tambah"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Row: Total & Tombol "Bayar Sekarang" */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[11px] text-espresso-dark/50 uppercase font-bold tracking-wider">
                  Total Pembayaran
                </span>
                <span className="text-xl md:text-2xl font-black text-terracotta leading-none">
                  {formatIDR(grandTotal)}
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentTab("checkout")}
                className="bg-terracotta text-soft-cream font-extrabold text-sm md:text-base px-6 py-3 md:px-8 md:py-3.5 rounded-full flex items-center gap-2.5 shadow-[0_4px_20px_rgba(211,84,0,0.4)] hover:shadow-[0_6px_25px_rgba(211,84,0,0.5)] transition-all cursor-pointer group"
                id="btn-bayar-sekarang"
              >
                <CreditCard className="w-4 h-4 md:w-5 md:h-5 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="tracking-wide">Bayar Sekarang</span>
              </motion.button>
            </div>

          </div>
        </div>
      )}

      {/* FOOTER AREA */}
      <footer className="bg-espresso-dark text-soft-cream border-t border-outline-variant/10 mt-16 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pb-8 border-b border-soft-cream/15">
          <div className="flex flex-col gap-3">
            <MamLogo className="h-8 text-terracotta" />
            <p className="text-sm text-soft-cream/70 max-w-sm leading-relaxed">
              Solusi makan harian Anda. Hidangan autentik Nusantara yang higenis, praktis, dan lezat siap saji.
            </p>
            <span className="text-xs text-soft-cream/50 mt-1">Surabaya, Indonesia</span>
          </div>

          <nav className="flex flex-col items-start gap-3">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              <button
                onClick={() => setCurrentTab("home")}
                className="text-sm text-soft-cream/75 hover:text-terracotta transition-colors underline underline-offset-4 cursor-pointer"
              >
                Beranda
              </button>
              <button
                onClick={() => setCurrentTab("menu")}
                className="text-sm text-soft-cream/75 hover:text-terracotta transition-colors underline underline-offset-4 cursor-pointer"
              >
                Katalog Hidangan
              </button>
            </div>
            <a
              href="https://wa.me/6282233009957"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all border border-emerald-500/30 cursor-pointer no-underline"
            >
              <MessageCircle className="w-4 h-4 text-white shrink-0" />
              <span>Chat Admin</span>
            </a>
          </nav>
        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-soft-cream/40">
          <span 
            onClick={handleCopyrightClick} 
            className="cursor-pointer select-none hover:text-soft-cream/60 transition-colors"
            title="MAM Culinary Heritage"
          >
            &copy; {new Date().getFullYear()} MAM Culinary Heritage. Hak Cipta Dilindungi.
          </span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-soft-cream transition-colors">Kebijakan Privasi</a>
            <a href="#" className="hover:text-soft-cream transition-colors">Ketentuan Layanan</a>
          </div>
        </div>
      </footer>

      {/* DETAILED DIALOG MODAL / POPUP SCREEN */}
      <AnimatePresence>
        {selectedItem && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="fixed inset-0 bg-espresso-dark/60 backdrop-blur-xs z-50 cursor-pointer"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 left-1/2 -translate-x-1/2 w-full sm:max-w-md bg-soft-cream rounded-t-[32px] sm:rounded-3xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto flex flex-col border border-outline-variant/10"
            >
              {/* Image Banner of selected Item */}
              <div className="relative w-full h-56 md:h-64 bg-espresso-dark/10 shrink-0">
                <img
                  className="w-full h-full object-cover"
                  alt={selectedItem.name}
                  src={selectedItem.image}
                />
                <motion.button
                  whileHover={{ scale: 1.15, rotate: 90 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 bg-espresso-dark/60 hover:bg-espresso-dark/80 text-soft-cream p-2 rounded-full backdrop-blur-xs transition-colors cursor-pointer"
                  aria-label="Tutup detail modal"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Modal Contents */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-terracotta/10 rounded-full text-xs font-bold text-terracotta uppercase mb-2">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{selectedItem.category}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-espresso-dark">
                    {selectedItem.name}
                  </h2>
                  <p className="text-xl font-extrabold text-terracotta mt-1">
                    {formatIDR(selectedItem.price)}
                  </p>
                </div>

                <p className="text-xs md:text-sm text-espresso-dark/70 leading-relaxed mb-6 border-b border-outline-variant/15 pb-4">
                  {selectedItem.desc}
                </p>

                {/* Optional Customizations checkboxes */}
                <div className="mb-6">
                  <h4 className="font-bold text-sm text-espresso-dark mb-3 uppercase tracking-wider flex items-center justify-between">
                    <span>Tambahan Ekstra</span>
                    <span className="text-xs font-normal text-espresso-dark/40 lowercase italic">
                      (opsional)
                    </span>
                  </h4>
                  
                  <div className="flex flex-col gap-2.5">
                    {CUSTOMIZATION_OPTIONS.map((option) => {
                      const isChecked = selectedCustomizations.some((o) => o.name === option.name);
                      return (
                        <label
                          key={option.name}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked
                              ? "bg-terracotta/5 border-terracotta/50"
                              : "bg-white border-outline-variant/30 hover:border-terracotta/20"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCustomization(option)}
                              className="accent-terracotta w-4 h-4 cursor-pointer focus:ring-0"
                            />
                            <span className="text-sm font-semibold text-espresso-dark">
                              {option.name}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-espresso-dark/60">
                            +{formatIDR(option.price)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Row Quantity & CTA */}
                <div className="pt-4 border-t border-outline-variant/20 mt-auto flex flex-col sm:flex-row gap-4 items-center">
                  
                  {/* Stepper block */}
                  <div className="flex items-center justify-between w-32 h-[52px] bg-white rounded-full border border-outline-variant/20 px-2 shrink-0 shadow-xs">
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setModalQuantity((prev) => Math.max(1, prev - 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-full text-espresso-dark/60 hover:bg-espresso-dark/5 transition-all cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </motion.button>
                    <span className="font-bold text-base text-espresso-dark select-none">
                      {modalQuantity}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setModalQuantity((prev) => prev + 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-full text-terracotta hover:bg-espresso-dark/5 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </motion.button>
                  </div>

                  {/* Add to order trigger */}
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleAddToCartFromModal}
                    className="w-full sm:flex-1 h-[52px] bg-terracotta text-soft-cream font-bold rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Tambah ke Pesanan</span>
                    <span className="opacity-80 font-normal">
                      • {formatIDR(currentModalUnitPrice * modalQuantity)}
                    </span>
                  </motion.button>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Payment Result Modal (Midtrans Transaction Status) */}
      <AnimatePresence>
        {paymentResult && paymentResult.show && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPaymentResult(null)}
              className="fixed inset-0 bg-espresso-dark/60 backdrop-blur-xs z-50 cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-outline-variant/30 text-center space-y-4 m-4"
            >
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-terracotta/10 text-terracotta">
                {paymentResult.status === "success" && <Check className="w-8 h-8 text-emerald-600" />}
                {paymentResult.status === "pending" && <Clock className="w-8 h-8 text-amber-600" />}
                {paymentResult.status === "error" && <AlertCircle className="w-8 h-8 text-rose-600" />}
              </div>

              <h3 className="text-xl font-black text-espresso-dark">
                {paymentResult.status === "success" && "Pembayaran Berhasil!"}
                {paymentResult.status === "pending" && "Menunggu Pembayaran"}
                {paymentResult.status === "error" && "Pembayaran Tidak Berhasil"}
              </h3>

              {paymentResult.orderId && (
                <div className="bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20 text-xs font-mono text-espresso-dark/70">
                  ID Transaksi: <strong>{paymentResult.orderId}</strong>
                </div>
              )}

              <p className="text-xs md:text-sm text-espresso-dark/70 leading-relaxed">
                {paymentResult.message}
              </p>

              <button
                type="button"
                onClick={() => {
                  setPaymentResult(null);
                  if (paymentResult.status === "success") {
                    setCurrentTab("home");
                  }
                }}
                className="w-full bg-terracotta text-soft-cream font-bold py-3 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer text-sm"
              >
                Tutup & Lanjutkan
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating "Order Now" Button - Navigates to Food Ordering Page (Home tab only, when no items added yet) */}
      {currentTab === "home" && totalItemsCount === 0 && (
        <motion.button
          onClick={() => setCurrentTab("menu")}
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            transition: { delay: 0.5, type: "spring", stiffness: 260, damping: 20 }
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed right-6 bottom-6 z-40 bg-terracotta text-soft-cream px-5 py-3.5 rounded-full shadow-[0_8px_30px_rgba(211,84,0,0.35)] hover:shadow-[0_8px_30px_rgba(211,84,0,0.5)] flex items-center gap-2.5 font-bold text-sm md:text-base border border-white/20 transition-all duration-300 cursor-pointer"
          id="floating-order-now-btn"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <UtensilsCrossed className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
          <span className="tracking-wide uppercase text-xs md:text-sm font-extrabold">Order Now</span>
        </motion.button>
      )}

      {/* Hidden Admin Dashboard Component */}
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        menuItems={menuItems}
        onRefreshMenu={loadSupabaseProducts}
        formatIDR={formatIDR}
      />
    </div>
  );
}
