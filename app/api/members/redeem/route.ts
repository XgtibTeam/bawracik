import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getMembers, saveMembers } from '@/lib/jsonbin';

// POST /api/members/redeem  { memberId }
// Menandai 1 reward parfum gratis (dari pencapaian tiap 10x pengisian)
// sebagai SUDAH dipakai. Hanya kasir/admin yang login yang boleh proses ini
// (dilakukan di halaman kasir saat cari member & klik tombol "Tukar").
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin', 'kasir'].includes(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }
    const body = await req.json();
    const memberId = body?.memberId as string;
    if (!memberId) return NextResponse.json({ error: 'memberId wajib diisi' }, { status: 400 });

    const members = await getMembers();
    const idx = members.findIndex((m) => m.id === memberId);
    if (idx < 0) return NextResponse.json({ error: 'Member tidak ditemukan' }, { status: 404 });

    const member = members[idx];
    const tersedia = (member.totalPenukaran || 0) - (member.penukaranTerpakai || 0);
    if (tersedia <= 0) {
      return NextResponse.json({ error: 'Member ini belum punya reward parfum gratis yang bisa ditukar' }, { status: 400 });
    }

    members[idx] = { ...member, penukaranTerpakai: (member.penukaranTerpakai || 0) + 1 };
    await saveMembers(members);

    return NextResponse.json({ member: members[idx] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
