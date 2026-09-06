import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { computeStockRecap, computeCurrentStock } from '@/lib/stock';
import { getStockMonthSnapshots } from '@/lib/supabase';

// Rekap stok terkelompok per kode produk (kolom IN/masuk & OUT/keluar),
// dipakai halaman kasir/stok & StokTab admin & export Excel rekap stok.
// periode=harian -> from=to=tanggal. periode=bulanan/tahunan -> range bulan
// atau tahun itu, PLUS snapshot stok awal/akhir bulanan kalau ada.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

    let cabangId = req.nextUrl.searchParams.get('cabangId') || undefined;
    if (session.role !== 'superadmin') cabangId = session.cabangId ?? undefined;
    if (!cabangId) return NextResponse.json({ error: 'Cabang wajib diisi' }, { status: 400 });

    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');
    if (!from || !to) return NextResponse.json({ error: 'from & to wajib diisi (YYYY-MM-DD)' }, { status: 400 });

    const groups = await computeStockRecap({ cabangId, from, to });

    // Snapshot stok awal/akhir bulanan (kalau range yang diminta persis satu
    // bulan penuh) — dilampirkan supaya UI bisa hitung selisih/minus riil.
    const yearMonth = from.slice(0, 7) === to.slice(0, 7) ? from.slice(0, 7) : undefined;
    const snapshots = yearMonth ? await getStockMonthSnapshots({ cabangId, yearMonth }) : [];

    // Stok lama/in/out (per bulan `to`) — dipakai UI buat nampilin 3 tipe
    // stok (lama = saldo dibawa dari sebelum bulan ini, in = masuk bulan
    // ini, out = terjual bulan ini) secara eksplisit, terpisah dari rentang
    // tanggal bebas `groups` di atas.
    const currentStock = await computeCurrentStock({ cabangId, asOf: to });

    return NextResponse.json({ groups, snapshots, currentStock });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
