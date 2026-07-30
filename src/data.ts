import { MenuItem, CustomizationOption } from "./types";

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 1,
    name: "Nasi Campur Spesial MAM",
    desc: "Paduan nasi hangat dengan lauk pauk pilihan: ayam suwir bumbu rahasia, sate lilit, telur pindang, dan sambal matah segar.",
    price: 45000,
    category: "Makanan Utama",
    featured: true,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBX_ei8KD0u0Vq4LtqMqK3_cCJGJ4vk33maQP1_XQnyZxMz4pq2dywkDKSwJWaqAE5y2ZnMngglJpVS1idH0aa37u66mS4BV8vsrIPbg2OkZwhFLpkKBPOC9YiQ3Mj4Hm5qqtf3dMn-a-eTPEHJWd3dj4GsNa-dpqzsmxQgXoM3f8u4tBDRrUi0DLBKofYjt3F_ROdHouwXUbR8X2abpUWS4TrR5J8tl6IRKk2UsSV7Jih4rSlRpgSdHQ"
  },
  {
    id: 2,
    name: "Ayam Bakar Madu",
    desc: "Ayam bakar bumbu madu harum dengan nasi aromatik gurih dan sambal khas.",
    price: 45000,
    category: "Makanan Utama",
    featured: false,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzART-r3H93c22LM2FiC7dNZWPDd9F5HKy1-j33bgJcHvU3I3f2ai9pLjOhNgjtqVJmuDSqgmWErv9-kAuhcOZavBkkeaxnJjZhXEUW1d2PQBaRXKMBA02mdhid6mMNV9IdqFyrLrWXbdHtXbi3K6xyeZuSciq_zjKEYKduqEQMy9XoxqKqJXUaHTXf6N3MUYAGbe6Hh_V7MzoMXseaFqM2MKCZxvEoXq37yMngnHffjPTMkOU9vaSiQ"
  },
  {
    id: 3,
    name: "Quinoa Sayuran Panggang",
    desc: "Sayuran panggang musiman di atas quinoa yang pulen dan kaya nutrisi.",
    price: 42000,
    category: "Makanan Utama",
    featured: false,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCZXP1jIeTbOc41gmXWiOcilnaHvbbI0yiD7IT1Q2vsQeh_ICFeVSM1Rxf4D3f1uzcrwuJsA7bbAlSOpQuQBdKbEACzjVpiw5H9gnK_AyzjRy3ylLBDYg2KUO_xogx_SAfd_qGVja_Bfs_IZyk_oXRJI8I5vnw4VdDHXoGP3jXC8Z-vYzCRZowSGNgNyzAe2AXcfC5uvRd0ZvYLf9Y9lddsb4c8rQKQljlFbJ3E92lYt2tg2CfcJUIz7A"
  },
  {
    id: 4,
    name: "Daging Sapi Masak Lambat",
    desc: "Daging sapi empuk gurih yang direbus berjam-jam dalam kuah bumbu kaya rempah Nusantara.",
    price: 55000,
    category: "Makanan Utama",
    featured: false,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA6MM3T5_WGIjKLAWM-H95bYbOp3gvikdZxSAWfAzTKg8mg1FtttFc-uskXmyZn-5ejHB9yWm1ZSDMZCTwEz-v4XRdKE66k1oqzDHCAmiyHTrNWXBJCzyssgC9slb77mrNGY1KEvMlFnjNDWKAfN9XLwDB4vXMiDhqpRv7MWSmu2vzi6YkPxW2kNcQuB8xGRgC1RttOKBvlW5L0m7maCsH8wjEmqLqVKTWRe-ZeT2zlCvPCKMXetogXQQ"
  },
  {
    id: 5,
    name: "Risol Mayo Artisan",
    desc: "Kulit renyah dengan isian smoked beef, telur rebus, dan saus mayo creamy gurih resep rahasia koki.",
    price: 20000,
    category: "Cemilan",
    featured: false,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD9_QJ25hBsfrxrJJ5Rnoo75llA_GcAhdTMyJjmEGYSD9r53sYt_dld6DpLQVsm0lbIfctWQIAik9P9zNzxlgDWnc6J4kpgMinlZSpfASgY0nI-2pUSNPMOmlkinsUF-jtOAQsICMF4sM1Nrh9HvsNcuOgxSBGi5nvbZX8HhpMJFdGvLf8Vf21J7_s4VgZl12Ta9ytahVU7_GO5LbDQiq-dZOqrY0oPO5r1RawtbYfoxx8bXwH7hefoVg"
  },
  {
    id: 6,
    name: "Es Kopi Susu Pandan",
    desc: "Espresso house blend dipadu susu segar dingin dan sirup ekstrak pandan wangi alami buatan sendiri.",
    price: 25000,
    category: "Minuman",
    featured: false,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCpb5QdL5Q7VcWnRudoLTIlpzmDIht-YrLPgtDC9Nsd_HVwocSQKgcnwwj8n1XJEmtMy6bjJYkjZpQ80mgBH20pqQfCZW8e3G1CAgAGQKF6r7jKZF-1Kf63F5c8d4sw-0aMK-Mjkfh5ymWy6eDovf-_uPZd1BcKl5RZaqdQ8tht31AvJluJR6rF7NZOKixwVWbGxkxESMlwrWAkuRTMGF6wLMVX7dyGiAqSB11Y3RYsKPgKJB6nhYZAvg"
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
