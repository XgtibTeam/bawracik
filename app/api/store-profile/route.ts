import { NextRequest, NextResponse } from 'next/server';
import { getStoreProfile, saveStoreProfile } from '@/lib/jsonbin';

export async function GET() {
  try {
    const profile = await getStoreProfile();
    return NextResponse.json({ profile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Auth (superadmin/admin) sudah dicek middleware.ts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = await getStoreProfile();
    const updated = {
      ...current,
      namaToko: body?.namaToko ?? current.namaToko,
      deskripsi: body?.deskripsi ?? current.deskripsi,
      logoUrl: body?.logoUrl ?? current.logoUrl,
      socialMedia: { ...current.socialMedia, ...(body?.socialMedia ?? {}) },
      pembayaran: { ...current.pembayaran, ...(body?.pembayaran ?? {}) },
    };
    await saveStoreProfile(updated);
    return NextResponse.json({ profile: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
