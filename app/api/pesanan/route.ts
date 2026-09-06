import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { insertPesanan, getPesananList, getPesananById, updatePesanan, getPricingConfig } from '@/lib/supabase';
import { getBranches } from '@/lib/jsonbin';
import { hitungCheckout } from '@/lib/calc';
import { finalizeCheckout } from '@/lib/checkout';
import type { PesananStatus } from '@/lib/types';

// POST /api/pesanan — dibuat customer self-checkout (TANPA login). Belum
// jadi Transaction, cuma nunggu di-ACC kasir cabang di tab "Pesanan".
// Body: { cabangId, items: ChargeableItem[], ukuranBotolMl?, tipe, member?:
//         {wa,nama}, voucherCode?, buktiBayarUrl? }
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cabangId = body?.cabangId;
    const items = body?.items;
    const tipe: 'grosir' | 'ecer' = body?.tipe === 'grosir' ? 'grosir' : 'ecer';
    if (!cabangId) return NextResponse.json({ error: 'Cabang wajib dipilih' }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Keranjang kosong' }, { status: 400 });
    }
    const branches = await getBranches();
    if (!branches.find((b) => b.id === cabangId)) {
      return NextResponse.json({ error: 'Cabang tidak ditemukan' }, { status: 400 });
    }

    const pricingConfig = await getPricingConfig();
    const ukuranBotolMl = body?.ukuranBotolMl ? Number(body.ukuranBotolMl) : undefined;
    const calc = hitungCheckout(items, pricingConfig, ukuranBotolMl);

    const now = new Date().toISOString();
    const pesanan = {
      id: randomUUID(),
      cabangId,
      items: calc.items.map((it) => ({
        productId: it.productId,
        namaParfum: it.namaParfum,
        ml: it.ml,
        hargaPerMl: it.hargaPerMl,
        ukuranBotolMl: it.ukuranBotolMl,
        subtotal: it.subtotal,
      })),
      totalMl: calc.totalMl,
      totalHarga: calc.totalHarga,
      biayaBotol: calc.biayaBotol,
      tipe,
      memberWa: tipe === 'ecer' ? (body?.member?.wa || undefined) : undefined,
      memberNama: tipe === 'ecer' ? (body?.member?.nama || undefined) : undefined,
      memberId: tipe === 'ecer' ? (body?.member?.id || undefined) : undefined,
      voucherCode: body?.voucherCode || undefined,
      buktiBayarUrl: body?.buktiBayarUrl || undefined,
      status: 'pending' as PesananStatus,
      createdAt: now,
      updatedAt: now,
    };
    await insertPesanan(pesanan);
    return NextResponse.json({ pesanan });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/pesanan?status=pending — kasir/admin lihat daftar pesanan cabangnya
export async function GET(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin', 'kasir'].includes(session.role)) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 });
    }
    let cabangId = req.nextUrl.searchParams.get('cabangId') || undefined;
    if (session.role !== 'superadmin') cabangId = session.cabangId ?? undefined;
    const statusParam = req.nextUrl.searchParams.get('status');
    const status = statusParam ? (statusParam.split(',') as PesananStatus[]) : undefined;
    const list = await getPesananList({ cabangId, status });
    return NextResponse.json({ pesanan: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/pesanan — { id, action: 'acc' | 'selesai' | 'hapus' }
// 'acc'    -> validasi & buat Transaction beneran, atribusi ke kasir yang ACC
//             (BUKAN self-checkout di rekap), status jadi 'diterima'.
// 'selesai'-> tandai pesanan sudah selesai diambil/diproses (status akhir).
// 'hapus'  -> buang pesanan iseng/tidak valid, TIDAK membuat Transaction.
export async function PATCH(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin', 'kasir'].includes(session.role)) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 });
    }
    const body = await req.json();
    const id = body?.id as string;
    const action = body?.action as 'acc' | 'selesai' | 'hapus';
    if (!id || !action) return NextResponse.json({ error: 'id & action wajib diisi' }, { status: 400 });

    const pesanan = await getPesananById(id);
    if (!pesanan) return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    if (session.role !== 'superadmin' && pesanan.cabangId !== session.cabangId) {
      return NextResponse.json({ error: 'Pesanan bukan milik cabang ini' }, { status: 403 });
    }

    if (action === 'hapus') {
      await updatePesanan(id, { status: 'dihapus', diprosesOleh: session.username });
      return NextResponse.json({ ok: true });
    }

    if (action === 'selesai') {
      if (pesanan.status !== 'diterima') {
        return NextResponse.json({ error: 'Pesanan harus di-ACC dulu sebelum ditandai selesai' }, { status: 400 });
      }
      await updatePesanan(id, { status: 'selesai' });
      return NextResponse.json({ ok: true });
    }

    // action === 'acc'
    if (pesanan.status !== 'pending') {
      return NextResponse.json({ error: 'Pesanan ini sudah diproses' }, { status: 400 });
    }

    const result = await finalizeCheckout({
      cabangId: pesanan.cabangId,
      items: pesanan.items.map((it) => ({
        productId: it.productId,
        namaParfum: it.namaParfum,
        ml: it.ml,
        hargaPerMl: it.hargaPerMl,
        ukuranBotolMl: it.ukuranBotolMl,
      })),
      tipe: pesanan.tipe,
      member:
        pesanan.tipe === 'ecer'
          ? pesanan.memberId
            ? { id: pesanan.memberId }
            : pesanan.memberWa || pesanan.memberNama
            ? { wa: pesanan.memberWa, nama: pesanan.memberNama }
            : undefined
          : undefined,
      voucherCode: pesanan.voucherCode,
      karyawanId: session.username, // atribusi ke kasir yang ACC, BUKAN self-checkout
      metodeCheckout: 'kasir',
    });

    await updatePesanan(id, { status: 'diterima', transactionId: result.transactionId, diprosesOleh: session.username });
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
