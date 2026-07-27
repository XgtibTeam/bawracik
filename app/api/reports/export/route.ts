import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getTransactions } from '@/lib/supabase';
import { getBranches } from '@/lib/jsonbin';

// GET /api/reports/export?from=&to=&cabangId=
// Balikin data transaksi MENTAH (bukan agregat) supaya bisa diexport ke
// Excel (nama produk, ml, harga, kasir, cabang, tanggal per baris) — dipakai
// tombol "Export Excel" di Rekap & Grafik (harian/bulanan/tahunan).
// - kasir: hanya transaksi miliknya sendiri
// - admin: transaksi seluruh cabangnya
// - superadmin: bisa filter cabang manapun, atau semua kalau tidak diisi
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin', 'kasir'].includes(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const from = req.nextUrl.searchParams.get('from') || undefined;
    const to = req.nextUrl.searchParams.get('to') || undefined;
    let cabangId = req.nextUrl.searchParams.get('cabangId') || undefined;
    if (session.role !== 'superadmin') cabangId = session.cabangId ?? undefined;
    const karyawanId = session.role === 'kasir' ? session.username : undefined;

    const [transactions, branches] = await Promise.all([
      getTransactions({ cabangId, karyawanId, from, to }),
      getBranches(),
    ]);
    const branchName = new Map(branches.map((b) => [b.id, b.nama]));

    // Satu baris per item produk (bukan per transaksi) supaya kolom nama
    // produk/ml/harga bisa langsung dianalisa per baris di Excel.
    const rows = transactions.flatMap((t) =>
      t.items.map((item) => ({
        tanggal: t.createdAt,
        transaksiId: t.id,
        cabang: branchName.get(t.cabangId) ?? t.cabangId,
        kasir: t.karyawanId ?? '(self-checkout)',
        tipe: t.tipe,
        produk: item.namaParfum,
        ml: item.ml,
        hargaPerMl: item.hargaPerMl,
        subtotal: Math.round(item.ml * item.hargaPerMl),
        voucher: t.voucherCode ?? '',
        totalTransaksi: t.totalHarga,
      }))
    );

    const totalPendapatan = transactions.reduce((s, t) => s + t.totalHarga, 0);
    const totalMl = transactions.reduce((s, t) => s + t.totalMl, 0);

    return NextResponse.json({
      rows,
      totalPendapatan,
      totalMl,
      totalTransaksi: transactions.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
