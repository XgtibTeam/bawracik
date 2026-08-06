// ============================================================
// Helper rekap stok — dipakai bareng oleh /api/stock-movements (ringkasan),
// halaman kasir/stok, StokTab admin, dan (nanti) export Excel rekap stok.
//
// Model: "masuk" = input KG dikonversi ML lewat stock_movements (ledger,
// bisa berkali-kali). "Keluar" TIDAK diinput manual — dihitung otomatis
// dari total ml terjual di transactions (Supabase) pada tanggal & produk
// yang sama. Stok awal/akhir (opsional, cuma bulanan/tahunan) datang dari
// stock_month_snapshot, dipakai buat cross-check selisih/minus riil.
// ============================================================

import { getTransactions, getStockMovements, getProducts, getStockMonthSnapshots } from './supabase';
import type { Product } from './types';

export type ProductStockUsage = {
  productId: string;
  nama: string;
  kode: string;
  masukMl: number;
  keluarMl: number;
  net: number; // masukMl - keluarMl (positif = surplus, negatif = kurang/minus)
};

export type KodeStockGroup = {
  kode: string;
  produk: ProductStockUsage[];
  totalMasukMl: number;
  totalKeluarMl: number;
  totalNet: number;
};

/**
 * Hitung total ml TERJUAL per productId dalam rentang tanggal & cabang
 * tertentu, dari transaksi Supabase. Item transaksi tanpa productId (input
 * manual di kasir tanpa pilih dari katalog) tidak bisa dipetakan ke produk
 * manapun sehingga diabaikan di rekap stok per-produk ini.
 */
export async function getKeluarMlByProduct(params: {
  cabangId: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD (inklusif)
}): Promise<Map<string, number>> {
  const transactions = await getTransactions({
    cabangId: params.cabangId,
    from: `${params.from}T00:00:00.000Z`,
    to: `${params.to}T23:59:59.999Z`,
  });
  const result = new Map<string, number>();
  for (const t of transactions) {
    for (const item of t.items) {
      if (!item.productId) continue;
      result.set(item.productId, (result.get(item.productId) || 0) + item.ml);
    }
  }
  return result;
}

export type ProductStockStatus = {
  productId: string;
  nama: string;
  kode: string;
  stokLama: number; // saldo yang dibawa dari sebelum bulan berjalan (masih bergerak/terjual)
  stokIn: number; // total stok masuk (baru) bulan berjalan
  stokOut: number; // total terjual bulan berjalan
  sisa: number; // stokLama + stokIn - stokOut = sisa stok saat ini
};

/**
 * Hitung status stok "saat ini" per produk untuk satu cabang: stok lama
 * (saldo sebelum bulan berjalan, hasil dari masuk-keluar sebelum tanggal 1
 * bulan ini), stok in (masuk bulan ini, kumulatif walau diinput berkali-kali),
 * dan stok out (total terjual bulan ini). `asOf` menentukan "bulan berjalan"
 * (default hari ini) — dipakai halaman kasir/stok & katalog belanja (biar
 * tiap cabang bisa nampilin sisa stok yang beda-beda).
 */
export async function computeCurrentStock(params: { cabangId: string; asOf?: string }): Promise<ProductStockStatus[]> {
  const asOf = params.asOf || new Date().toISOString().slice(0, 10);
  const monthStart = `${asOf.slice(0, 7)}-01`;
  const prevDay = new Date(monthStart);
  prevDay.setDate(prevDay.getDate() - 1);
  const beforeMonthEnd = prevDay.toISOString().slice(0, 10);

  const [products, movementsLama, movementsBulanIni, keluarLama, keluarBulanIni] = await Promise.all([
    getProducts(),
    getStockMovements({ cabangId: params.cabangId, from: '2000-01-01', to: beforeMonthEnd }),
    getStockMovements({ cabangId: params.cabangId, from: monthStart, to: asOf }),
    getKeluarMlByProduct({ cabangId: params.cabangId, from: '2000-01-01', to: beforeMonthEnd }),
    getKeluarMlByProduct({ cabangId: params.cabangId, from: monthStart, to: asOf }),
  ]);

  const masukLamaMap = new Map<string, number>();
  for (const m of movementsLama) masukLamaMap.set(m.productId, (masukLamaMap.get(m.productId) || 0) + m.ml);
  const masukIniMap = new Map<string, number>();
  for (const m of movementsBulanIni) masukIniMap.set(m.productId, (masukIniMap.get(m.productId) || 0) + m.ml);

  return products.map((p) => {
    const masukLama = masukLamaMap.get(p.id) || 0;
    const keluarLamaMl = keluarLama.get(p.id) || 0;
    const stokLama = Math.max(0, masukLama - keluarLamaMl);
    const stokIn = masukIniMap.get(p.id) || 0;
    const stokOut = keluarBulanIni.get(p.id) || 0;
    return {
      productId: p.id,
      nama: p.nama,
      kode: p.kode,
      stokLama,
      stokIn,
      stokOut,
      sisa: stokLama + stokIn - stokOut,
    };
  });
}

/**
 * Rekap stok penuh untuk satu cabang dalam rentang tanggal, dikelompokkan
 * per kode produk (kolom IN = masuk, OUT = keluar), sesuai model rekap
 * penjualan (per kode produk ada sheet/grup tersendiri, isinya semua nama
 * parfum yang pakai kode itu).
 */
export async function computeStockRecap(params: {
  cabangId: string;
  from: string;
  to: string;
}): Promise<KodeStockGroup[]> {
  const [products, movements, keluarMap] = await Promise.all([
    getProducts(),
    getStockMovements({ cabangId: params.cabangId, from: params.from, to: params.to }),
    getKeluarMlByProduct(params),
  ]);

  const masukMap = new Map<string, number>();
  for (const m of movements) {
    masukMap.set(m.productId, (masukMap.get(m.productId) || 0) + m.ml);
  }

  const byKode = new Map<string, Product[]>();
  for (const p of products) {
    const kode = p.kode?.trim() || 'LAINNYA';
    if (!byKode.has(kode)) byKode.set(kode, []);
    byKode.get(kode)!.push(p);
  }

  const groups: KodeStockGroup[] = [];
  for (const [kode, prods] of Array.from(byKode.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const produkUsage: ProductStockUsage[] = [];
    let totalMasuk = 0;
    let totalKeluar = 0;
    for (const p of prods) {
      const masukMl = masukMap.get(p.id) || 0;
      const keluarMl = keluarMap.get(p.id) || 0;
      // Hanya tampilkan produk yang memang ada pergerakan di periode ini,
      // supaya sheet/rekap tidak dipenuhi baris nol untuk semua produk.
      if (masukMl === 0 && keluarMl === 0) continue;
      produkUsage.push({ productId: p.id, nama: p.nama, kode, masukMl, keluarMl, net: masukMl - keluarMl });
      totalMasuk += masukMl;
      totalKeluar += keluarMl;
    }
    if (produkUsage.length === 0) continue;
    groups.push({ kode, produk: produkUsage, totalMasukMl: totalMasuk, totalKeluarMl: totalKeluar, totalNet: totalMasuk - totalKeluar });
  }
  return groups;
}
