import { NextRequest, NextResponse } from 'next/server';
import { getPhotoDataUrl } from '@/lib/google-drive';

// Route ini SELALU dijalankan dinamis (bukan di-cache statis Next.js) —
// tanpa ini, data baru (mis. feed/produk/harga terbaru) bisa 'macet' di
// snapshot lama sampai redeploy, karena Next.js App Router men-static-kan
// Route Handler GET yang tidak baca cookies/searchParams.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path'); // ini adalah Google Drive File ID
    if (!path) {
      return NextResponse.json({ error: 'Parameter path wajib diisi' }, { status: 400 });
    }
    const url = await getPhotoDataUrl(path);
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
