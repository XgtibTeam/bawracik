import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { insertStockMovement, getStockMovements } from '@/lib/supabase';

// Ledger stok "masuk" — admin/kasir cabang input berapa KG parfum yang baru
// datang, sistem yang konversi ke ML (1kg = 1000ml) dan mencatatnya sebagai
// penambahan pada tanggal itu. "Keluar" dihitung otomatis dari penjualan
// (lihat lib/stock.ts), tidak diinput manual di sini.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

    let cabangId = req.nextUrl.searchParams.get('cabangId') || undefined;
    if (session.role !== 'superadmin') cabangId = session.cabangId ?? undefined;
    const productId = req.nextUrl.searchParams.get('productId') || undefined;
    const from = req.nextUrl.searchParams.get('from') || undefined;
    const to = req.nextUrl.searchParams.get('to') || undefined;

    const movements = await getStockMovements({ cabangId, productId, from, to });
    return NextResponse.json({ movements });
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
    const kg = Number(body?.kg);
    if (!kg || kg <= 0) return NextResponse.json({ error: 'Jumlah KG harus lebih dari 0' }, { status: 400 });
    const tanggal = body?.tanggal || new Date().toISOString().slice(0, 10);

    const movement = {
      id: randomUUID(),
      cabangId,
      productId,
      tanggal,
      kg,
      ml: kg * 1000,
      createdBy: session.username,
      createdAt: new Date().toISOString(),
    };
    await insertStockMovement(movement);
    return NextResponse.json({ movement });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
