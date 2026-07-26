-- Jalankan file ini di Supabase SQL Editor sebelum pakai lib/supabase.ts
-- HANYA untuk REKAP/TRANSAKSI + KATALOG PRODUK (nama, deskripsi, gambar).
-- Data teks lain (profil toko, cabang, member, voucher) tetap di JSONBin.

create table if not exists products (
  id text primary key,
  nama text not null,
  deskripsi text default '',
  kode text,
  harga_jual numeric,
  image_url text,
  is_botol boolean not null default false,
  ukuran_botol_ml numeric,
  created_at timestamptz not null default now()
);
create index if not exists idx_products_nama on products (nama);

create table if not exists feed_posts (
  id text primary key,
  caption text default '',
  image_url text not null,
  created_by text,               -- username admin/kasir yang posting
  created_at timestamptz not null default now()
);

create table if not exists feed_likes (
  post_id text not null references feed_posts(id) on delete cascade,
  liker_key text not null,       -- nomor WA member, atau id anonim device
  created_at timestamptz not null default now(),
  primary key (post_id, liker_key)
);

create table if not exists feed_comments (
  id text primary key,
  post_id text not null references feed_posts(id) on delete cascade,
  nama text not null,
  isi text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_feed_likes_post on feed_likes (post_id);
create index if not exists idx_feed_comments_post on feed_comments (post_id);

create table if not exists store_logos (
  id text primary key,
  url text not null,
  urutan integer not null default 0,
  created_at timestamptz not null default now()
);

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

-- RLS: matikan akses publik langsung, semua akses lewat server (service key)
alter table transactions enable row level security;
alter table stock_recap enable row level security;
alter table products enable row level security;
alter table store_logos enable row level security;
alter table feed_posts enable row level security;
alter table feed_likes enable row level security;
alter table feed_comments enable row level security;
-- Tidak ada policy dibuat -> hanya service_role key (dipakai server) yang bisa akses.
