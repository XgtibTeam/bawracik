import { NextRequest, NextResponse } from 'next/server';
import { uploadPublicImage } from '@/lib/google-drive';

// Upload bukti bayar (screenshot QRIS) dari customer self-checkout — SENGAJA
// publik (customer belum tentu login), tapi cuma boleh gambar & masuk ke
// folder 'bukti' saja (tidak bisa dipakai ganti foto produk/logo dsb).
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageBase64 = body?.imageBase64 as string;
    if (!imageBase64 || !imageBase64.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Gambar tidak valid' }, { status: 400 });
    }
    const filename = `bukti-${Date.now()}.jpg`;
    const { fileId, url } = await uploadPublicImage(imageBase64, filename, 'bukti');
    return NextResponse.json({ fileId, url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
