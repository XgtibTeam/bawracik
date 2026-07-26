import { NextRequest, NextResponse } from 'next/server';
import { getVouchers, getMembers } from '@/lib/jsonbin';

// Endpoint publik (TIDAK di-guard middleware) — dipakai belanja/kasir utk cek
// kode voucher sebelum checkout, tanpa membocorkan daftar voucher lengkap.
// Route ini SELALU dijalankan dinamis (bukan di-cache statis Next.js) —
// tanpa ini, data baru (mis. feed/produk/harga terbaru) bisa 'macet' di
// snapshot lama sampai redeploy, karena Next.js App Router men-static-kan
// Route Handler GET yang tidak baca cookies/searchParams.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!code) {
      return NextResponse.json({ valid: false, error: 'Kode voucher wajib diisi' }, { status: 400 });
    }

    const vouchers = await getVouchers();
    const voucher = vouchers.find((v) => v.code === code);
    if (!voucher) {
      return NextResponse.json({ valid: false, error: 'Kode voucher tidak ditemukan' });
    }
    if (!voucher.aktif) {
      return NextResponse.json({ valid: false, error: 'Voucher tidak aktif' });
    }
    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Voucher sudah kedaluwarsa' });
    }

    const memberWa = typeof body?.memberWa === 'string' ? body.memberWa.trim() : '';
    if (memberWa) {
      const members = await getMembers();
      const member = members.find((m) => m.wa === memberWa);
      if (member && voucher.dipakaiOleh.includes(member.id)) {
        return NextResponse.json({ valid: false, error: 'Voucher sudah pernah dipakai member ini' });
      }
    }

    return NextResponse.json({ valid: true, tipe: voucher.tipe, nilai: voucher.nilai });
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err.message }, { status: 500 });
  }
}
