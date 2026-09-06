import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getTransactions, getProducts, getPricingConfig } from '@/lib/supabase';
import { getEmployees } from '@/lib/jsonbin';
import { getBottlePrice } from '@/lib/calc';

// GET /api/reports/daily?tanggal=YYYY-MM-DD&karyawanId=
//
// Data Harian karyawan — rekap penjualan SATU karyawan pada SATU tanggal,
// mengikuti struktur file rekap manual (REFILL / BOTOL / SERIES):
//   - REFILL  = parfum isi ulang kategori biasa/premium/sultan, per-ml
//               (kolom: NAMA PARFUM, PRODUK/kode, ML, PER ML, HARGA)
//   - SERIES  = parfum kategori 'series', per-ml juga (sistem ini belum
//               mendukung harga per-pcs terpisah untuk series — kalau nanti
//               series mau dijual per-pcs kayak di rekap manual lama,
//               bilang aja, itu perlu ubah cara admin set harga series di
//               Admin > Toko > Harga dulu)
//   - BOTOL   = BUKAN produk tersendiri, tapi biaya botol yang nempel di
//               transaksi/item hari itu (dari fitur "Pakai Botol"), diambil
//               dari Transaction.ukuranBotolMl (satu botol sekeranjang) &
//               TransactionItem.ukuranBotolMl (botol per-item di katalog
//               belanja) — kolom: NAMA BOTOL (ukurannya), PCS, HARGA JUAL
//
// - kasir: HANYA data miliknya sendiri (karyawanId diabaikan, dipaksa ke
//   session sendiri)
// - admin/superadmin: boleh lihat data karyawan manapun di cabangnya lewat
//   parameter karyawanId (username staff)
export const dynamic = 'force-dynamic';

type ParfumRow = { namaParfum: string; kode: string; ml: number; hargaPerMl: number; harga: number; susulan?: boolean };
type ParfumSection = { rows: ParfumRow[]; totalMl: number; totalHarga: number };
type BotolRow = { namaBotol: string; pcs: number; hargaJual: number };
type BotolSection = { rows: BotolRow[]; totalPcs: number; totalHarga: number };

function emptyParfumSection(): ParfumSection {
  return { rows: [], totalMl: 0, totalHarga: 0 };
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin', 'kasir'].includes(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const tanggal = req.nextUrl.searchParams.get('tanggal') || new Date().toISOString().slice(0, 10);
    let cabangId = req.nextUrl.searchParams.get('cabangId') || undefined;
    if (session.role !== 'superadmin') cabangId = session.cabangId ?? undefined;

    const karyawanId =
      session.role === 'kasir' ? session.username : req.nextUrl.searchParams.get('karyawanId') || undefined;

    const [transactions, products, employees, pricingConfig] = await Promise.all([
      getTransactions({
        cabangId,
        karyawanId,
        from: `${tanggal}T00:00:00.000Z`,
        to: `${tanggal}T23:59:59.999Z`,
      }),
      getProducts(),
      getEmployees(),
      getPricingConfig(),
    ]);

    const productById = new Map(products.map((p) => [p.id, p]));
    const productByNama = new Map(products.map((p) => [p.nama.trim().toLowerCase(), p]));
    const namaKaryawan = karyawanId
      ? employees.find((e) => e.username === karyawanId)?.nama || karyawanId
      : undefined;

    const refill = emptyParfumSection();
    const series = emptyParfumSection();
    const botol: BotolSection = { rows: [], totalPcs: 0, totalHarga: 0 };

    for (const t of transactions) {
      // Botol GLOBAL sekeranjang (fitur "Pakai Botol" di halaman kasir) —
      // 1 baris per transaksi.
      if (t.ukuranBotolMl && t.biayaBotol > 0) {
        botol.rows.push({ namaBotol: `Botol ${t.ukuranBotolMl}ml`, pcs: 1, hargaJual: t.biayaBotol });
        botol.totalPcs += 1;
        botol.totalHarga += t.biayaBotol;
      }

      for (const item of t.items) {
        const product =
          (item.productId && productById.get(item.productId)) || productByNama.get(item.namaParfum.trim().toLowerCase());
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

        // Botol PER-ITEM (katalog belanja: tiap produk bisa beda ukuran botol).
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

    return NextResponse.json({
      tanggal,
      karyawanId: karyawanId ?? null,
      namaKaryawan: namaKaryawan ?? null,
      refill,
      botol,
      series,
      grandTotalMl: Math.round((refill.totalMl + series.totalMl) * 10) / 10,
      grandTotalHarga: refill.totalHarga + series.totalHarga + botol.totalHarga,
      jumlahTransaksi: transactions.length,
      jumlahSusulan: transactions.filter((t) => t.susulan).length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
