import type { PricingConfig } from './types';

/**
 * Hitung ml dari nominal rupiah yang dibayar user, atau sebaliknya.
 * Rumus: rupiah = ml * hargaPerMl  <->  ml = rupiah / hargaPerMl
 * Hasil ml dibulatkan 1 desimal (mis. 3,5ml), rupiah dibulatkan ke integer.
 */
export function rupiahToMl(rupiah: number, hargaPerMl: number): number {
  if (hargaPerMl <= 0) return 0;
  return Math.round((rupiah / hargaPerMl) * 10) / 10;
}

export function mlToRupiah(ml: number, hargaPerMl: number): number {
  return Math.round(ml * hargaPerMl);
}

/** Cari harga botol otomatis berdasarkan ukuran ml, dari PricingConfig.bottleTiers. */
export function getBottlePrice(ukuranMl: number, config: PricingConfig): number {
  const tier = config.bottleTiers.find((t) => ukuranMl >= t.minMl && ukuranMl <= t.maxMl);
  return tier ? tier.harga : 0;
}

export type ChargeableItem = {
  namaParfum: string;
  ml: number;
  hargaPerMl: number;
};

export type CheckoutCalc = {
  items: (ChargeableItem & { subtotal: number })[];
  totalMl: number;
  subtotalParfum: number;
  biayaBotol: number;
  totalHarga: number;
};

/**
 * Hitung total checkout: subtotal semua parfum (ml x harga/ml) + biaya botol
 * (kalau pakai botol, dihitung otomatis dari ukuran botol yang dipilih).
 */
export function hitungCheckout(
  items: ChargeableItem[],
  config: PricingConfig,
  ukuranBotolMl?: number
): CheckoutCalc {
  const itemsWithSubtotal = items.map((it) => ({
    ...it,
    subtotal: mlToRupiah(it.ml, it.hargaPerMl),
  }));
  const totalMl = Math.round(itemsWithSubtotal.reduce((s, it) => s + it.ml, 0) * 10) / 10;
  const subtotalParfum = itemsWithSubtotal.reduce((s, it) => s + it.subtotal, 0);
  const biayaBotol = ukuranBotolMl ? getBottlePrice(ukuranBotolMl, config) : 0;

  return {
    items: itemsWithSubtotal,
    totalMl,
    subtotalParfum,
    biayaBotol,
    totalHarga: subtotalParfum + biayaBotol,
  };
}

/**
 * Hitung nominal diskon dari voucher terhadap total belanja.
 * 'persen' -> dibulatkan ke rupiah terdekat, 'potongan' -> nominal tetap.
 * Diskon tidak pernah melebihi total belanja (floor di 0).
 */
export function hitungDiskonVoucher(
  totalHarga: number,
  voucher: { tipe: 'persen' | 'potongan'; nilai: number }
): number {
  if (totalHarga <= 0) return 0;
  const diskon =
    voucher.tipe === 'persen' ? Math.round((totalHarga * voucher.nilai) / 100) : voucher.nilai;
  return Math.min(Math.max(diskon, 0), totalHarga);
}

/**
 * Sistem poin: 1 poin per 1 ml yang diisi (bisa disesuaikan nanti di admin).
 * pengisianKe dihitung per-botol (1 botol = 1 pengisian), reset ke 0 stlh mencapai 10.
 */
export function hitungPoinDariMl(totalMl: number): number {
  return Math.round(totalMl);
}

export function updatePengisian(pengisianSaatIni: number, jumlahBotolBaru: number) {
  let pengisianKe = pengisianSaatIni + jumlahBotolBaru;
  let totalPenukaranTambahan = 0;
  while (pengisianKe >= 10) {
    pengisianKe -= 10;
    totalPenukaranTambahan += 1;
  }
  return { pengisianKe, totalPenukaranTambahan };
}
