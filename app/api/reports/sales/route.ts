import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getTransactions } from '@/lib/supabase';

// GET /api/reports/sales?from=&to=&cabangId=
// - kasir: hanya rekap transaksi miliknya sendiri
// - admin: rekap seluruh cabangnya (+ rekap pribadi kalau dia juga melayani)
// - superadmin: bisa filter cabangId manapun, atau semua kalau tidak diisi
// Route ini SELALU dijalankan dinamis (bukan di-cache statis Next.js) —
// tanpa ini, data baru (mis. feed/produk/harga terbaru) bisa 'macet' di
// snapshot lama sampai redeploy, karena Next.js App Router men-static-kan
// Route Handler GET yang tidak baca cookies/searchParams.
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

    const transactions = await getTransactions({ cabangId, karyawanId, from, to });

    const totalMl = transactions.reduce((s, t) => s + t.totalMl, 0);
    const totalPendapatan = transactions.reduce((s, t) => s + t.totalHarga, 0);
    const totalTransaksi = transactions.length;

    // Best-seller: hitung ml per nama parfum SEKALIGUS jumlah order (berapa
    // kali item ini muncul di transaksi) — admin minta "terbanyak order",
    // bukan cuma volume ml.
    const bestSellerMap = new Map<string, { ml: number; jumlahOrder: number }>();
    for (const t of transactions) {
      for (const item of t.items) {
        const cur = bestSellerMap.get(item.namaParfum) || { ml: 0, jumlahOrder: 0 };
        cur.ml += item.ml;
        cur.jumlahOrder += 1;
        bestSellerMap.set(item.namaParfum, cur);
      }
    }
    const bestSeller = Array.from(bestSellerMap.entries())
      .map(([nama, v]) => ({ nama, ml: v.ml, jumlahOrder: v.jumlahOrder }))
      .sort((a, b) => b.jumlahOrder - a.jumlahOrder)
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
