import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getMembers, saveMembers } from '@/lib/jsonbin';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

function randomCode5(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// GET /api/members?wa=0812xxxx  -> cari 1 member
// GET /api/members               -> semua member (dipakai kasir utk dropdown pilih member)
export async function GET(req: NextRequest) {
  try {
    const wa = req.nextUrl.searchParams.get('wa');
    const members = await getMembers();
    if (wa) {
      const member = members.find((m) => m.wa === wa);
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

    if (!nama || !wa) {
      return NextResponse.json({ error: 'Nama dan nomor WA wajib diisi' }, { status: 400 });
    }

    const members = await getMembers();
    if (members.some((m) => m.wa === wa)) {
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
      wa,
      poinTotal: 0,
      poinSaatIni: 0,
      pengisianKe: 0,
      totalPenukaran: 0,
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
    return NextResponse.json({ member: members[idx] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
