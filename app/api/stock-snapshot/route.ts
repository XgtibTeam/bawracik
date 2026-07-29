import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { upsertStockMonthSnapshot, getStockMonthSnapshots } from '@/lib/supabase';

// Stok awal & stok akhir — SENGAJA hanya level bulanan (bukan harian).
// stokAwal boleh diisi kapan saja di awal bulan, stokAkhir boleh diisi
// kapan saja di akhir bulan — dipakai buat cross-check otomatis berapa
// selisih/minus antara catatan sistem (masuk-keluar) vs stok fisik riil.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

    let cabangId = req.nextUrl.searchParams.get('cabangId') || undefined;
    if (session.role !== 'superadmin') cabangId = session.cabangId ?? undefined;
    const productId = req.nextUrl.searchParams.get('productId') || undefined;
    const yearMonth = req.nextUrl.searchParams.get('yearMonth') || undefined;

    const snapshots = await getStockMonthSnapshots({ cabangId, productId, yearMonth });
    return NextResponse.json({ snapshots });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin', 'kasir'].includes(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const body = await req.json();
    const cabangId = body?.cabangId || session.cabangId;
    if (!cabangId) return NextResponse.json({ error: 'Cabang wajib diisi' }, { status: 400 });
    const productId = body?.productId as string;
    if (!productId) return NextResponse.json({ error: 'Produk wajib dipilih' }, { status: 400 });
    const yearMonth = body?.yearMonth as string; // YYYY-MM
    if (!yearMonth) return NextResponse.json({ error: 'Bulan wajib diisi' }, { status: 400 });

    const stokAwal = body?.stokAwal === '' || body?.stokAwal === undefined || body?.stokAwal === null ? null : Number(body.stokAwal);
    const stokAkhir = body?.stokAkhir === '' || body?.stokAkhir === undefined || body?.stokAkhir === null ? null : Number(body.stokAkhir);

    const snapshot = {
      id: `${cabangId}:${productId}:${yearMonth}`,
      cabangId,
      productId,
      yearMonth,
      stokAwal,
      stokAkhir,
      updatedBy: session.username,
      updatedAt: new Date().toISOString(),
    };
    await upsertStockMonthSnapshot(snapshot);
    return NextResponse.json({ snapshot });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
