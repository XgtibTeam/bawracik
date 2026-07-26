import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, verifyPassword, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getEmployees } from '@/lib/jsonbin';

// Login untuk superadmin, admin (per-cabang), dan kasir/karyawan.
// Superadmin pertama dibuat dari env (lihat SUPERADMIN_USERNAME / SUPERADMIN_PASSWORD)
// supaya selalu ada 1 akun yang bisa masuk walau bin `employees` masih kosong.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const username = (body?.username || '').trim();
    const password = body?.password || '';

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    // Bootstrap superadmin dari .env (dipakai sekali sebelum ada data di bin employees)
    const envUser = process.env.SUPERADMIN_USERNAME;
    const envPass = process.env.SUPERADMIN_PASSWORD;
    if (envUser && envPass && username === envUser && password === envPass) {
      const token = await createSessionToken({
        role: 'superadmin',
        username,
        nama: 'Super Admin',
        cabangId: null,
      });
      return withSessionCookie(token);
    }

    const employees = await getEmployees();
    const employee = employees.find((e) => e.username === username);
    if (!employee) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const valid = await verifyPassword(password, employee.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const token = await createSessionToken({
      role: employee.role,
      username: employee.username,
      nama: employee.nama,
      cabangId: employee.cabangId,
    });
    return withSessionCookie(token);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan saat login' }, { status: 500 });
  }
}

function withSessionCookie(token: string) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 jam
  });
  return res;
}
