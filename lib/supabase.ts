// ============================================================
// Supabase — HANYA untuk rekap/transaksi (database relasional).
// Teks/master data tetap di JSONBin (lib/jsonbin.ts).
// Foto tetap di Google Drive (lib/google-drive.ts).
//
// Jalankan supabase-schema.sql di SQL Editor Supabase sebelum pakai file ini.
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Transaction, StockRecap, Product, FeedPost, FeedComment } from './types';

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

// ---------- Store Logos (multi-logo homepage) ----------

export async function getStoreLogos(): Promise<{ id: string; url: string; urutan: number }[]> {
  const { data, error } = await getClient().from('store_logos').select('*').order('urutan', { ascending: true });
  if (error) throw new Error(`Gagal ambil logo: ${error.message}`);
  return (data ?? []).map((row: any) => ({ id: row.id, url: row.url, urutan: row.urutan }));
}

export async function addStoreLogo(id: string, url: string, urutan: number): Promise<void> {
  const { error } = await getClient().from('store_logos').insert({ id, url, urutan });
  if (error) throw new Error(`Gagal tambah logo: ${error.message}`);
}

export async function deleteStoreLogo(id: string): Promise<void> {
  const { error } = await getClient().from('store_logos').delete().eq('id', id);
  if (error) throw new Error(`Gagal hapus logo: ${error.message}`);
}

// ---------- Products (katalog) ----------

function rowToProduct(row: any): Product {
  return {
    id: row.id,
    nama: row.nama,
    deskripsi: row.deskripsi || '',
    kode: row.kode || undefined,
    hargaJual: row.harga_jual ?? undefined,
    imageUrl: row.image_url ?? undefined,
    isBotol: row.is_botol,
    ukuranBotolMl: row.ukuran_botol_ml ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await getClient().from('products').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Gagal ambil produk: ${error.message}`);
  return (data ?? []).map(rowToProduct);
}

export async function insertProduct(p: Product): Promise<void> {
  const { error } = await getClient().from('products').insert({
    id: p.id,
    nama: p.nama,
    deskripsi: p.deskripsi || '',
    kode: p.kode ?? null,
    harga_jual: p.hargaJual ?? null,
    image_url: p.imageUrl ?? null,
    is_botol: p.isBotol,
    ukuran_botol_ml: p.ukuranBotolMl ?? null,
    created_at: p.createdAt,
  });
  if (error) throw new Error(`Gagal tambah produk: ${error.message}`);
}

export async function bulkInsertProducts(products: Product[]): Promise<void> {
  if (products.length === 0) return;
  const { error } = await getClient().from('products').insert(
    products.map((p) => ({
      id: p.id,
      nama: p.nama,
      deskripsi: p.deskripsi || '',
      kode: p.kode ?? null,
      harga_jual: p.hargaJual ?? null,
      image_url: p.imageUrl ?? null,
      is_botol: p.isBotol,
      ukuran_botol_ml: p.ukuranBotolMl ?? null,
      created_at: p.createdAt,
    }))
  );
  if (error) throw new Error(`Gagal import produk: ${error.message}`);
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<void> {
  const update: Record<string, any> = {};
  if (patch.nama !== undefined) update.nama = patch.nama;
  if (patch.deskripsi !== undefined) update.deskripsi = patch.deskripsi;
  if (patch.kode !== undefined) update.kode = patch.kode;
  if (patch.hargaJual !== undefined) update.harga_jual = patch.hargaJual;
  if (patch.imageUrl !== undefined) update.image_url = patch.imageUrl;
  if (patch.isBotol !== undefined) update.is_botol = patch.isBotol;
  if (patch.ukuranBotolMl !== undefined) update.ukuran_botol_ml = patch.ukuranBotolMl;

  const { error } = await getClient().from('products').update(update).eq('id', id);
  if (error) throw new Error(`Gagal ubah produk: ${error.message}`);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await getClient().from('products').delete().eq('id', id);
  if (error) throw new Error(`Gagal hapus produk: ${error.message}`);
}

// ---------- Feeds Bawracik ----------

export async function getFeedPosts(likerKey?: string): Promise<FeedPost[]> {
  const { data: posts, error } = await getClient()
    .from('feed_posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Gagal ambil feeds: ${error.message}`);

  const { data: likes } = await getClient().from('feed_likes').select('post_id, liker_key');
  const { data: comments } = await getClient().from('feed_comments').select('post_id');

  return (posts ?? []).map((row: any) => {
    const postLikes = (likes ?? []).filter((l: any) => l.post_id === row.id);
    return {
      id: row.id,
      caption: row.caption || '',
      imageUrl: row.image_url,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at,
      likeCount: postLikes.length,
      commentCount: (comments ?? []).filter((c: any) => c.post_id === row.id).length,
      likedByMe: likerKey ? postLikes.some((l: any) => l.liker_key === likerKey) : false,
    };
  });
}

export async function insertFeedPost(post: {
  id: string;
  caption: string;
  imageUrl: string;
  createdBy?: string;
  createdAt: string;
}): Promise<void> {
  const { error } = await getClient().from('feed_posts').insert({
    id: post.id,
    caption: post.caption,
    image_url: post.imageUrl,
    created_by: post.createdBy ?? null,
    created_at: post.createdAt,
  });
  if (error) throw new Error(`Gagal posting feed: ${error.message}`);
}

export async function deleteFeedPost(id: string): Promise<void> {
  const { error } = await getClient().from('feed_posts').delete().eq('id', id);
  if (error) throw new Error(`Gagal hapus feed: ${error.message}`);
}

export async function toggleFeedLike(postId: string, likerKey: string): Promise<{ liked: boolean }> {
  const client = getClient();
  const { data: existing } = await client
    .from('feed_likes')
    .select('*')
    .eq('post_id', postId)
    .eq('liker_key', likerKey)
    .maybeSingle();

  if (existing) {
    const { error } = await client.from('feed_likes').delete().eq('post_id', postId).eq('liker_key', likerKey);
    if (error) throw new Error(`Gagal batal like: ${error.message}`);
    return { liked: false };
  } else {
    const { error } = await client.from('feed_likes').insert({ post_id: postId, liker_key: likerKey });
    if (error) throw new Error(`Gagal like: ${error.message}`);
    return { liked: true };
  }
}

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
    isi: row.isi,
    createdAt: row.created_at,
  }));
}

export async function insertFeedComment(comment: FeedComment): Promise<void> {
  const { error } = await getClient().from('feed_comments').insert({
    id: comment.id,
    post_id: comment.postId,
    nama: comment.nama,
    isi: comment.isi,
    created_at: comment.createdAt,
  });
  if (error) throw new Error(`Gagal kirim komentar: ${error.message}`);
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
    tipe: tx.tipe,
    metode_checkout: tx.metodeCheckout,
    voucher_code: tx.voucherCode ?? null,
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
}): Promise<Transaction[]> {
  let query = getClient().from('transactions').select('*').order('created_at', { ascending: false });
  if (filters.cabangId) query = query.eq('cabang_id', filters.cabangId);
  if (filters.karyawanId) query = query.eq('karyawan_id', filters.karyawanId);
  if (filters.memberId) query = query.eq('member_id', filters.memberId);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', filters.to);

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
    tipe: row.tipe,
    metodeCheckout: row.metode_checkout,
    voucherCode: row.voucher_code ?? undefined,
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
