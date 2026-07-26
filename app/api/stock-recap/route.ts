import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { upsertStockRecap, getStockRecap } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const cabangId = req.nextUrl.searchParams.get('cabangId') || undefined;
    const periode = (req.nextUrl.searchParams.get('periode') as any) || undefined;
    const productId = req.nextUrl.searchParams.get('productId') || undefined;
    const recap = await getStockRecap({ cabangId, periode, productId });
    return NextResponse.json({ recap });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

    const body = await req.json();
    const cabangId = body?.cabangId || session.cabangId;
    if (!cabangId) return NextResponse.json({ error: 'Cabang wajib diisi' }, { status: 400 });

    await upsertStockRecap({
      id: body?.id || randomUUID(),
      cabangId,
      productId: body.productId,
      periode: body.periode,
      tanggal: body.tanggal,
      stokAwal: Number(body.stokAwal) || 0,
      stokAkhir: Number(body.stokAkhir) || 0,
      createdBy: session.username,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
