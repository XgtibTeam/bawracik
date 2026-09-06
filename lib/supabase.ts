// ============================================================
// Supabase — HANYA untuk rekap/transaksi (database relasional).
// Teks/master data tetap di JSONBin (lib/jsonbin.ts).
// Foto tetap di Google Drive (lib/google-drive.ts).
//
// Jalankan supabase-schema.sql di SQL Editor Supabase sebelum pakai file ini.
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Transaction, StockRecap, Product, PricingConfig } from './types';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY belum diatur di .env.local');
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

// ---------- Transactions ----------

export async function insertTransaction(tx: Transaction): Promise<void> {
  const { error } = await getClient().from('transactions').insert({
    id: tx.id,
    cabang_id: tx.cabangId,
    karyawan_id: tx.karyawanId,
    member_id: tx.memberId,
    items: tx.items,
    total_ml: tx.totalMl,
    total_harga: tx.totalHarga,
    biaya_botol: tx.biayaBotol,
    ukuran_botol_ml: tx.ukuranBotolMl ?? null,
    tipe: tx.tipe,
    metode_checkout: tx.metodeCheckout,
    voucher_code: tx.voucherCode ?? null,
    susulan: tx.susulan ?? false,
    created_at: tx.createdAt,
  });
  if (error) throw new Error(`Gagal simpan transaksi: ${error.message}`);
}

export async function getTransactions(filters: {
  cabangId?: string;
  karyawanId?: string;
  memberId?: string;
  from?: string;
  to?: string;
  susulanOnly?: boolean;
}): Promise<Transaction[]> {
  let query = getClient().from('transactions').select('*').order('created_at', { ascending: false });
  if (filters.cabangId) query = query.eq('cabang_id', filters.cabangId);
  if (filters.karyawanId) query = query.eq('karyawan_id', filters.karyawanId);
  if (filters.memberId) query = query.eq('member_id', filters.memberId);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', filters.to);
  if (filters.susulanOnly) query = query.eq('susulan', true);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil transaksi: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    cabangId: row.cabang_id,
    karyawanId: row.karyawan_id,
    memberId: row.member_id,
    items: row.items,
    totalMl: row.total_ml,
    totalHarga: row.total_harga,
    biayaBotol: row.biaya_botol,
    ukuranBotolMl: row.ukuran_botol_ml ?? undefined,
    tipe: row.tipe,
    metodeCheckout: row.metode_checkout,
    voucherCode: row.voucher_code ?? undefined,
    susulan: row.susulan ?? false,
    createdAt: row.created_at,
  }));
}

// ---------- Stock Recap ----------

export async function upsertStockRecap(recap: StockRecap): Promise<void> {
  const { error } = await getClient().from('stock_recap').upsert({
    id: recap.id,
    cabang_id: recap.cabangId,
    product_id: recap.productId,
    periode: recap.periode,
    tanggal: recap.tanggal,
    stok_awal: recap.stokAwal,
    stok_akhir: recap.stokAkhir,
    created_by: recap.createdBy,
    created_at: recap.createdAt,
  });
  if (error) throw new Error(`Gagal simpan rekap stok: ${error.message}`);
}

export async function getStockRecap(filters: {
  cabangId?: string;
  periode?: 'harian' | 'bulanan' | 'tahunan';
  productId?: string;
}): Promise<StockRecap[]> {
  let query = getClient().from('stock_recap').select('*').order('tanggal', { ascending: false });
  if (filters.cabangId) query = query.eq('cabang_id', filters.cabangId);
  if (filters.periode) query = query.eq('periode', filters.periode);
  if (filters.productId) query = query.eq('product_id', filters.productId);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil rekap stok: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    cabangId: row.cabang_id,
    productId: row.product_id,
    periode: row.periode,
    tanggal: row.tanggal,
    stokAwal: row.stok_awal,
    stokAkhir: row.stok_akhir,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }));
}

// ---------- Products ----------
// Sama seperti getMembers/saveMembers dari lib/jsonbin.ts dulu: baca semua,
// mutasi di caller, simpan semua lagi. Dipertahankan biar API routes yang
// sudah ada (app/api/products/*) tidak perlu diubah logikanya.

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await getClient()
    .from('products')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Gagal ambil produk: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    nama: row.nama,
    kode: row.kode,
    deskripsi: row.deskripsi ?? undefined,
    hargaJual: row.harga_jual ?? undefined,
    imageDriveId: row.image_drive_id ?? undefined,
    kategori: row.kategori ?? undefined,
    isBotol: row.is_botol,
    ukuranBotolMl: row.ukuran_botol_ml ?? undefined,
    createdAt: row.created_at,
  }));
}

export async function saveProducts(products: Product[]): Promise<void> {
  const client = getClient();
  const rows = products.map((p) => ({
    id: p.id,
    nama: p.nama,
    kode: p.kode,
    deskripsi: p.deskripsi ?? null,
    harga_jual: p.hargaJual ?? null,
    image_drive_id: p.imageDriveId ?? null,
    kategori: p.kategori ?? null,
    is_botol: p.isBotol,
    ukuran_botol_ml: p.ukuranBotolMl ?? null,
    created_at: p.createdAt,
  }));

  // Replace-all: hapus semua baris lama lalu insert ulang, supaya konsisten
  // dengan pola "read-all, mutate, write-all" yang dipakai caller-nya.
  const { error: delError } = await client.from('products').delete().neq('id', '__none__');
  if (delError) throw new Error(`Gagal hapus produk lama: ${delError.message}`);

  if (rows.length > 0) {
    const { error: insError } = await client.from('products').insert(rows);
    if (insError) throw new Error(`Gagal simpan produk: ${insError.message}`);
  }
}

// ---------- Pricing config (1 baris, id=1) ----------

const DEFAULT_PRICING: PricingConfig = {
  mlTiers: [2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000].map((hargaPerMl) => ({
    hargaPerMl,
  })),
  bottleTiers: [
    { minMl: 3, maxMl: 35, harga: 5000 }, // botol 3-35ml
    { minMl: 36, maxMl: 100000, harga: 10000 }, // botol >35ml (termasuk grosir/jerigen)
  ],
  categoryPrices: [
    { kategori: 'biasa', hargaPerMl: 2000 },
    { kategori: 'premium', hargaPerMl: 4000 },
    { kategori: 'sultan', hargaPerMl: 7000 },
    { kategori: 'series', hargaPerMl: 10000 },
  ],
  updatedAt: new Date().toISOString(),
};

export async function getPricingConfig(): Promise<PricingConfig> {
  const { data, error } = await getClient().from('pricing_config').select('*').eq('id', 1).maybeSingle();
  if (error) throw new Error(`Gagal ambil harga: ${error.message}`);
  if (!data) return DEFAULT_PRICING;
  return {
    mlTiers: Array.isArray(data.ml_tiers) ? data.ml_tiers : DEFAULT_PRICING.mlTiers,
    bottleTiers: Array.isArray(data.bottle_tiers) ? data.bottle_tiers : DEFAULT_PRICING.bottleTiers,
    categoryPrices:
      Array.isArray(data.category_prices) && data.category_prices.length > 0
        ? data.category_prices
        : DEFAULT_PRICING.categoryPrices,
    updatedAt: data.updated_at,
  };
}

export async function savePricingConfig(config: PricingConfig): Promise<void> {
  const { error } = await getClient()
    .from('pricing_config')
    .upsert({
      id: 1,
      ml_tiers: config.mlTiers,
      bottle_tiers: config.bottleTiers,
      category_prices: config.categoryPrices ?? [],
      updated_at: config.updatedAt,
    });
  if (error) throw new Error(`Gagal simpan harga: ${error.message}`);
}
// ---------- Stock Movements (ledger "masuk", KG->ML) ----------

export async function insertStockMovement(m: import('./types').StockMovement): Promise<void> {
  const { error } = await getClient().from('stock_movements').insert({
    id: m.id,
    cabang_id: m.cabangId,
    product_id: m.productId,
    tanggal: m.tanggal,
    kg: m.kg,
    ml: m.ml,
    created_by: m.createdBy,
    created_at: m.createdAt,
  });
  if (error) throw new Error(`Gagal simpan stok masuk: ${error.message}`);
}

export async function getStockMovements(filters: {
  cabangId?: string;
  productId?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}): Promise<import('./types').StockMovement[]> {
  let query = getClient().from('stock_movements').select('*').order('tanggal', { ascending: false });
  if (filters.cabangId) query = query.eq('cabang_id', filters.cabangId);
  if (filters.productId) query = query.eq('product_id', filters.productId);
  if (filters.from) query = query.gte('tanggal', filters.from);
  if (filters.to) query = query.lte('tanggal', filters.to);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil stok masuk: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    cabangId: row.cabang_id,
    productId: row.product_id,
    tanggal: row.tanggal,
    kg: Number(row.kg),
    ml: Number(row.ml),
    createdBy: row.created_by,
    createdAt: row.created_at,
  }));
}

// (Fungsi Outing Stock lama dihapus — lihat catatan di lib/types.ts)

// ---------- Stock Month Snapshot (stok awal/akhir, bulanan saja) ----------

export async function upsertStockMonthSnapshot(s: import('./types').StockMonthSnapshot): Promise<void> {
  const { error } = await getClient().from('stock_month_snapshot').upsert(
    {
      id: s.id,
      cabang_id: s.cabangId,
      product_id: s.productId,
      year_month: s.yearMonth,
      stok_awal: s.stokAwal,
      stok_akhir: s.stokAkhir,
      updated_by: s.updatedBy,
      updated_at: s.updatedAt,
    },
    { onConflict: 'cabang_id,product_id,year_month' }
  );
  if (error) throw new Error(`Gagal simpan stok awal/akhir: ${error.message}`);
}

export async function getStockMonthSnapshots(filters: {
  cabangId?: string;
  productId?: string;
  yearMonth?: string;
}): Promise<import('./types').StockMonthSnapshot[]> {
  let query = getClient().from('stock_month_snapshot').select('*');
  if (filters.cabangId) query = query.eq('cabang_id', filters.cabangId);
  if (filters.productId) query = query.eq('product_id', filters.productId);
  if (filters.yearMonth) query = query.eq('year_month', filters.yearMonth);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil stok awal/akhir: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    cabangId: row.cabang_id,
    productId: row.product_id,
    yearMonth: row.year_month,
    stokAwal: row.stok_awal === null ? null : Number(row.stok_awal),
    stokAkhir: row.stok_akhir === null ? null : Number(row.stok_akhir),
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  }));
}

// ---------- Pesanan (order self-checkout, nunggu di-ACC kasir) ----------

import type { Pesanan, PesananStatus } from './types';

export async function insertPesanan(p: Pesanan): Promise<void> {
  const { error } = await getClient().from('pesanan').insert({
    id: p.id,
    cabang_id: p.cabangId,
    items: p.items,
    total_ml: p.totalMl,
    total_harga: p.totalHarga,
    biaya_botol: p.biayaBotol,
    tipe: p.tipe,
    member_wa: p.memberWa ?? null,
    member_nama: p.memberNama ?? null,
    member_id: p.memberId ?? null,
    voucher_code: p.voucherCode ?? null,
    bukti_bayar_url: p.buktiBayarUrl ?? null,
    status: p.status,
    transaction_id: p.transactionId ?? null,
    diproses_oleh: p.diprosesOleh ?? null,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  });
  if (error) throw new Error(`Gagal simpan pesanan: ${error.message}`);
}

function rowToPesanan(row: any): Pesanan {
  return {
    id: row.id,
    cabangId: row.cabang_id,
    items: row.items,
    totalMl: row.total_ml,
    totalHarga: row.total_harga,
    biayaBotol: row.biaya_botol,
    tipe: row.tipe,
    memberWa: row.member_wa ?? undefined,
    memberNama: row.member_nama ?? undefined,
    memberId: row.member_id ?? undefined,
    voucherCode: row.voucher_code ?? undefined,
    buktiBayarUrl: row.bukti_bayar_url ?? undefined,
    status: row.status,
    transactionId: row.transaction_id ?? undefined,
    diprosesOleh: row.diproses_oleh ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPesananList(filters: { cabangId?: string; status?: PesananStatus | PesananStatus[] }): Promise<Pesanan[]> {
  let query = getClient().from('pesanan').select('*').order('created_at', { ascending: false });
  if (filters.cabangId) query = query.eq('cabang_id', filters.cabangId);
  if (filters.status) {
    if (Array.isArray(filters.status)) query = query.in('status', filters.status);
    else query = query.eq('status', filters.status);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Gagal ambil pesanan: ${error.message}`);
  return (data ?? []).map(rowToPesanan);
}

export async function getPesananById(id: string): Promise<Pesanan | null> {
  const { data, error } = await getClient().from('pesanan').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Gagal ambil pesanan: ${error.message}`);
  return data ? rowToPesanan(data) : null;
}

export async function updatePesanan(
  id: string,
  patch: Partial<Pick<Pesanan, 'status' | 'transactionId' | 'diprosesOleh' | 'updatedAt'>>
): Promise<void> {
  const row: any = { updated_at: patch.updatedAt ?? new Date().toISOString() };
  if (patch.status) row.status = patch.status;
  if (patch.transactionId !== undefined) row.transaction_id = patch.transactionId;
  if (patch.diprosesOleh !== undefined) row.diproses_oleh = patch.diprosesOleh;
  const { error } = await getClient().from('pesanan').update(row).eq('id', id);
  if (error) throw new Error(`Gagal update pesanan: ${error.message}`);
}

// ---------- Feed member (postingan ala IG) ----------

export type FeedPost = {
  id: string;
  memberId: string;
  memberNama: string;
  photoDriveId: string;
  deskripsi: string;
  cabangId?: string;
  cabangNama?: string;
  lokasiAuto?: string;
  likes: string[];
  createdAt: string;
};

export async function getFeedPosts(limit = 50): Promise<FeedPost[]> {
  const { data, error } = await getClient()
    .from('feed_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Gagal ambil feed: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    memberId: row.member_id,
    memberNama: row.member_nama,
    photoDriveId: row.photo_drive_id,
    deskripsi: row.deskripsi ?? '',
    cabangId: row.cabang_id ?? undefined,
    cabangNama: row.cabang_nama ?? undefined,
    lokasiAuto: row.lokasi_auto ?? undefined,
    likes: Array.isArray(row.likes) ? row.likes : [],
    createdAt: row.created_at,
  }));
}

export async function createFeedPost(post: Omit<FeedPost, 'createdAt' | 'likes'>): Promise<FeedPost> {
  const row = {
    id: post.id,
    member_id: post.memberId,
    member_nama: post.memberNama,
    photo_drive_id: post.photoDriveId,
    deskripsi: post.deskripsi,
    cabang_id: post.cabangId ?? null,
    cabang_nama: post.cabangNama ?? null,
    lokasi_auto: post.lokasiAuto ?? null,
    likes: [] as string[],
  };
  const { data, error } = await getClient().from('feed_posts').insert(row).select().single();
  if (error) throw new Error(`Gagal buat postingan: ${error.message}`);
  return {
    id: data.id,
    memberId: data.member_id,
    memberNama: data.member_nama,
    photoDriveId: data.photo_drive_id,
    deskripsi: data.deskripsi ?? '',
    cabangId: data.cabang_id ?? undefined,
    cabangNama: data.cabang_nama ?? undefined,
    lokasiAuto: data.lokasi_auto ?? undefined,
    likes: [],
    createdAt: data.created_at,
  };
}

export async function toggleFeedLike(postId: string, memberId: string): Promise<string[]> {
  const client = getClient();
  const { data: existing, error: fetchErr } = await client
    .from('feed_posts')
    .select('likes')
    .eq('id', postId)
    .maybeSingle();
  if (fetchErr) throw new Error(`Gagal ambil postingan: ${fetchErr.message}`);
  if (!existing) throw new Error('Postingan tidak ditemukan');

  const currentLikes: string[] = Array.isArray(existing.likes) ? existing.likes : [];
  const liked = currentLikes.includes(memberId);
  const nextLikes = liked ? currentLikes.filter((id) => id !== memberId) : [...currentLikes, memberId];

  const { error: updError } = await client.from('feed_posts').update({ likes: nextLikes }).eq('id', postId);
  if (updError) throw new Error(`Gagal update like: ${updError.message}`);
  return nextLikes;
}

export async function deleteFeedPost(postId: string, memberId: string): Promise<void> {
  const { error } = await getClient().from('feed_posts').delete().eq('id', postId).eq('member_id', memberId);
  if (error) throw new Error(`Gagal hapus postingan: ${error.message}`);
}

// Admin/superadmin bisa hapus feed siapa pun (moderasi), beda dari
// deleteFeedPost di atas yang cuma boleh hapus postingan miliknya sendiri.
export async function deleteFeedPostByAdmin(postId: string): Promise<void> {
  const { error } = await getClient().from('feed_posts').delete().eq('id', postId);
  if (error) throw new Error(`Gagal hapus postingan: ${error.message}`);
}

// ---------- Komentar feed (publik, tanpa perlu login) ----------

export type FeedComment = {
  id: string;
  postId: string;
  nama: string;
  komentar: string;
  createdAt: string;
};

export async function getFeedComments(postId: string): Promise<FeedComment[]> {
  const { data, error } = await getClient()
    .from('feed_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Gagal ambil komentar: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    postId: row.post_id,
    nama: row.nama,
    komentar: row.komentar,
    createdAt: row.created_at,
  }));
}

export async function createFeedComment(input: { id: string; postId: string; nama: string; komentar: string }): Promise<FeedComment> {
  const { data, error } = await getClient()
    .from('feed_comments')
    .insert({ id: input.id, post_id: input.postId, nama: input.nama, komentar: input.komentar })
    .select()
    .single();
  if (error) throw new Error(`Gagal kirim komentar: ${error.message}`);
  return {
    id: data.id,
    postId: data.post_id,
    nama: data.nama,
    komentar: data.komentar,
    createdAt: data.created_at,
  };
}

export async function deleteFeedComment(commentId: string): Promise<void> {
  const { error } = await getClient().from('feed_comments').delete().eq('id', commentId);
  if (error) throw new Error(`Gagal hapus komentar: ${error.message}`);
}

export async function countFeedComments(postIds: string[]): Promise<Record<string, number>> {
  if (postIds.length === 0) return {};
  const { data, error } = await getClient().from('feed_comments').select('post_id').in('post_id', postIds);
  if (error) throw new Error(`Gagal hitung komentar: ${error.message}`);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.post_id] = (counts[row.post_id] || 0) + 1;
  }
  return counts;
}
