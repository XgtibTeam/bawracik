import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { insertStockMovement } from '@/lib/supabase';

// POST /api/stock-topup
//
// Input "Stok Jual" langsung oleh KARYAWAN/kasir, dalam ML — beda dari
// /api/stock-movements (itu input stok BULANAN dalam KG, khusus admin).
// Sekarang bisa dipakai KAPAN AJA (bukan cuma pas produk kehabisan) —
// setiap kali dipanggil, langsung nambah ke ledger stock_movements dan
// langsung kehitung sebagai sisa/stok jual di computeCurrentStock(), tanpa
// approval atau jeda: "stok in = stok jual", satu langkah.
//
// Batas 2000ml per submit TETAP dipertahankan sebagai guard anti salah-ketik
// (bukan pembatas alur) — buat jumlah besar, karyawan tinggal submit
// berkali-kali dan tiap submit tetap langsung nambah stok jual seketika.
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
        { error: `Maksimal ${MAX_ML_PER_TOPUP}ml sekali submit — kalau lebih, submit lagi beberapa kali, langsung kehitung ke stok jual tiap submit.` },
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
