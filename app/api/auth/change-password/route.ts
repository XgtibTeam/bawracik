import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, verifyPassword, hashPassword, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getEmployees, saveEmployees } from '@/lib/jsonbin';

// Karyawan/admin ganti password sendiri. Superadmin yang login pakai
// SUPERADMIN_USERNAME/SUPERADMIN_PASSWORD dari .env TIDAK bisa ganti lewat sini
// (env bukan data yang bisa ditulis ulang oleh server) — ganti manual di .env.local.
export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin', 'kasir'].includes(session.role)) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 });
    }

    const body = await req.json();
    const passwordLama = body?.passwordLama || '';
    const passwordBaru = body?.passwordBaru || '';
    if (!passwordLama || !passwordBaru) {
      return NextResponse.json({ error: 'Password lama dan baru wajib diisi' }, { status: 400 });
    }
    if (passwordBaru.length < 6) {
      return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
    }

    const employees = await getEmployees();
    const idx = employees.findIndex((e) => e.username === session.username);
    if (idx === -1) {
      return NextResponse.json(
        {
          error:
            'Akun ini login lewat SUPERADMIN_USERNAME/PASSWORD di .env.local, bukan dari data karyawan — ganti langsung di .env.local lalu deploy ulang.',
        },
        { status: 400 }
      );
    }

    const valid = await verifyPassword(passwordLama, employees[idx].passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Password lama salah' }, { status: 401 });
    }

    employees[idx].passwordHash = await hashPassword(passwordBaru);
    await saveEmployees(employees);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
