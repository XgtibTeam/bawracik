import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const ANON_COOKIE_NAME = 'baw_anon_id';

/** Baca ID anonim dari cookie kalau ada, atau bikin baru (belum disimpan ke cookie). */
export function readOrIssueAnonId(req: NextRequest): { id: string; isNew: boolean } {
  const existing = req.cookies.get(ANON_COOKIE_NAME)?.value;
  if (existing) return { id: existing, isNew: false };
  return { id: `guest-${randomUUID()}`, isNew: true };
}

/** Tempelkan cookie ID anonim ke response (dipanggil kalau isNew=true dari atas). */
export function attachAnonCookie(res: NextResponse, anonId: string): void {
  res.cookies.set(ANON_COOKIE_NAME, anonId, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

