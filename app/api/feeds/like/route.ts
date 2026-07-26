import { NextRequest, NextResponse } from 'next/server';
import { toggleFeedLike } from '@/lib/supabase';

// Publik — tidak perlu login. likerKey adalah nomor WA (kalau member sedang
// login) atau id anonim yang di-generate & disimpan di localStorage browser.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const postId = body?.postId;
    const likerKey = (body?.likerKey || '').trim();
    if (!postId || !likerKey) {
      return NextResponse.json({ error: 'postId dan likerKey wajib diisi' }, { status: 400 });
    }
    const result = await toggleFeedLike(postId, likerKey);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
