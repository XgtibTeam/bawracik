import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getFeedComments, insertFeedComment } from '@/lib/supabase';

// GET /api/feeds/comments?postId=xxx — publik
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

// POST — publik, tidak perlu login, cukup isi nama
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const postId = body?.postId;
    const nama = (body?.nama || '').trim();
    const isi = (body?.isi || '').trim();
    if (!postId || !nama || !isi) {
      return NextResponse.json({ error: 'Nama dan komentar wajib diisi' }, { status: 400 });
    }
    const comment = {
      id: randomUUID(),
      postId,
      nama,
      isi,
      createdAt: new Date().toISOString(),
    };
    await insertFeedComment(comment);
    return NextResponse.json({ comment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
