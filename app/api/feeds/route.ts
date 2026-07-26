import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getFeedPosts, insertFeedPost, deleteFeedPost } from '@/lib/supabase';

// GET /api/feeds?likerKey=xxx — publik, tanpa login. likerKey opsional dipakai
// untuk menandai post mana yang sudah di-like oleh device/member ini.
export async function GET(req: NextRequest) {
  try {
    const likerKey = req.nextUrl.searchParams.get('likerKey') || undefined;
    const posts = await getFeedPosts(likerKey);
    return NextResponse.json({ posts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — hanya staff (admin/kasir/superadmin) yang bisa posting ke feeds.
export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin', 'kasir'].includes(session.role)) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 });
    }

    const body = await req.json();
    const imageUrl = body?.imageUrl;
    const caption = (body?.caption || '').trim();
    if (!imageUrl) {
      return NextResponse.json({ error: 'Gambar wajib diupload dulu' }, { status: 400 });
    }

    const post = {
      id: randomUUID(),
      caption,
      imageUrl,
      createdBy: session.username,
      createdAt: new Date().toISOString(),
    };
    await insertFeedPost(post);
    return NextResponse.json({ post });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — moderasi, hanya admin/superadmin (feeds jelek bisa dihapus).
export async function DELETE(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    const body = await req.json();
    const id = body?.id;
    if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 });
    await deleteFeedPost(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
