import { NextRequest, NextResponse } from 'next/server';
import { getAnnouncement, saveAnnouncement } from '@/lib/jsonbin';

// Route ini SELALU dijalankan dinamis (bukan di-cache statis Next.js) —
// tanpa ini, data baru (mis. feed/produk/harga terbaru) bisa 'macet' di
// snapshot lama sampai redeploy, karena Next.js App Router men-static-kan
// Route Handler GET yang tidak baca cookies/searchParams.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const announcement = await getAnnouncement();
    return NextResponse.json(announcement);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = typeof body?.text === 'string' ? body.text : '';
    const announcement = await saveAnnouncement(text.trim());
    return NextResponse.json(announcement);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
