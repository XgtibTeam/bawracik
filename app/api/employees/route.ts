import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getEmployees, saveEmployees } from '@/lib/jsonbin';
import { hashPassword, verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

// GET: daftar karyawan (password hash tidak pernah dikirim ke client)
// Route ini SELALU dijalankan dinamis (bukan di-cache statis Next.js) —
// tanpa ini, data baru (mis. feed/produk/harga terbaru) bisa 'macet' di
// snapshot lama sampai redeploy, karena Next.js App Router men-static-kan
// Route Handler GET yang tidak baca cookies/searchParams.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const employees = await getEmployees();
    const safe = employees.map(({ passwordHash, ...rest }) => rest);
    return NextResponse.json({ employees: safe });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: tambah karyawan/admin baru. Hanya oleh admin (middleware sudah cek login),
// dan admin biasa (bukan superadmin) hanya boleh menambah untuk cabangnya sendiri.
export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await req.json();
    const nama = (body?.nama || '').trim();
    const username = (body?.username || '').trim();
    const password = body?.password || '';
    let role = body?.role as 'admin' | 'kasir' | 'superadmin';
    let cabangId = body?.cabangId ? String(body.cabangId) : null;

    if (!nama || !username || !password || !role) {
      return NextResponse.json(
        { error: 'Nama, username, password, dan role wajib diisi' },
        { status: 400 }
      );
    }
    if (!['admin', 'kasir', 'superadmin'].includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }

    // Hirarki:
    // - Admin biasa CUMA boleh bikin akun kasir (karyawan) untuk cabangnya sendiri.
    // - Cuma superadmin yang boleh bikin akun admin ATAU superadmin baru.
    if (session.role === 'admin') {
      if (role !== 'kasir') {
        return NextResponse.json(
          { error: 'Hanya superadmin yang boleh membuat akun admin/superadmin' },
          { status: 403 }
        );
      }
      cabangId = session.cabangId;
    }
    if (role === 'superadmin') {
      // Superadmin tidak terikat cabang tertentu (akses semua cabang).
      cabangId = null;
    }
    if (role !== 'superadmin' && !cabangId) {
      return NextResponse.json({ error: 'Cabang wajib dipilih' }, { status: 400 });
    }

    const employees = await getEmployees();
    if (employees.some((e) => e.username.toLowerCase() === username.toLowerCase())) {
      return NextResponse.json({ error: 'Username sudah dipakai' }, { status: 400 });
    }

    const newEmployee = {
      id: randomUUID(),
      nama,
      username,
      passwordHash: await hashPassword(password),
      role,
      cabangId,
      createdAt: new Date().toISOString(),
    };
    const updated = [...employees, newEmployee];
    await saveEmployees(updated);

    const { passwordHash, ...safe } = newEmployee;
    return NextResponse.json({ employee: safe });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: hapus karyawan by id. Admin cabang hanya boleh hapus karyawan cabangnya.
export async function DELETE(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await req.json();
    const id = body?.id;
    const employees = await getEmployees();
    const target = employees.find((e) => e.id === id);
    if (!target) {
      return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });
    }
    if (session.role === 'admin' && target.cabangId !== session.cabangId) {
      return NextResponse.json({ error: 'Tidak bisa hapus karyawan cabang lain' }, { status: 403 });
    }
    if (session.role === 'admin' && target.role !== 'kasir') {
      return NextResponse.json({ error: 'Hanya superadmin yang boleh menghapus akun admin/superadmin' }, { status: 403 });
    }

    const updated = employees.filter((e) => e.id !== id);
    await saveEmployees(updated);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
