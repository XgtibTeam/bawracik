import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getTransactions, getProducts, getPricingConfig } from '@/lib/supabase';
import { getEmployees } from '@/lib/jsonbin';
import { buildDailyRekap } from '@/lib/daily-rekap';

// GET /api/reports/daily?tanggal=YYYY-MM-DD&karyawanId=
//
// Data Harian karyawan — rekap penjualan SATU karyawan pada SATU tanggal,
// buat ditampilkan di layar (bukan buat cetak — untuk versi cetak/export
// banyak-hari-sekaligus lihat /api/reports/daily-export).
//
// - kasir: HANYA data miliknya sendiri (karyawanId diabaikan, dipaksa ke
//   session sendiri)
// - admin/superadmin: boleh lihat data karyawan manapun di cabangnya lewat
//   parameter karyawanId (username staff)
export const dynamic = 'force-dynamic';

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

    const namaKaryawan = karyawanId
      ? employees.find((e) => e.username === karyawanId)?.nama || karyawanId
      : undefined;

    const { refill, botol, series } = buildDailyRekap(transactions, products, pricingConfig);

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
