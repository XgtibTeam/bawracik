import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getTransactions } from '@/lib/supabase';

// GET /api/reports/sales?from=&to=&cabangId=
// - kasir: hanya rekap transaksi miliknya sendiri
// - admin: rekap seluruh cabangnya (+ rekap pribadi kalau dia juga melayani)
// - superadmin: bisa filter cabangId manapun, atau semua kalau tidak diisi
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

    const transactions = await getTransactions({ cabangId, karyawanId, from, to });

    const totalMl = transactions.reduce((s, t) => s + t.totalMl, 0);
    const totalPendapatan = transactions.reduce((s, t) => s + t.totalHarga, 0);
    const totalTransaksi = transactions.length;

    // Best-seller: ranking berdasarkan JUMLAH ORDER (bukan cuma total ml),
    // sesuai permintaan — tiap item dalam transaksi dihitung 1 order.
    const bestSellerMap = new Map<string, { orderCount: number; ml: number }>();
    for (const t of transactions) {
      for (const item of t.items) {
        const cur = bestSellerMap.get(item.namaParfum) || { orderCount: 0, ml: 0 };
        cur.orderCount += 1;
        cur.ml += item.ml;
        bestSellerMap.set(item.namaParfum, cur);
      }
    }
    const bestSeller = Array.from(bestSellerMap.entries())
      .map(([nama, v]) => ({ nama, orderCount: v.orderCount, ml: Math.round(v.ml * 10) / 10 }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);

    // Rekap per karyawan (kalau admin/superadmin lihat semua karyawan di cabangnya)
    const perKaryawanMap = new Map<string, { totalMl: number; totalPendapatan: number }>();
    for (const t of transactions) {
      const key = t.karyawanId || '(self-checkout)';
      const cur = perKaryawanMap.get(key) || { totalMl: 0, totalPendapatan: 0 };
      cur.totalMl += t.totalMl;
      cur.totalPendapatan += t.totalHarga;
      perKaryawanMap.set(key, cur);
    }
    const perKaryawan = Array.from(perKaryawanMap.entries()).map(([karyawan, v]) => ({
      karyawan,
      ...v,
    }));

    return NextResponse.json({
      totalMl,
      totalPendapatan,
      totalTransaksi,
      bestSeller,
      perKaryawan,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
