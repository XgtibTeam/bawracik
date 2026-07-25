import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getFeedPosts, createFeedPost, deleteFeedPost } from '@/lib/supabase';
import { uploadPublicImage } from '@/lib/google-drive';
import { getBranches } from '@/lib/jsonbin';

export async function GET() {
  try {
    const posts = await getFeedPosts(100);
    return NextResponse.json({ posts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Body: { photoBase64, deskripsi, cabangId? } (lokasi dari daftar cabang)
//   ATAU { photoBase64, deskripsi, lat, lng } (lokasi otomatis dari GPS)
export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || session.role !== 'member') {
      return NextResponse.json({ error: 'Khusus member, silakan masuk dulu' }, { status: 401 });
    }

    const body = await req.json();
    const photoBase64 = body?.photoBase64;
    const deskripsi = (body?.deskripsi || '').trim();
    const cabangId = body?.cabangId ? String(body.cabangId) : undefined;
    const lat = body?.lat;
    const lng = body?.lng;

    if (!photoBase64) {
      return NextResponse.json({ error: 'Foto wajib diisi' }, { status: 400 });
    }

    let cabangNama: string | undefined;
    if (cabangId) {
      const branches = await getBranches();
      cabangNama = branches.find((b) => b.id === cabangId)?.nama;
    }

    let lokasiAuto: string | undefined;
    if (!cabangId && typeof lat === 'number' && typeof lng === 'number') {
      lokasiAuto = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    const filename = `feed-${session.username}-${Date.now()}.jpg`;
    const { fileId } = await uploadPublicImage(photoBase64, filename, 'feed');

    const post = await createFeedPost({
      id: randomUUID(),
      memberId: session.username,
      memberNama: session.nama,
      photoDriveId: fileId,
      deskripsi,
      cabangId,
      cabangNama,
      lokasiAuto,
    });

    return NextResponse.json({ post });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || session.role !== 'member') {
      return NextResponse.json({ error: 'Khusus member, silakan masuk dulu' }, { status: 401 });
    }
    const body = await req.json();
    const id = body?.id;
    if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 });

    await deleteFeedPost(id, session.username);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
