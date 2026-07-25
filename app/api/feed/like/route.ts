import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { toggleFeedLike } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || session.role !== 'member') {
      return NextResponse.json({ error: 'Khusus member, silakan masuk dulu' }, { status: 401 });
    }
    const body = await req.json();
    const postId = body?.postId;
    if (!postId) return NextResponse.json({ error: 'postId wajib diisi' }, { status: 400 });

    const likes = await toggleFeedLike(postId, session.username);
    return NextResponse.json({ likes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
