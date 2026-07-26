import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { toggleFeedLike } from '@/lib/supabase';
import { readOrIssueAnonId, attachAnonCookie } from '@/lib/anon';

export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    const body = await req.json();
    const postId = body?.postId;
    if (!postId) return NextResponse.json({ error: 'postId wajib diisi' }, { status: 400 });

    // Boleh like tanpa login: member pakai nomor WA, tamu pakai ID anonim
    // dari cookie (supaya satu orang tidak bisa like berkali-kali).
    const { id: likeId, isNew } = session?.role === 'member'
      ? { id: session.username, isNew: false }
      : readOrIssueAnonId(req);

    const likes = await toggleFeedLike(postId, likeId);
    const res = NextResponse.json({ likes });
    if (isNew) attachAnonCookie(res, likeId);
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
