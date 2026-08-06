import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { computeCurrentStock } from '@/lib/stock';

// Stok saat ini per produk (all-time: total masuk - total keluar), TIDAK
// terikat rentang tanggal seperti /api/stock-summary. Ini yang dipakai
// halaman kasir/stok & StokTab admin supaya begitu stok baru diinput,
// langsung kelihatan angkanya — bukan cuma tersimpan tanpa tampilan.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

    let cabangId = req.nextUrl.searchParams.get('cabangId') || undefined;
    if (session.role !== 'superadmin') cabangId = session.cabangId ?? undefined;
    if (!cabangId) return NextResponse.json({ error: 'Cabang wajib diisi' }, { status: 400 });

    const stocks = await computeCurrentStock({ cabangId });
    return NextResponse.json({ stocks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
