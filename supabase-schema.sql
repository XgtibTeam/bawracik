-- Jalankan file ini di Supabase SQL Editor sebelum pakai lib/supabase.ts
-- Hanya untuk REKAP/TRANSAKSI. Data teks (produk, member, dll) tetap di JSONBin.

create table if not exists transactions (
  id text primary key,
  cabang_id text not null,
  karyawan_id text,               -- null jika self-checkout oleh customer
  member_id text,                 -- null jika bukan member / grosir
  items jsonb not null,           -- TransactionItem[]
  total_ml numeric not null default 0,
  total_harga numeric not null default 0,
  biaya_botol numeric not null default 0,
  tipe text not null check (tipe in ('grosir', 'ecer')),
  metode_checkout text not null check (metode_checkout in ('kasir', 'self')),
  voucher_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_cabang on transactions (cabang_id);
create index if not exists idx_transactions_karyawan on transactions (karyawan_id);
create index if not exists idx_transactions_member on transactions (member_id);
create index if not exists idx_transactions_created_at on transactions (created_at);

create table if not exists stock_recap (
  id text primary key,
  cabang_id text not null,
  product_id text not null,
  periode text not null check (periode in ('harian', 'bulanan', 'tahunan')),
  tanggal text not null,          -- YYYY-MM-DD / YYYY-MM / YYYY tergantung periode
  stok_awal numeric not null default 0,
  stok_akhir numeric not null default 0,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_recap_cabang on stock_recap (cabang_id);
create index if not exists idx_stock_recap_periode on stock_recap (periode, tanggal);

-- ============================================================
-- PRODUK & HARGA — dipindah dari JSONBin ke Supabase supaya bentuk
-- datanya selalu terjamin relasional (kolom fix), tidak bisa "berubah
-- bentuk" jadi object/kosong seperti yang pernah terjadi di JSONBin
-- dan menyebabkan error "x.find/x.map is not a function" di client.
-- ============================================================

create table if not exists products (
  id text primary key,
  nama text not null,
  kode text not null, -- kode SERI/grup (mis. "R"), boleh dipakai banyak produk sekaligus — bukan SKU unik
  harga_jual numeric,
  image_drive_id text,
  kategori text,
  is_botol boolean not null default false,
  ukuran_botol_ml numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_kode on products (lower(kode));

-- Satu baris saja (id selalu 1) menyimpan tier harga per-ml & harga botol.
create table if not exists pricing_config (
  id int primary key default 1,
  ml_tiers jsonb not null default '[]'::jsonb,
  bottle_tiers jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint pricing_config_singleton check (id = 1)
);

insert into pricing_config (id, ml_tiers, bottle_tiers)
values (
  1,
  '[{"hargaPerMl":2000},{"hargaPerMl":3000},{"hargaPerMl":4000},{"hargaPerMl":5000},{"hargaPerMl":6000},{"hargaPerMl":7000},{"hargaPerMl":8000},{"hargaPerMl":9000},{"hargaPerMl":10000}]'::jsonb,
  '[{"minMl":3,"maxMl":35,"harga":5000},{"minMl":50,"maxMl":100,"harga":10000}]'::jsonb
)
on conflict (id) do nothing;

-- ============================================================
-- FEED MEMBER — postingan ala IG di Member Area. Foto tetap di Google
-- Drive (kolom photo_drive_id menyimpan file id-nya), teks & lokasi di sini.
-- ============================================================

create table if not exists feed_posts (
  id text primary key,
  member_id text not null,
  member_nama text not null,
  photo_drive_id text not null,
  deskripsi text not null default '',
  cabang_id text,              -- diisi jika lokasi dipilih dari daftar cabang
  cabang_nama text,
  lokasi_auto text,            -- diisi jika lokasi dari deteksi GPS ("lat,lng" / label hasil reverse-geocode)
  likes text[] not null default '{}',  -- array member id yang like
  created_at timestamptz not null default now()
);

create index if not exists idx_feed_posts_created_at on feed_posts (created_at desc);
create index if not exists idx_feed_posts_member on feed_posts (member_id);

-- Komentar feed (fitur baru: feed publik tanpa login, bisa like & komen)
create table if not exists feed_comments (
  id text primary key,
  post_id text not null references feed_posts(id) on delete cascade,
  nama text not null,            -- nama pengomentar (member atau tamu tanpa login)
  komentar text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_feed_comments_post on feed_comments (post_id, created_at);
alter table feed_comments enable row level security;

-- Kolom deskripsi produk untuk katalog belanja (tampilan ala e-commerce)
alter table products add column if not exists deskripsi text;

-- Harga per kategori produk (biasa/premium/sultan/series), dipakai kasir biar
-- tinggal pilih produk dari katalog dan harga per-ml otomatis ikut kategori.
alter table pricing_config add column if not exists category_prices jsonb not null default '[]'::jsonb;

-- RLS: matikan akses publik langsung, semua akses lewat server (service key)
alter table products enable row level security;
alter table pricing_config enable row level security;
alter table feed_posts enable row level security;

-- RLS: matikan akses publik langsung, semua akses lewat server (service key)
alter table transactions enable row level security;
alter table stock_recap enable row level security;
-- Tidak ada policy dibuat -> hanya service_role key (dipakai server) yang bisa akses.

-- ============================================================
-- REVISI STOK: ledger "masuk" (KG dikonversi ML) + snapshot stok awal/akhir
-- bulanan. Menggantikan pemakaian tabel stock_recap lama di UI (tabel lama
-- dibiarkan ada, tidak dihapus, supaya data lama tidak hilang).
-- ============================================================

create table if not exists stock_movements (
  id text primary key,
  cabang_id text not null,
  product_id text not null,
  tanggal date not null,          -- hari stok ini masuk
  kg numeric not null,            -- input asli admin/kasir cabang, dalam KG
  ml numeric not null,            -- kg * 1000, dipakai di semua rekap
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_stock_movements_cabang_product on stock_movements (cabang_id, product_id, tanggal);
alter table stock_movements enable row level security;

create table if not exists stock_month_snapshot (
  id text primary key,            -- `${cabangId}:${productId}:${yearMonth}`
  cabang_id text not null,
  product_id text not null,
  year_month text not null,       -- YYYY-MM
  stok_awal numeric,              -- ML, opsional, diisi awal bulan
  stok_akhir numeric,             -- ML, opsional, diisi akhir bulan
  updated_by text not null,
  updated_at timestamptz not null default now(),
  unique (cabang_id, product_id, year_month)
);
create index if not exists idx_stock_snapshot_cabang_product on stock_month_snapshot (cabang_id, product_id, year_month);
alter table stock_month_snapshot enable row level security;
-- Tidak ada policy dibuat -> hanya service_role key (dipakai server) yang bisa akses.

-- ============================================================
-- FIX: kode produk (mis. "R" untuk seri MyKonos) SENGAJA dipakai bareng
-- oleh banyak produk sekaligus (grouping/kode seri, BUKAN SKU unik per
-- produk) — lihat lib/stock.ts computeStockRecap yang mengelompokkan
-- produk per kode. Constraint UNIQUE di bawah ini yang menyebabkan import
-- xlsx MyKonos_Series (semua barisnya pakai kode "R") gagal diam-diam /
-- cuma baris pertama yang masuk. Hapus constraint-nya di sini.
-- ============================================================
alter table products drop constraint if exists products_kode_key;

-- ============================================================
-- PESANAN — order dari self-checkout (/belanja), berstatus 'pending' dulu
-- sampai kasir cabang meng-ACC (baru jadi baris di `transactions`, supaya
-- rekap penjualan mengatribusikan ke kasir yang melayani, bukan "self").
-- ============================================================
create table if not exists pesanan (
  id text primary key,
  cabang_id text not null,
  items jsonb not null,
  total_ml numeric not null default 0,
  total_harga numeric not null default 0,
  biaya_botol numeric not null default 0,
  tipe text not null check (tipe in ('grosir', 'ecer')),
  member_wa text,
  member_nama text,
  member_id text,             -- kalau member dipilih dari hasil pencarian (bukan daftar baru)
  voucher_code text,
  bukti_bayar_url text,           -- screenshot QRIS, Google Drive file id
  status text not null default 'pending' check (status in ('pending', 'diterima', 'selesai', 'dihapus')),
  transaction_id text,            -- terisi setelah di-ACC jadi transaksi beneran
  diproses_oleh text,             -- username kasir yang ACC/selesaikan
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_pesanan_cabang_status on pesanan (cabang_id, status);
alter table pesanan enable row level security;
-- Tidak ada policy dibuat -> hanya service_role key (dipakai server) yang bisa akses.
-- (Endpoint POST /api/pesanan dipakai customer TANPA login, tapi tetap lewat
-- server route yang pakai service key, bukan akses langsung dari browser.)
