import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { insertStockMovement } from '@/lib/supabase';

// POST /api/stock-topup
//
// "Stok Jual" manual — beda dari /api/stock-movements (yang itu buat admin
// input stok BULANAN dalam KG pas barang baru datang dari supplier).
// Endpoint ini buat KARYAWAN sendiri, langsung dalam ML, waktu produk yang
// mau dijual kehabisan di tengah jualan tapi stok fisiknya sebenarnya masih
// ada (cuma belum sempat diinput admin) — biar nggak macet di kasir.
//
// Sengaja dibatasi jumlahnya per submit (maksimal 2000ml) supaya ini tetap
// jadi "topup cepat buat lanjut jualan", bukan pengganti input stok resmi
// admin yang bulanan.
export const dynamic = 'force-dynamic';

const MAX_ML_PER_TOPUP = 2000;

export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin', 'kasir'].includes(session.role)) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 });
    }

    const body = await req.json();
    const cabangId = body?.cabangId || session.cabangId;
    if (!cabangId) return NextResponse.json({ error: 'Cabang wajib diisi' }, { status: 400 });
    const productId = body?.productId as string;
    if (!productId) return NextResponse.json({ error: 'Produk wajib dipilih' }, { status: 400 });
    const ml = Number(body?.ml);
    if (!ml || ml <= 0) return NextResponse.json({ error: 'Jumlah ml harus lebih dari 0' }, { status: 400 });
    if (ml > MAX_ML_PER_TOPUP) {
      return NextResponse.json(
        { error: `Maksimal ${MAX_ML_PER_TOPUP}ml sekali topup — kalau lebih dari itu, minta admin input stok resmi.` },
        { status: 400 }
      );
    }

    const movement = {
      id: randomUUID(),
      cabangId,
      productId,
      tanggal: new Date().toISOString().slice(0, 10),
      kg: ml / 1000,
      ml,
      createdBy: session.username,
      createdAt: new Date().toISOString(),
    };
    await insertStockMovement(movement);
    return NextResponse.json({ movement });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
