// ============================================================
// Skema data pusat — BAW Group (Biang Aroma Wangi x Me.Racik x Racik Parfum)
// Gabungan sistem Absensi + Webstore Parfum
// ============================================================

// ---------- ROLE & AUTH ----------

export type Role = 'superadmin' | 'admin' | 'kasir' | 'member';

// Session yang disimpan di cookie (signed, lihat lib/auth.ts)
export type Session = {
  role: Role;
  username: string; // untuk member, ini nomor WA
  cabangId: string | null; // null untuk superadmin (akses semua cabang)
  nama: string;
  expires: number;
};

// ---------- CABANG (bin: branches) ----------

export type Branch = {
  id: string;
  nama: string;
  alamat?: string;
  waCS?: string; // nomor WA customer service cabang ini
  createdAt: string;
};

// ---------- KARYAWAN / ADMIN (bin: employees) ----------
// Menggantikan bin `employees` lama (dulu cuma string[] nama).
// String[] lama tetap dibaca lib/jsonbin.ts sbg fallback migrasi.

export type Employee = {
  id: string;
  nama: string;
  username: string;
  passwordHash: string; // bcrypt
  role: 'superadmin' | 'admin' | 'kasir';
  cabangId: string | null; // null hanya untuk superadmin
  createdAt: string;
};

// ---------- PROFIL TOKO (bin: store_profile) ----------

export type HomeSection = {
  id: string;
  type: 'banner' | 'teks' | 'gambar' | 'promo';
  judul?: string;
  isi?: string; // teks/promo
  gambarUrl?: string; // banner/gambar
};

export type StoreProfile = {
  namaToko: string; // "Biang Aroma X Me.Racik Parfum"
  slogan?: string; // tagline pendek, tampil di bawah nama toko
  deskripsi: string;
  ctaText?: string; // teks tombol utama di homepage (default: "Mulai Belanja")
  footerText?: string; // teks kecil di paling bawah homepage
  logoUrl: string; // Google Drive file id atau URL — logo utama (kompatibilitas lama)
  logos: string[]; // logo tambahan (bisa lebih dari satu), URL Google Drive
  socialMedia: {
    instagram?: string;
    whatsapp?: string;
    tiktok?: string;
  };
  pembayaran: {
    qrisImageUrl?: string;
    dana?: string;
    seabank?: string;
  };
  homeSections: HomeSection[]; // section homepage, urutan & isi diatur admin
  colorScheme?: 'hijau' | 'maroon'; // skema warna situs, diatur admin (berlaku utk semua pengunjung)
  updatedAt: string;
};

// ---------- HARGA PER-ML & BOTOL (bin: pricing) ----------

// Pilihan harga parfum per ml, admin bisa tambah/kurang tapi defaultnya 2k s.d. 10k
export type MlPriceTier = {
  hargaPerMl: number; // 2000, 3000, ..., 10000
};

// Harga botol berdasarkan ukuran (auto ditambahkan ke total saat checkout)
export type BottlePriceTier = {
  minMl: number;
  maxMl: number;
  harga: number; // 5000 utk 3-35ml, 10000 utk 50-100ml
};

// Kategori harga produk katalog: dipakai supaya kasir tinggal pilih produk
// dari katalog dan harga per-ml langsung ikut kategori produknya, tanpa
// perlu ketik manual harga tiap kali checkout.
export const PRODUCT_KATEGORI_LIST = ['biasa', 'premium', 'sultan', 'series'] as const;
export type ProductKategori = (typeof PRODUCT_KATEGORI_LIST)[number];

export type CategoryPriceTier = {
  kategori: string; // salah satu dari PRODUCT_KATEGORI_LIST
  hargaPerMl: number;
};

export type PricingConfig = {
  mlTiers: MlPriceTier[];
  bottleTiers: BottlePriceTier[];
  categoryPrices: CategoryPriceTier[];
  updatedAt: string;
};

// ---------- PRODUK (bin: products) ----------

export type Product = {
  id: string;
  nama: string;
  kode: string;
  deskripsi?: string; // ditampilkan di halaman katalog belanja, gaya e-commerce
  hargaJual?: number; // opsional, untuk produk non-parfum-isi-ulang
  imageDriveId?: string; // Google Drive file id (folder produk)
  kategori?: string;
  isBotol: boolean;
  ukuranBotolMl?: number; // kalau isBotol true
  createdAt: string;
};

// ---------- MEMBER (bin: members) ----------

export type MemberPurchaseHistory = {
  tanggal: string;
  parfum: string[];
  totalMl: number;
  totalHarga: number;
  pengisianKe: number; // 1-10, direset ke 0 setelah 10
  poinDidapat: number;
  cabangId: string;
  transactionId: string; // ref ke Supabase transactions.id
};

export type Member = {
  id: string;
  nama: string;
  wa: string; // nomor WA, dipakai sbg login member area
  poinTotal: number; // akumulasi total, TIDAK PERNAH direset
  poinSaatIni: number; // direset ke 0 tiap 10x pengisian
  pengisianKe: number; // 0-10, reset ke 0 setelah mencapai 10
  totalPenukaran: number; // berapa kali sudah mencapai 10 & reset (berhak tukar gratis)
  penukaranTerpakai: number; // berapa kali reward parfum gratis SUDAH dipakai/ditukar
  riwayat: MemberPurchaseHistory[];
  kodeReferral: string; // 5 digit random, milik member ini
  direferralOleh?: string; // kodeReferral member lain (jika didaftarkan via referral)
  createdAt: string;
};

// ---------- VOUCHER (bin: vouchers) ----------

export type Voucher = {
  code: string; // 5 digit random
  tipe: 'persen' | 'potongan';
  nilai: number; // persen (0-100) atau nominal rupiah
  aktif: boolean;
  expiresAt?: string;
  dipakaiOleh: string[]; // member id yang sudah pakai
  createdAt: string;
};

// ---------- TRANSAKSI (Supabase table: transactions) ----------
// Disimpan di Supabase (rekap), bukan JSONBin.

export type TransactionItem = {
  productId?: string;
  namaParfum: string;
  ml: number;
  hargaPerMl: number;
  ukuranBotolMl?: number; // botol dipilih untuk item ini spesifik (katalog: tiap produk bisa beda ukuran botol)
  subtotal: number; // sudah termasuk biaya botol item ini kalau ada
};

export type Transaction = {
  id: string;
  cabangId: string;
  karyawanId: string | null; // null jika self-checkout oleh customer
  memberId: string | null;
  items: TransactionItem[];
  totalMl: number;
  totalHarga: number;
  biayaBotol: number; // dari bottleTiers, sudah termasuk di totalHarga
  ukuranBotolMl?: number; // ukuran botol GLOBAL (satu botol utk seluruh keranjang, dipilih di halaman kasir) — dipakai buat rekonstruksi baris "BOTOL" di Data Harian
  namaBotol?: string; // nama/label botol yang dipilih kasir (mis. "SP 30 Matte Black") — kalau kosong, Data Harian fallback ke "Botol {ukuranBotolMl}ml"
  tipe: 'grosir' | 'ecer';
  metodeCheckout: 'kasir' | 'self';
  voucherCode?: string;
  // Penjualan "susulan": staff lupa input kemarin, jadi diinput belakangan
  // TAPI ditandai terjadi di tanggal yang sebenarnya (createdAt di-backdate
  // ke tanggal itu) supaya rekap harian/bulanan/tahunan tetap akurat.
  // susulan=true dipakai admin buat lihat mana yang diinput belakangan.
  susulan?: boolean;
  createdAt: string;
};

// ---------- REKAP STOK (Supabase table: stock_recap) ----------
// CATATAN: model lama (stokAwal/stokAkhir polos per record) sudah digantikan
// StockMovement + StockMonthSnapshot di bawah (revisi: input stok pakai KG
// dikonversi ML, bergerak berdasar penjualan harian, stok awal/akhir cuma
// utk bulanan/tahunan). Type ini dipertahankan supaya data lama & endpoint
// lama tidak error kalau masih ada yang baca, tapi UI baru tidak pakai ini.

export type StockRecap = {
  id: string;
  cabangId: string;
  productId: string;
  periode: 'harian' | 'bulanan' | 'tahunan';
  tanggal: string; // YYYY-MM-DD (harian) / YYYY-MM (bulanan) / YYYY (tahunan)
  stokAwal: number;
  stokAkhir: number;
  createdBy: string; // employee id
  createdAt: string;
};

// ---------- STOK MASUK / LEDGER (Supabase table: stock_movements) ----------
// Setiap kali admin/kasir cabang input stok baru datang, dicatat di sini
// sebagai penambahan ("masuk"). Admin cabang HANYA input berapa KG — sistem
// yang mengonversi ke ML (1kg = 1000ml) untuk semua perhitungan turunannya
// (rekap harian/bulanan/tahunan pakai ML). "Keluar" TIDAK dicatat manual di
// sini — keluar dihitung otomatis dari total ml terjual (Supabase
// transactions) pada tanggal & produk yang sama.
export type StockMovement = {
  id: string;
  cabangId: string;
  productId: string;
  tanggal: string; // YYYY-MM-DD, hari stok ini masuk
  kg: number; // input asli oleh admin/kasir cabang
  ml: number; // kg * 1000, dipakai di semua rekap
  createdBy: string; // username staff yang input
  createdAt: string;
};

// ---------- STOK AWAL/AKHIR BULANAN (Supabase table: stock_month_snapshot) ----------
// SENGAJA cuma ada level bulanan & tahunan (tahunan = snapshot bulan
// pertama & terakhir tahun itu), TIDAK ada harian. stokAwal boleh diisi
// kapan saja di awal bulan, stokAkhir boleh diisi kapan saja di akhir
// bulan (tidak harus pas tanggal 1 / akhir bulan persis) — dipakai untuk
// cross-check otomatis berapa minus/lebihnya stok riil vs catatan sistem.
export type StockMonthSnapshot = {
  id: string; // `${cabangId}:${productId}:${yearMonth}`
  cabangId: string;
  productId: string;
  yearMonth: string; // YYYY-MM
  stokAwal: number | null; // dalam ML
  stokAkhir: number | null; // dalam ML
  updatedBy: string;
  updatedAt: string;
};

// ---------- OUTING STOK ----------
// (Dihapus — diganti mekanisme "Susulan": checkout biasa lewat /kasir yang
// sama persis, cuma createdAt-nya di-backdate + flag susulan=true. Lihat
// Transaction.susulan di bawah.)

// ---------- PESANAN / ORDER SELF-CHECKOUT (Supabase table: pesanan) ----------
// Saat customer checkout sendiri (self-checkout) lewat halaman /belanja,
// TIDAK langsung jadi Transaction — cuma jadi Pesanan berstatus 'pending'
// dulu. Kasir cabang yang ACC pesanan ini di tab "Pesanan" halaman kasir,
// baru saat itu Transaction beneran dibuat & di-atribusikan ke kasir yang
// nge-ACC (bukan tercatat sbg self-checkout di rekap), supaya rekap
// penjualan tetap jelas siapa karyawan yang melayani. "Hapus" dipakai kalau
// ada pesanan iseng/tidak valid (tidak membuat Transaction apa pun).
export type PesananStatus = 'pending' | 'diterima' | 'selesai' | 'dihapus';

export type Pesanan = {
  id: string;
  cabangId: string;
  items: TransactionItem[];
  totalMl: number;
  totalHarga: number;
  biayaBotol: number;
  tipe: 'grosir' | 'ecer';
  memberWa?: string;
  memberNama?: string;
  memberId?: string; // kalau dipilih dari hasil pencarian member lama (bukan daftar baru)
  voucherCode?: string;
  buktiBayarUrl?: string; // screenshot QRIS, Google Drive file id
  status: PesananStatus;
  transactionId?: string; // terisi setelah di-ACC
  diprosesOleh?: string; // username kasir yang ACC/selesaikan
  createdAt: string;
  updatedAt: string;
};
