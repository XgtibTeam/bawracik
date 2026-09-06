import { NextRequest, NextResponse } from 'next/server';
import { getMembers } from '@/lib/jsonbin';
import { normalizeWa } from '@/lib/phone';

// POST /api/members/search
//  { wa: string }    -> cari 1 member persis by nomor WA (dipakai alur lama)
//  { q: string }     -> cari BEBERAPA member by nama ATAU nomor HP (substring,
//                       tidak perlu persis) — dipakai fitur pencarian member
//                       baru di checkout kasir & self-checkout.
// Sengaja POST (bukan GET ?wa=...) supaya nomor WA member tidak nyantol di
// URL/riwayat browser/log server.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const members = await getMembers();

    const wa = (body?.wa || '').trim();
    if (wa) {
      const waNormal = normalizeWa(wa);
      const member = members.find((m) => normalizeWa(m.wa) === waNormal);
      return NextResponse.json({ member: member ?? null });
    }

    const q = (body?.q || '').trim().toLowerCase();
    if (!q) return NextResponse.json({ error: 'Isi nama atau nomor WA untuk mencari' }, { status: 400 });

    const results = members
      .filter((m) => m.nama.toLowerCase().includes(q) || m.wa.replace(/\D/g, '').includes(q.replace(/\D/g, '')))
      .slice(0, 15);
    return NextResponse.json({ members: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
