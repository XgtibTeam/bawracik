import { NextRequest, NextResponse } from 'next/server';
import { computeCurrentStock } from '@/lib/stock';

// GET /api/stock-current?cabangId=xxx  -> [{ productId, sisa, stokLama, stokIn, stokOut }]
// SENGAJA publik (tanpa login) — dipakai katalog self-checkout supaya tiap
// cabang yang dipilih customer nampilin sisa stok yang beda-beda per produk.
// Tidak membocorkan data sensitif, cuma angka sisa stok.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const cabangId = req.nextUrl.searchParams.get('cabangId');
    if (!cabangId) return NextResponse.json({ error: 'Cabang wajib diisi' }, { status: 400 });
    const statuses = await computeCurrentStock({ cabangId });
    return NextResponse.json({
      stok: statuses.map((s) => ({
        productId: s.productId,
        sisa: s.sisa,
        stokLama: s.stokLama,
        stokIn: s.stokIn,
        stokOut: s.stokOut,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
