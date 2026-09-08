import type { Product, Transaction, PricingConfig } from './types';
import { getBottlePrice } from './calc';

export type ParfumRow = {
  namaParfum: string;
  kode: string;
  ml: number;
  hargaPerMl: number;
  harga: number;
  susulan?: boolean;
};
export type ParfumSection = { rows: ParfumRow[]; totalMl: number; totalHarga: number };
export type BotolRow = { namaBotol: string; pcs: number; hargaJual: number };
export type BotolSection = { rows: BotolRow[]; totalPcs: number; totalHarga: number };

export function emptyParfumSection(): ParfumSection {
  return { rows: [], totalMl: 0, totalHarga: 0 };
}
export function emptyBotolSection(): BotolSection {
  return { rows: [], totalPcs: 0, totalHarga: 0 };
}

/**
 * Kelompokkan satu hari transaksi jadi 3 bagian mengikuti struktur rekap
 * manual (REFILL / BOTOL / SERIES) — dipakai oleh /api/reports/daily (satu
 * hari, tampil di layar) dan /api/reports/daily-export (banyak hari
 * sekaligus, jadi file Excel blok-per-hari yang bisa dicetak & dipotong).
 */
export function buildDailyRekap(
  transactions: Transaction[],
  products: Product[],
  pricingConfig: PricingConfig
): { refill: ParfumSection; botol: BotolSection; series: ParfumSection } {
  const productById = new Map(products.map((p) => [p.id, p]));
  const productByNama = new Map(products.map((p) => [p.nama.trim().toLowerCase(), p]));

  const refill = emptyParfumSection();
  const series = emptyParfumSection();
  const botol = emptyBotolSection();

  for (const t of transactions) {
    if (t.ukuranBotolMl && t.biayaBotol > 0) {
      botol.rows.push({ namaBotol: t.namaBotol || `Botol ${t.ukuranBotolMl}ml`, pcs: 1, hargaJual: t.biayaBotol });
      botol.totalPcs += 1;
      botol.totalHarga += t.biayaBotol;
    }

    for (const item of t.items) {
      const product =
        (item.productId && productById.get(item.productId)) ||
        productByNama.get(item.namaParfum.trim().toLowerCase());
      const kode = product?.kode?.trim() || '-';
      const harga = Math.round(item.ml * item.hargaPerMl);
      const row: ParfumRow = {
        namaParfum: item.namaParfum,
        kode,
        ml: item.ml,
        hargaPerMl: item.hargaPerMl,
        harga,
        susulan: t.susulan || undefined,
      };

      const target = product?.kategori === 'series' ? series : refill;
      target.rows.push(row);
      target.totalMl = Math.round((target.totalMl + item.ml) * 10) / 10;
      target.totalHarga += harga;

      if (item.ukuranBotolMl) {
        const hargaBotolItem = getBottlePrice(item.ukuranBotolMl, pricingConfig);
        if (hargaBotolItem > 0) {
          botol.rows.push({ namaBotol: `Botol ${item.ukuranBotolMl}ml`, pcs: 1, hargaJual: hargaBotolItem });
          botol.totalPcs += 1;
          botol.totalHarga += hargaBotolItem;
        }
      }
    }
  }

  return { refill, botol, series };
}

/** Group transaksi per tanggal kalender (YYYY-MM-DD, berdasar createdAt). */
export function groupByDate(transactions: Transaction[]): Map<string, Transaction[]> {
  const map = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const tgl = t.createdAt.slice(0, 10);
    if (!map.has(tgl)) map.set(tgl, []);
    map.get(tgl)!.push(t);
  }
  return map;
}

/** Total ML terjual per parfum (nama+kode), diakumulasi lintas SEMUA hari
 * dalam rentang — buat sheet "TOTAL AKUMULASI". Diurutkan dari yang paling
 * laku. Tidak termasuk item kategori 'series' (dipisah, series direkap
 * sendiri di sheet SERIES). */
export function buildAkumulasi(
  transactions: Transaction[],
  products: Product[]
): { namaParfum: string; kode: string; totalMl: number }[] {
  const productById = new Map(products.map((p) => [p.id, p]));
  const productByNama = new Map(products.map((p) => [p.nama.trim().toLowerCase(), p]));
  const map = new Map<string, { namaParfum: string; kode: string; totalMl: number }>();

  for (const t of transactions) {
    for (const item of t.items) {
      const product =
        (item.productId && productById.get(item.productId)) ||
        productByNama.get(item.namaParfum.trim().toLowerCase());
      if (product?.kategori === 'series') continue;
      const kode = product?.kode?.trim() || '-';
      const key = `${item.namaParfum.trim().toLowerCase()}__${kode.toLowerCase()}`;
      const cur = map.get(key) || { namaParfum: item.namaParfum, kode, totalMl: 0 };
      cur.totalMl = Math.round((cur.totalMl + item.ml) * 10) / 10;
      map.set(key, cur);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalMl - a.totalMl);
}
