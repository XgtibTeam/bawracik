import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getTransactions, getProducts } from '@/lib/supabase';
import { getBranches, getEmployees } from '@/lib/jsonbin';

// GET /api/reports/export?from=&to=&cabangId=
//
// Balikin data transaksi yang SUDAH DIKELOMPOKKAN untuk kebutuhan Excel:
// - perKode: satu grup per kode produk (mis. "PR"), isinya baris
//   tanggal+nama parfum+total ml+total rupiah, plus subtotal per nama
//   parfum (rekap harian per aroma dalam satu kode produk).
// - perKaryawan: satu grup per karyawan (kasir) yang transaksi, isinya
//   baris detail tiap transaksi (semua kode produk digabung jadi satu utk
//   karyawan itu) + subtotal per nama parfum di akhir.
// Client (RekapTab) yang menyusun ini jadi banyak sheet dalam satu file
// Excel (1 sheet Ringkasan, 1 sheet per kode produk, 1 sheet per karyawan).
//
// - kasir: hanya transaksi miliknya sendiri
// - admin: transaksi seluruh cabangnya
// - superadmin: bisa filter cabang manapun, atau semua kalau tidak diisi
export const dynamic = 'force-dynamic';

type SubtotalRow = { parfum: string; totalMl: number; totalRupiah: number };

function pushSubtotal(map: Map<string, SubtotalRow>, parfum: string, ml: number, rupiah: number) {
  const cur = map.get(parfum) || { parfum, totalMl: 0, totalRupiah: 0 };
  cur.totalMl += ml;
  cur.totalRupiah += rupiah;
  map.set(parfum, cur);
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin', 'kasir'].includes(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const from = req.nextUrl.searchParams.get('from') || undefined;
    const to = req.nextUrl.searchParams.get('to') || undefined;
    let cabangId = req.nextUrl.searchParams.get('cabangId') || undefined;
    if (session.role !== 'superadmin') cabangId = session.cabangId ?? undefined;
    const karyawanId = session.role === 'kasir' ? session.username : undefined;

    const [transactions, branches, products, employees] = await Promise.all([
      getTransactions({ cabangId, karyawanId, from, to }),
      getBranches(),
      getProducts(),
      getEmployees(),
    ]);
    const branchName = new Map(branches.map((b) => [b.id, b.nama]));
    const productById = new Map(products.map((p) => [p.id, p]));
    const productByNama = new Map(products.map((p) => [p.nama.trim().toLowerCase(), p]));
    const namaKaryawan = new Map(employees.map((e) => [e.username, e.nama]));

    function kodeOf(productId?: string, namaParfum?: string): string {
      const byId = productId ? productById.get(productId) : undefined;
      const byNama = !byId && namaParfum ? productByNama.get(namaParfum.trim().toLowerCase()) : undefined;
      const p = byId || byNama;
      return p?.kode?.trim() || 'LAINNYA';
    }

    // ---------- Per kode produk ----------
    const perKodeMap = new Map<
      string,
      {
        rowMap: Map<string, { tanggal: string; parfum: string; totalMl: number; totalRupiah: number }>;
        subtotalMap: Map<string, SubtotalRow>;
      }
    >();

    // ---------- Per karyawan ----------
    const perKaryawanMap = new Map<
      string,
      {
        rows: Array<{
          tanggal: string;
          cabang: string;
          tipe: string;
          parfum: string;
          ml: number;
          hargaPerMl: number;
          subtotal: number;
        }>;
        subtotalMap: Map<string, SubtotalRow>;
      }
    >();

    for (const t of transactions) {
      const tanggalStr = t.createdAt.slice(0, 10); // YYYY-MM-DD
      const cabangNama = branchName.get(t.cabangId) ?? t.cabangId;
      const karyawanLabel = t.karyawanId ? namaKaryawan.get(t.karyawanId) || t.karyawanId : '(self-checkout)';

      for (const item of t.items) {
        const rupiah = Math.round(item.ml * item.hargaPerMl);
        const kode = kodeOf(item.productId, item.namaParfum);

        // -- per kode produk --
        if (!perKodeMap.has(kode)) {
          perKodeMap.set(kode, { rowMap: new Map(), subtotalMap: new Map() });
        }
        const kodeGroup = perKodeMap.get(kode)!;
        const rowKey = `${tanggalStr}__${item.namaParfum}`;
        const existingRow = kodeGroup.rowMap.get(rowKey);
        if (existingRow) {
          existingRow.totalMl += item.ml;
          existingRow.totalRupiah += rupiah;
        } else {
          kodeGroup.rowMap.set(rowKey, {
            tanggal: tanggalStr,
            parfum: item.namaParfum,
            totalMl: item.ml,
            totalRupiah: rupiah,
          });
        }
        pushSubtotal(kodeGroup.subtotalMap, item.namaParfum, item.ml, rupiah);

        // -- per karyawan (semua kode digabung) --
        if (!perKaryawanMap.has(karyawanLabel)) {
          perKaryawanMap.set(karyawanLabel, { rows: [], subtotalMap: new Map() });
        }
        const karyawanGroup = perKaryawanMap.get(karyawanLabel)!;
        karyawanGroup.rows.push({
          tanggal: tanggalStr,
          cabang: cabangNama,
          tipe: t.tipe,
          parfum: item.namaParfum,
          ml: item.ml,
          hargaPerMl: item.hargaPerMl,
          subtotal: rupiah,
        });
        pushSubtotal(karyawanGroup.subtotalMap, item.namaParfum, item.ml, rupiah);
      }
    }

    const perKode = Array.from(perKodeMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([kode, group]) => ({
        kode,
        rows: Array.from(group.rowMap.values()).sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.parfum.localeCompare(b.parfum)),
        subtotal: Array.from(group.subtotalMap.values()).sort((a, b) => b.totalMl - a.totalMl),
      }));

    const perKaryawan = Array.from(perKaryawanMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([karyawan, group]) => ({
        karyawan,
        rows: group.rows.sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
        subtotal: Array.from(group.subtotalMap.values()).sort((a, b) => b.totalMl - a.totalMl),
      }));

    const totalPendapatan = transactions.reduce((s, t) => s + t.totalHarga, 0);
    const totalMl = transactions.reduce((s, t) => s + t.totalMl, 0);

    return NextResponse.json({
      totalPendapatan,
      totalMl,
      totalTransaksi: transactions.length,
      perKode,
      perKaryawan,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
