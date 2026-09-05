import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { insertOutingStock, getOutingStock, deleteOutingStock, getProducts } from '@/lib/supabase';
import { getEmployees } from '@/lib/jsonbin';

// Outing stock = produk yang keluar dari stok TANPA lewat transaksi
// penjualan (mis. shift malam lupa input, testing, rusak/tumpah). Sengaja
// independen dari penjualan — bisa diinput kapan saja & tanggalnya bebas
// dipilih (bukan cuma hari ini), supaya karyawan shift malam bisa susulan
// input keesokan harinya untuk tanggal kejadian yang sebenarnya.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

    let cabangId = req.nextUrl.searchParams.get('cabangId') || undefined;
    if (session.role !== 'superadmin') cabangId = session.cabangId ?? undefined;
    const from = req.nextUrl.searchParams.get('from') || undefined;
    const to = req.nextUrl.searchParams.get('to') || undefined;
    // Karyawan (kasir) hanya bisa lihat catatan miliknya sendiri kalau
    // parameter `mine=1` dikirim (dipakai tab Data Harian karyawan);
    // admin/superadmin selalu lihat semua staff di cabang itu.
    const mineOnly = req.nextUrl.searchParams.get('mine') === '1' && session.role === 'kasir';
    const createdBy = mineOnly ? session.username : undefined;

    const [rows, products, employees] = await Promise.all([
      getOutingStock({ cabangId, from, to, createdBy }),
      getProducts(),
      getEmployees(),
    ]);
    const productById = new Map(products.map((p) => [p.id, p]));
    const namaByUsername = new Map(employees.map((e) => [e.username, e.nama]));

    const items = rows.map((r) => ({
      ...r,
      namaProduk: productById.get(r.productId)?.nama || '(produk dihapus)',
      kodeProduk: productById.get(r.productId)?.kode || '-',
      namaStaff: namaByUsername.get(r.createdBy) || r.createdBy,
    }));

    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin', 'kasir'].includes(session.role)) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 });
    }

    const body = await req.json();
    const cabangId = body?.cabangId || session.cabangId;
    if (!cabangId) return NextResponse.json({ error: 'Cabang wajib diisi' }, { status: 400 });
    const productId = body?.productId as string;
    if (!productId) return NextResponse.json({ error: 'Produk wajib dipilih' }, { status: 400 });
    const ml = Number(body?.ml);
    if (!ml || ml <= 0) return NextResponse.json({ error: 'Jumlah ml harus lebih dari 0' }, { status: 400 });
    // Tanggal BEBAS dipilih (default hari ini) — inilah yang bikin staff
    // shift malam bisa input susulan besoknya untuk tanggal kejadian asli.
    const tanggal = body?.tanggal || new Date().toISOString().slice(0, 10);

    const record = {
      id: randomUUID(),
      cabangId,
      productId,
      ml,
      tanggal,
      keterangan: (body?.keterangan || '').trim() || undefined,
      createdBy: session.username,
      createdAt: new Date().toISOString(),
    };
    await insertOutingStock(record);
    return NextResponse.json({ item: record });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin', 'kasir'].includes(session.role)) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 });
    }
    const body = await req.json();
    const id = body?.id;
    if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 });

    // Kasir hanya boleh hapus catatan miliknya sendiri; admin/superadmin bebas.
    if (session.role === 'kasir') {
      const cabangId = session.cabangId ?? undefined;
      const rows = await getOutingStock({ cabangId });
      const row = rows.find((r) => r.id === id);
      if (!row || row.createdBy !== session.username) {
        return NextResponse.json({ error: 'Tidak bisa menghapus catatan milik staff lain' }, { status: 403 });
      }
    }

    await deleteOutingStock(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
