import { NextRequest, NextResponse } from 'next/server';
import { getVouchers, saveVouchers } from '@/lib/jsonbin';
import type { Voucher } from '@/lib/types';

function randomCode5(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

export async function GET() {
  try {
    const vouchers = await getVouchers();
    return NextResponse.json({ vouchers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Auth (superadmin/admin) sudah dicek middleware.ts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tipe = body?.tipe === 'potongan' ? 'potongan' : 'persen';
    const nilai = Number(body?.nilai);
    if (!nilai || nilai <= 0) {
      return NextResponse.json({ error: 'Nilai voucher wajib diisi' }, { status: 400 });
    }

    const vouchers = await getVouchers();
    let code = randomCode5();
    while (vouchers.some((v) => v.code === code)) code = randomCode5();

    const voucher: Voucher = {
      code,
      tipe,
      nilai,
      aktif: true,
      expiresAt: body?.expiresAt || undefined,
      dipakaiOleh: [],
      createdAt: new Date().toISOString(),
    };
    await saveVouchers([...vouchers, voucher]);
    return NextResponse.json({ voucher });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const code = body?.code;
    const vouchers = await getVouchers();
    const updated = vouchers.filter((v) => v.code !== code);
    await saveVouchers(updated);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const code = body?.code;
    const vouchers = await getVouchers();
    const idx = vouchers.findIndex((v) => v.code === code);
    if (idx === -1) return NextResponse.json({ error: 'Voucher tidak ditemukan' }, { status: 404 });
    vouchers[idx].aktif = body?.aktif ?? vouchers[idx].aktif;
    await saveVouchers(vouchers);
    return NextResponse.json({ voucher: vouchers[idx] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
