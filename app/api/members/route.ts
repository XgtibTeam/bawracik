import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getMembers, saveMembers } from '@/lib/jsonbin';
import { verifySessionToken, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { normalizeWa } from '@/lib/phone';

function randomCode5(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// GET /api/members?wa=0812xxxx  -> cari 1 member
// GET /api/members               -> semua member (dipakai kasir utk dropdown pilih member)
// Route ini SELALU dijalankan dinamis (bukan di-cache statis Next.js) —
// tanpa ini, data baru (mis. feed/produk/harga terbaru) bisa 'macet' di
// snapshot lama sampai redeploy, karena Next.js App Router men-static-kan
// Route Handler GET yang tidak baca cookies/searchParams.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const wa = req.nextUrl.searchParams.get('wa');
    const members = await getMembers();
    if (wa) {
      const waNormal = normalizeWa(wa);
      const member = members.find((m) => normalizeWa(m.wa) === waNormal);
      return NextResponse.json({ member: member ?? null });
    }
    return NextResponse.json({ members });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Dipakai kasir untuk tambah member baru langsung saat checkout.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nama = (body?.nama || '').trim();
    const wa = (body?.wa || '').trim();
    const referralCode = (body?.referralCode || '').trim();

    if (!nama) {
      return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });
    }

    const waNormal = wa ? normalizeWa(wa) : '';
    const members = await getMembers();
    if (waNormal && members.some((m) => normalizeWa(m.wa) === waNormal)) {
      return NextResponse.json({ error: 'Nomor WA sudah terdaftar sebagai member' }, { status: 400 });
    }

    let direferralOleh: string | undefined;
    if (referralCode) {
      const referrer = members.find((m) => m.kodeReferral === referralCode);
      if (referrer) {
        direferralOleh = referralCode;
        const bonus = Math.floor(10 + Math.random() * 6); // 10-15 poin
        referrer.poinTotal += bonus;
        referrer.poinSaatIni += bonus;
      }
    }

    const member = {
      id: randomUUID(),
      nama,
      wa: waNormal,
      poinTotal: 0,
      poinSaatIni: 0,
      pengisianKe: 0,
      totalPenukaran: 0,
      penukaranTerpakai: 0,
      riwayat: [],
      kodeReferral: randomCode5(),
      direferralOleh,
      createdAt: new Date().toISOString(),
    };

    await saveMembers([...members, member]);
    return NextResponse.json({ member });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Member mengedit profil sendiri (saat ini: nama). Diverifikasi dari session,
// bukan dari body, supaya member tidak bisa mengedit profil member lain.
export async function PATCH(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || session.role !== 'member') {
      return NextResponse.json({ error: 'Khusus member, silakan masuk dulu' }, { status: 401 });
    }

    const body = await req.json();
    const nama = (body?.nama || '').trim();
    if (!nama) {
      return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });
    }

    const members = await getMembers();
    const idx = members.findIndex((m) => m.wa === session.username);
    if (idx === -1) {
      return NextResponse.json({ error: 'Member tidak ditemukan' }, { status: 404 });
    }

    members[idx] = { ...members[idx], nama };
    await saveMembers(members);

    // Sesi (cookie) menyimpan nama member saat login dulu — kalau tidak
    // diperbarui di sini, feed post baru & sapaan akan tetap pakai nama LAMA
    // sampai member logout-login ulang. Terbitkan ulang token sesi dengan nama baru.
    const newToken = await createSessionToken({
      role: 'member',
      username: session.username,
      nama,
      cabangId: null,
    });
    const res = NextResponse.json({ member: members[idx] });
    res.cookies.set(SESSION_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
