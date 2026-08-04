import { MenuItem, CustomizationOption } from "./types";

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 1,
    name: "Nasi Kotak Ayam Bakar",
    desc: "Nasi kotak lengkap dengan ayam bakar bumbu madu gurih, tahu, tempe, lalapan segar, dan sambal terasi khas.",
    price: 25000,
    stock: 50,
    category: "Makanan Utama",
    featured: true,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzART-r3H93c22LM2FiC7dNZWPDd9F5HKy1-j33bgJcHvU3I3f2ai9pLjOhNgjtqVJmuDSqgmWErv9-kAuhcOZavBkkeaxnJjZhXEUW1d2PQBaRXKMBA02mdhid6mMNV9IdqFyrLrWXbdHtXbi3K6xyeZuSciq_zjKEYKduqEQMy9XoxqKqJXUaHTXf6N3MUYAGbe6Hh_V7MzoMXseaFqM2MKCZxvEoXq37yMngnHffjPTMkOU9vaSiQ"
  },
  {
    id: 2,
    name: "Nasi Kotak Rendang",
    desc: "Nasi kotak dengan daging sapi rendang empuk bumbu rempah autentik Padang, daun singkong, dan sambal ijo.",
    price: 30000,
    stock: 30,
    category: "Makanan Utama",
    featured: true,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA6MM3T5_WGIjKLAWM-H95bYbOp3gvikdZxSAWfAzTKg8mg1FtttFc-uskXmyZn-5ejHB9yWm1ZSDMZCTwEz-v4XRdKE66k1oqzDHCAmiyHTrNWXBJCzyssgC9slb77mrNGY1KEvMlFnjNDWKAfN9XLwDB4vXMiDhqpRv7MWSmu2vzi6YkPxW2kNcQuB8xGRgC1RttOKBvlW5L0m7maCsH8wjEmqLqVKTWRe-ZeT2zlCvPCKMXetogXQQ"
  },
  {
    id: 3,
    name: "Paket Prasmanan A",
    desc: "Paket catering prasmanan lengkap untuk acara keluarga/kantor: Nasi, 2 lauk utama (Ayam & Daging), sayuran, kerupuk, dan es buah.",
    price: 75000,
    stock: 100,
    category: "Makanan Utama",
    featured: true,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBX_ei8KD0u0Vq4LtqMqK3_cCJGJ4vk33maQP1_XQnyZxMz4pq2dywkDKSwJWaqAE5y2ZnMngglJpVS1idH0aa37u66mS4BV8vsrIPbg2OkZwhFLpkKBPOC9YiQ3Mj4Hm5qqtf3dMn-a-eTPEHJWd3dj4GsNa-dpqzsmxQgXoM3f8u4tBDRrUi0DLBKofYjt3F_ROdHouwXUbR8X2abpUWS4TrR5J8tl6IRKk2UsSV7Jih4rSlRpgSdHQ"
  },
  {
    id: 4,
    name: "Nasi Campur Spesial MAM",
    desc: "Paduan nasi hangat dengan lauk pauk pilihan: ayam suwir bumbu rahasia, sate lilit, telur pindang, dan sambal matah segar.",
    price: 45000,
    stock: 50,
    category: "Makanan Utama",
    featured: false,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCZXP1jIeTbOc41gmXWiOcilnaHvbbI0yiD7IT1Q2vsQeh_ICFeVSM1Rxf4D3f1uzcrwuJsA7bbAlSOpQuQBdKbEACzjVpiw5H9gnK_AyzjRy3ylLBDYg2KUO_xogx_SAfd_qGVja_Bfs_IZyk_oXRJI8I5vnw4VdDHXoGP3jXC8Z-vYzCRZowSGNgNyzAe2AXcfC5uvRd0ZvYLf9Y9lddsb4c8rQKQljlFbJ3E92lYt2tg2CfcJUIz7A"
  },
  {
    id: 12,
    name: "Nasi Kotak Ayam Penyet Sambal Ijo",
    desc: "Nasi hangat gurih dengan ayam goreng crispy renyah dipenyet dengan sambal ijo segar, tahu, tempe, dan urap sayur rempah.",
    price: 28000,
    stock: 45,
    category: "Makanan Utama",
    featured: false,
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: 13,
    name: "Nasi Kotak Empal Serundeng",
    desc: "Nasi putih pulen berpadu empal sapi goreng gurih bertabur serundeng kelapa wangi, orek tempe, telur dadar iris, dan sambal terasi.",
    price: 32000,
    stock: 35,
    category: "Makanan Utama",
    featured: true,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: 14,
    name: "Paket Prasmanan B (Spesial Nusantara)",
    desc: "Paket catering mewah untuk 10+ porsi: Nasi Liwet khas, Rendang Daging, Ayam Lengkuas, Capcay Bakso, Kerupuk Udang, dan Es Teler.",
    price: 85000,
    stock: 80,
    category: "Makanan Utama",
    featured: true,
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: 5,
    name: "Rendang Sapi Frozen (500g)",
    desc: "Daging sapi rendang bumbu Padang racikan autentik, dikemas vakum tahan lama. Siap dihangatkan kapan saja.",
    price: 95000,
    stock: 40,
    category: "Frozen Food",
    featured: true,
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: 6,
    name: "Ayam Ungkep Bumbu Lengkuas (1 Ekor)",
    desc: "Ayam negeri pilihan ungkep bumbu rempah melimpah. Praktis tinggal goreng atau panggang hingga keemasan.",
    price: 65000,
    stock: 35,
    category: "Frozen Food",
    featured: true,
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: 7,
    name: "Paru Goreng Ketumbar Frozen (250g)",
    desc: "Paru sapi renyah gurih berbalut bumbu ketumbar rempah. Cukup digoreng sebentar untuk tekstur renyah garing.",
    price: 55000,
    stock: 30,
    category: "Frozen Food",
    featured: false,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: 8,
    name: "Empal Gentong Sapi Frozen (300g)",
    desc: "Daging sapi empal bumbu khas Cirebon manis gurih meresap sampai ke serat daging. Siap santap dalam 5 menit.",
    price: 70000,
    stock: 25,
    category: "Frozen Food",
    featured: false,
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: 9,
    name: "Sambal Goreng Ati Ampela Frozen (300g)",
    desc: "Ati ampela segar dimasak sambal balado merah pedas gurih. Sangat cocok disajikan dengan nasi hangat.",
    price: 40000,
    stock: 50,
    category: "Frozen Food",
    featured: false,
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: 10,
    name: "Bebek Ungkep Madura Frozen (1 Ekor)",
    desc: "Bebek utuh siap goreng lengkap dengan bumbu hitam khas Madura dan sambal pencit pedas asam segar.",
    price: 85000,
    stock: 20,
    category: "Frozen Food",
    featured: true,
    image: "https://images.unsplash.com/photo-1514944288352-fffac99f0bdf?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: 11,
    name: "Bakso Daging Sapi Super Frozen (500g)",
    desc: "Bakso sapi kenyal alami 100% daging sapi asli lengkap dengan kuah kaldu rempah dan bumbu pelengkap.",
    price: 60000,
    stock: 45,
    category: "Frozen Food",
    featured: false,
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=600"
  },
  /* MENU MINGGUAN (1 Menu Per Hari) */
  {
    id: 101,
    name: "[Senin] Nasi Ayam Geprek Sambal Korek",
    desc: "Menu Senin: Nasi hangat, ayam geprek renyah dengan sambal korek pedas gurih, tahu, tempe, & lalapan segar.",
    price: 26000,
    category: "Menu Mingguan",
    featured: true,
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=600",
    dayNumber: 1,
    dayName: "Senin",
    isWeekly: true
  },
  {
    id: 102,
    name: "[Selasa] Nasi Sapi Lada Hitam",
    desc: "Menu Selasa: Nasi pulen, tumis daging sapi lada hitam wangi dengan paprika segar & capcay sayur rempah.",
    price: 32000,
    category: "Menu Mingguan",
    featured: true,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600",
    dayNumber: 2,
    dayName: "Selasa",
    isWeekly: true
  },
  {
    id: 103,
    name: "[Rabu] Nasi Ayam Goreng Mentega",
    desc: "Menu Rabu: Ayam goreng saus mentega gurih manis, telur dadar iris, & tumis buncis bakso hangat.",
    price: 27000,
    category: "Menu Mingguan",
    featured: true,
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600",
    dayNumber: 3,
    dayName: "Rabu",
    isWeekly: true
  },
  {
    id: 104,
    name: "[Kamis] Nasi Soto Ayam Lamongan Spesial",
    desc: "Menu Kamis: Nasi hangat dengan soto ayam kuah kuning koya gurih, telur rebus, & sambal pedas.",
    price: 25000,
    category: "Menu Mingguan",
    featured: true,
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600",
    dayNumber: 4,
    dayName: "Kamis",
    isWeekly: true
  },
  {
    id: 105,
    name: "[Jumat] Nasi Kebuli Ayam Rempah",
    desc: "Menu Jumat: Nasi kebuli aromatik wangi rempah dengan ayam bakar empuk, acar nanas, & kerupuk.",
    price: 30000,
    category: "Menu Mingguan",
    featured: true,
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=600",
    dayNumber: 5,
    dayName: "Jumat",
    isWeekly: true
  },
  {
    id: 106,
    name: "[Sabtu] Nasi Kuning Komplit MAM",
    desc: "Menu Sabtu: Nasi kuning gurih, ayam suwir, perkedel kentang, orek tempe, & sambal goreng ati.",
    price: 28000,
    category: "Menu Mingguan",
    featured: true,
    image: "https://images.unsplash.com/photo-1514944288352-fffac99f0bdf?auto=format&fit=crop&q=80&w=600",
    dayNumber: 6,
    dayName: "Sabtu",
    isWeekly: true
  },
  {
    id: 107,
    name: "[Minggu] Nasi Liwet Teri Kacang",
    desc: "Menu Minggu: Nasi liwet aromatik bertabur teri Medan & kacang, ayam goreng kalasan, & sambal terasi.",
    price: 29000,
    category: "Menu Mingguan",
    featured: true,
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=600",
    dayNumber: 7,
    dayName: "Minggu",
    isWeekly: true
  }
];

export const CUSTOMIZATION_OPTIONS: CustomizationOption[] = [
  { name: "Extra Sambal Matah", price: 5000 },
  { name: "Extra Sate Lilit", price: 10000 },
  { name: "Telur Asin", price: 8000 }
];

export const FAQS = [
  {
    question: "Bagaimana cara menyimpan makanan?",
    answer: "Simpan segera di lemari es (kulkas) saat tiba. Makanan kami dirancang untuk tetap segar dan bernutrisi tinggi di kulkas hingga 5 hari. Untuk penyimpanan lebih lama, Anda dapat membekukannya di dalam freezer seperti yang tertera pada kemasan."
  },
  {
    question: "Apakah aman untuk dihangatkan di microwave?",
    answer: "Ya! Wadah kami 100% aman untuk microwave (microwave-safe). Cukup buka penutupnya sedikit atau lepaskan, lalu panaskan selama 2-3 menit tergantung pada daya microwave Anda sebelum dinikmati hangat."
  },
  {
    question: "Bagaimana cara kerja Pre-Order (PO) H-1 di MAM?",
    answer: "Sistem pemesanan kami adalah Open PO H-1 dengan jam batas pesanan (cut-off) pukul 20.00 WIB. Pesanan yang masuk sebelum jam 20.00 WIB dapat dikirimkan besok hari. Jika pesanan dibuat setelah jam 20.00 WIB, maka pengiriman paling cepat adalah besok lusa. Anda juga bisa memilih tanggal pengiriman yang sesuai kebutuhan Anda pada formulir pemesanan."
  },
  {
    question: "Di mana saja cakupan area pengiriman MAM?",
    answer: "Saat ini kami melayani pengiriman ke seluruh wilayah Surabaya Raya dan sekitarnya. Masukkan detail alamat lengkap Anda saat memesan untuk memastikan kurir kami dapat meluncur ke tempat Anda dengan aman."
  }
];
