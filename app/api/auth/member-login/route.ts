import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getMembers, saveMembers } from '@/lib/jsonbin';

function randomCode5(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// Member Area login cukup pakai nomor WA (tidak pakai password).
// Kalau nomor belum terdaftar, otomatis dibuatkan member baru.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const wa = (body?.wa || '').trim();
  const nama = (body?.nama || '').trim();
  const referralCode = (body?.referralCode || '').trim();

  if (!wa) {
    return NextResponse.json({ error: 'Nomor WA wajib diisi' }, { status: 400 });
  }

  const members = await getMembers();
  let member = members.find((m) => m.wa === wa);

  if (!member) {
    if (!nama) {
      return NextResponse.json(
        { error: 'Member baru, nama wajib diisi untuk daftar' },
        { status: 400 }
      );
    }

    let direferralOleh: string | undefined;
    if (referralCode) {
      const referrer = members.find((m) => m.kodeReferral === referralCode);
      if (referrer) {
        direferralOleh = referralCode;
        // Bonus poin ke pemberi referral: random 10-15
        const bonus = Math.floor(10 + Math.random() * 6);
        referrer.poinTotal += bonus;
        referrer.poinSaatIni += bonus;
      }
    }

    member = {
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
    members.push(member);
    await saveMembers(members);
  }

  const token = await createSessionToken({
    role: 'member',
    username: member.wa,
    nama: member.nama,
    cabangId: null,
  });

  const res = NextResponse.json({ ok: true, member });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 hari
  });
  return res;
}
