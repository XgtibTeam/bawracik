import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getTransactions } from '@/lib/supabase';
import { getEmployees } from '@/lib/jsonbin';

// GET /api/reports/susulan?from=&to=&cabangId=
// Daftar transaksi yang ditandai "susulan" (staff lupa input di tanggal
// kejadian, baru diinput belakangan lewat toggle "Input Susulan" di
// halaman kasir) — buat admin memantau siapa & seberapa sering.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }
    let cabangId = req.nextUrl.searchParams.get('cabangId') || undefined;
    if (session.role !== 'superadmin') cabangId = session.cabangId ?? undefined;
    const from = req.nextUrl.searchParams.get('from') || undefined;
    const to = req.nextUrl.searchParams.get('to') || undefined;

    const [transactions, employees] = await Promise.all([
      getTransactions({ cabangId, from, to, susulanOnly: true }),
      getEmployees(),
    ]);
    const namaByUsername = new Map(employees.map((e) => [e.username, e.nama]));

    const items = transactions.map((t) => ({
      id: t.id,
      tanggal: t.createdAt,
      karyawan: t.karyawanId ? namaByUsername.get(t.karyawanId) || t.karyawanId : '-',
      totalMl: t.totalMl,
      totalHarga: t.totalHarga,
      jumlahItem: t.items.length,
    }));

    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
