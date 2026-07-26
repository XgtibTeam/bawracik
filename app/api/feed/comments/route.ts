import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getFeedComments, createFeedComment, deleteFeedComment } from '@/lib/supabase';

// GET /api/feed/comments?postId=xxx
export async function GET(req: NextRequest) {
  try {
    const postId = req.nextUrl.searchParams.get('postId');
    if (!postId) return NextResponse.json({ error: 'postId wajib diisi' }, { status: 400 });
    const comments = await getFeedComments(postId);
    return NextResponse.json({ comments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST { postId, komentar, nama? } — nama wajib kalau belum login member
// (member yang sudah login otomatis pakai nama akunnya).
export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    const body = await req.json();
    const postId = body?.postId;
    const komentar = (body?.komentar || '').trim();
    const namaTamu = (body?.nama || '').trim();

    if (!postId || !komentar) {
      return NextResponse.json({ error: 'postId dan komentar wajib diisi' }, { status: 400 });
    }
    if (komentar.length > 500) {
      return NextResponse.json({ error: 'Komentar terlalu panjang (maks 500 karakter)' }, { status: 400 });
    }

    const nama = session?.role === 'member' ? session.nama : namaTamu;
    if (!nama) {
      return NextResponse.json({ error: 'Nama wajib diisi untuk komentar tanpa login' }, { status: 400 });
    }

    const comment = await createFeedComment({ id: randomUUID(), postId, nama, komentar });
    return NextResponse.json({ comment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE { id } — hanya admin/superadmin (moderasi komentar tidak pantas).
export async function DELETE(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    const body = await req.json();
    const id = body?.id;
    if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 });
    await deleteFeedComment(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
