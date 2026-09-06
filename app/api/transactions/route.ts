import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getTransactions } from '@/lib/supabase';
import { finalizeCheckout } from '@/lib/checkout';
import type { ChargeableItem } from '@/lib/calc';

// Body (checkout LANGSUNG oleh kasir/admin/superadmin yang login — customer
// self-checkout SEKARANG lewat /api/pesanan dulu, baru jadi Transaction di
// sini setelah kasir meng-ACC):
// {
//   cabangId: string,
//   items: [{ namaParfum, ml, hargaPerMl }],
//   ukuranBotolMl?: number,
//   tipe: 'grosir' | 'ecer',
//   member?: { wa, nama } | { id }
// }
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
    let cabangId = req.nextUrl.searchParams.get('cabangId') || undefined;
    if (session.role !== 'superadmin') cabangId = session.cabangId ?? undefined;
    const from = req.nextUrl.searchParams.get('from') || undefined;
    const to = req.nextUrl.searchParams.get('to') || undefined;
    const susulanOnly = req.nextUrl.searchParams.get('susulanOnly') === '1';
    const transactions = await getTransactions({ cabangId, from, to, susulanOnly });
    return NextResponse.json({ transactions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin', 'kasir'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Checkout langsung hanya untuk kasir/admin yang login. Customer pakai self-checkout (Pesanan).' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const cabangId = body?.cabangId || session.cabangId;
    const items: ChargeableItem[] = body?.items;
    const ukuranBotolMl = body?.ukuranBotolMl ? Number(body.ukuranBotolMl) : undefined;
    const tipe: 'grosir' | 'ecer' = body?.tipe === 'grosir' ? 'grosir' : 'ecer';
    // Input SUSULAN (lupa input kemarin/tanggal lain) — sengaja hanya bisa
    // dipakai dari sini (checkout kasir/admin/superadmin yang sudah login &
    // dicek di atas), TIDAK ada di jalur self-checkout customer (/api/pesanan).
    const susulan = !!body?.susulan;
    const tanggal = susulan && body?.tanggal ? String(body.tanggal) : undefined;

    if (!cabangId) return NextResponse.json({ error: 'Cabang wajib dipilih' }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Item belanja kosong' }, { status: 400 });
    }

    const result = await finalizeCheckout({
      cabangId,
      items,
      ukuranBotolMl,
      tipe,
      member: tipe === 'ecer' ? body?.member : undefined,
      voucherCode: body?.voucherCode || undefined,
      karyawanId: session.username,
      metodeCheckout: 'kasir',
      tanggal,
      susulan,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
