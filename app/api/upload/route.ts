import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { uploadPublicImage } from '@/lib/google-drive';

// Dipakai admin untuk upload logo toko, gambar QRIS, dan foto produk.
// Beda dari /api/attendance (yang uploadnya privat) — gambar di sini memang
// ditujukan tampil publik di website (etalase, homepage).
export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await req.json();
    const imageBase64 = body?.imageBase64 as string;
    const filename = (body?.filename || `upload-${Date.now()}.jpg`) as string;

    if (!imageBase64 || !imageBase64.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Gambar tidak valid' }, { status: 400 });
    }

    const { fileId, url } = await uploadPublicImage(imageBase64, filename, 'products');
    return NextResponse.json({ fileId, url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
