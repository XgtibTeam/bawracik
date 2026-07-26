import { NextRequest, NextResponse } from 'next/server';
import { getMembers } from '@/lib/jsonbin';
import { normalizeWa } from '@/lib/phone';

// POST /api/members/search  { wa: string }  -> cari 1 member
// Sengaja POST (bukan GET ?wa=...) supaya nomor WA member tidak nyantol di
// URL/riwayat browser/log server.
// Route ini SELALU dijalankan dinamis (bukan di-cache statis Next.js).
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wa = (body?.wa || '').trim();
    if (!wa) {
      return NextResponse.json({ error: 'Nomor WA wajib diisi' }, { status: 400 });
    }
    const waNormal = normalizeWa(wa);
    const members = await getMembers();
    const member = members.find((m) => normalizeWa(m.wa) === waNormal);
    return NextResponse.json({ member: member ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
