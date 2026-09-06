import { NextRequest, NextResponse } from 'next/server';
import { getStoreProfile, saveStoreProfile } from '@/lib/jsonbin';

// Route ini SELALU dijalankan dinamis (bukan di-cache statis Next.js) —
// tanpa ini, data baru (mis. feed/produk/harga terbaru) bisa 'macet' di
// snapshot lama sampai redeploy, karena Next.js App Router men-static-kan
// Route Handler GET yang tidak baca cookies/searchParams.
export const dynamic = 'force-dynamic';

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
      slogan: body?.slogan ?? current.slogan,
      deskripsi: body?.deskripsi ?? current.deskripsi,
      ctaText: body?.ctaText ?? current.ctaText,
      footerText: body?.footerText ?? current.footerText,
      logoUrl: body?.logoUrl ?? current.logoUrl,
      logos: Array.isArray(body?.logos) ? body.logos : current.logos,
      socialMedia: { ...current.socialMedia, ...(body?.socialMedia ?? {}) },
      pembayaran: { ...current.pembayaran, ...(body?.pembayaran ?? {}) },
      homeSections: Array.isArray(body?.homeSections) ? body.homeSections : current.homeSections,
      colorScheme: body?.colorScheme === 'maroon' ? 'maroon' : body?.colorScheme === 'hijau' ? 'hijau' : current.colorScheme,
    };
    await saveStoreProfile(updated);
    return NextResponse.json({ profile: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
