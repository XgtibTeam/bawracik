import { NextRequest, NextResponse } from 'next/server';
import { getPhotoBuffer } from '@/lib/google-drive';

// Proxy publik untuk gambar yang disimpan di Google Drive (logo toko, foto
// produk/katalog, foto feed member). SENGAJA tidak butuh login — dipakai
// langsung di <img src> di halaman publik (beranda, katalog, feed).
//
// Kenapa perlu proxy sendiri, bukan link langsung ke drive.google.com?
// Karena drive.google.com/uc?export=view dan /thumbnail SERING gagal
// dipasang langsung di <img> (Google kadang balas halaman HTML "konfirmasi
// download" alih-alih bytes gambar, atau memblokir hotlink) — itu penyebab
// gambar tidak muncul di banyak tempat. Di sini kita ambil bytes-nya
// server-side lewat Drive API (OAuth) lalu teruskan langsung sebagai
// response gambar, jadi tidak bergantung pada perilaku hotlink Google sama
// sekali.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const fileId = params.id;
  if (!fileId) {
    return NextResponse.json({ error: 'ID gambar wajib diisi' }, { status: 400 });
  }
  try {
    const { buffer, mimeType } = await getPhotoBuffer(fileId);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        // Cache lama di browser/CDN karena isi file dengan ID yang sama tidak
        // pernah berubah (upload baru = ID baru).
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat gambar' }, { status: 404 });
  }
}
