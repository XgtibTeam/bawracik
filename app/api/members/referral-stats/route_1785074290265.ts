import { NextRequest, NextResponse } from 'next/server';
import { getMembers } from '@/lib/jsonbin';

// GET /api/members/referral-stats?code=12345 -> { count }
// Dipakai halaman "Undang Teman" supaya tidak perlu fetch semua data member.
// Route ini SELALU dijalankan dinamis (bukan di-cache statis Next.js) —
// tanpa ini, data baru (mis. feed/produk/harga terbaru) bisa 'macet' di
// snapshot lama sampai redeploy, karena Next.js App Router men-static-kan
// Route Handler GET yang tidak baca cookies/searchParams.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    if (!code) return NextResponse.json({ error: 'code wajib diisi' }, { status: 400 });

    const members = await getMembers();
    const count = members.filter((m) => m.direferralOleh === code).length;
    return NextResponse.json({ count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
