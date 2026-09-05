import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getTransactions, getProducts } from '@/lib/supabase';
import { getEmployees } from '@/lib/jsonbin';

// GET /api/reports/daily?tanggal=YYYY-MM-DD&karyawanId=
//
// Data Harian karyawan — rekap penjualan SATU karyawan pada SATU tanggal,
// dipecah jadi 3 kelompok (mengikuti struktur file rekap manual lama:
// sheet REFILL / BOTOL / SERIES), tiap kelompok berisi baris NAMA PARFUM /
// PRODUK (kode) / ML / PER ML / HARGA, ditutup baris TOTAL.
//   - BOTOL  = produk dengan isBotol = true
//   - SERIES = produk berkategori 'series'
//   - REFILL = sisanya (isi ulang biasa/premium/sultan)
//
// - kasir: HANYA data miliknya sendiri (karyawanId diabaikan, dipaksa ke
//   session sendiri)
// - admin/superadmin: boleh lihat data karyawan manapun di cabangnya lewat
//   parameter karyawanId (username staff)
export const dynamic = 'force-dynamic';

type DailyRow = { namaParfum: string; kode: string; ml: number; hargaPerMl: number; harga: number };
type DailySection = { rows: DailyRow[]; totalMl: number; totalHarga: number };

function emptySection(): DailySection {
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

    const [transactions, products, employees] = await Promise.all([
      getTransactions({
        cabangId,
        karyawanId,
        from: `${tanggal}T00:00:00.000Z`,
        to: `${tanggal}T23:59:59.999Z`,
      }),
      getProducts(),
      getEmployees(),
    ]);

    const productById = new Map(products.map((p) => [p.id, p]));
    const productByNama = new Map(products.map((p) => [p.nama.trim().toLowerCase(), p]));
    const namaKaryawan = karyawanId
      ? employees.find((e) => e.username === karyawanId)?.nama || karyawanId
      : undefined;

    const refill = emptySection();
    const botol = emptySection();
    const series = emptySection();

    for (const t of transactions) {
      for (const item of t.items) {
        const product = (item.productId && productById.get(item.productId)) || productByNama.get(item.namaParfum.trim().toLowerCase());
        const kode = product?.kode?.trim() || '-';
        const harga = Math.round(item.ml * item.hargaPerMl);
        const row: DailyRow = { namaParfum: item.namaParfum, kode, ml: item.ml, hargaPerMl: item.hargaPerMl, harga };

        const target = product?.isBotol ? botol : product?.kategori === 'series' ? series : refill;
        target.rows.push(row);
        target.totalMl = Math.round((target.totalMl + item.ml) * 10) / 10;
        target.totalHarga += harga;
      }
    }

    return NextResponse.json({
      tanggal,
      karyawanId: karyawanId ?? null,
      namaKaryawan: namaKaryawan ?? null,
      refill,
      botol,
      series,
      grandTotalMl: Math.round((refill.totalMl + botol.totalMl + series.totalMl) * 10) / 10,
      grandTotalHarga: refill.totalHarga + botol.totalHarga + series.totalHarga,
      jumlahTransaksi: transactions.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
