import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getProducts, saveProducts, insertStockMovement } from '@/lib/supabase';
import { PRODUCT_KATEGORI_LIST } from '@/lib/types';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

// Body: { rows: [{ nama, kode?, kategori?, deskripsi?, hargaJual?, imageUrl?, isBotol?, ukuranBotolMl?, stok?/stok_kg? }], cabangId? }
// Klien parse file Excel/CSV pakai SheetJS dulu (kolom yang didukung:
// nama_product / Nama Produk, kode_product / Kode, kategori_product /
// Kategori — nilainya salah satu dari biasa/sedang/mewah/series, stok /
// stok_kg — stok awal produk itu) lalu kirim JSON ke sini. Kode produk
// dibuat otomatis dari nama kalau tidak diisi. Kalau ada kolom stok &
// cabangId dikirim, tiap produk yang stoknya > 0 langsung dicatat sebagai
// 1 baris stock_movements (stok masuk) — sama seperti input manual di
// halaman kasir/stok — jadi begitu produk diimport, "Stok Saat Ini"
// langsung ke-update tanpa perlu input ulang.
function slugKode(nama: string, i: number): string {
  const slug = nama
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 20);
  return `${slug || 'produk'}-${Date.now().toString(36)}${i}`;
}

function normalizeKategori(raw: unknown): string | undefined {
  const v = (raw ?? '').toString().trim().toLowerCase();
  if (!v) return undefined;
  const found = PRODUCT_KATEGORI_LIST.find((k) => k === v);
  return found; // kalau nilainya di luar 4 pilihan, dianggap kosong (bukan error, biar import tidak gagal total)
}

// Ambil jumlah stok awal (dalam ml) dari 1 baris Excel — dukung kolom "stok"
// (satuan ml langsung) ATAU "stok_kg" (dikonversi ×1000, sama seperti input
// stok manual di halaman kasir/stok).
function parseStokMl(row: any): number {
  const stokMlRaw = row?.stok ?? row?.['Stok'] ?? row?.['stok_ml'] ?? row?.['Stok (ml)'] ?? row?.['Stok Ml'] ?? row?.['stok ml'];
  if (stokMlRaw !== undefined && stokMlRaw !== null && String(stokMlRaw).trim() !== '') {
    const n = Number(stokMlRaw);
    return n > 0 ? n : 0;
  }
  const stokKgRaw = row?.stok_kg ?? row?.['Stok (kg)'] ?? row?.['Stok Kg'] ?? row?.['stok kg'];
  if (stokKgRaw !== undefined && stokKgRaw !== null && String(stokKgRaw).trim() !== '') {
    const n = Number(stokKgRaw);
    return n > 0 ? n * 1000 : 0;
  }
  return 0;
}

// Route ini SELALU dijalankan dinamis (bukan di-cache statis Next.js) —
// tanpa ini, data baru (mis. feed/produk/harga terbaru) bisa 'macet' di
// snapshot lama sampai redeploy, karena Next.js App Router men-static-kan
// Route Handler GET yang tidak baca cookies/searchParams.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const body = await req.json();
    const rows = body?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Data import kosong' }, { status: 400 });
    }
    // Cabang tujuan stok awal — kalau bukan superadmin, paksa pakai cabang
    // sesi sendiri (tidak boleh titip stok ke cabang lain lewat body).
    const cabangId = session.role === 'superadmin' ? body?.cabangId || undefined : session.cabangId ?? undefined;

    const products = await getProducts();
    // PENTING: `kode` adalah kode SERI/grup produk (mis. "R" dipakai banyak
    // nama parfum sekaligus, lihat MyKonos_Series.xlsx) — BUKAN SKU unik,
    // jadi tidak boleh dipakai sbg kunci duplikat. Dedup pakai `nama` saja.
    const existingNama = new Set(products.map((p) => p.nama.trim().toLowerCase()));

    const errors: string[] = [];
    const added: typeof products = [];
    const namaDalamBatchIni = new Set<string>();
    const stokRows: { productId: string; ml: number }[] = [];

    for (const [i, row] of rows.entries()) {
      const nama = (
        row?.nama ||
        row?.nama_product ||
        row?.['Nama Produk'] ||
        row?.['Nama Parfum'] ||
        row?.['nama_product'] ||
        ''
      )
        .toString()
        .trim();
      let kode = (row?.kode || row?.kode_product || row?.['Kode'] || row?.['kode_product'] || '').toString().trim();
      const kategoriRaw =
        row?.kategori ?? row?.kategori_product ?? row?.['Kategori'] ?? row?.['Kategori Produk'] ?? row?.['kategori_product'];
      const kategori = normalizeKategori(kategoriRaw);
      if (kategoriRaw && !kategori) {
        errors.push(
          `Baris ${i + 1}: kategori "${kategoriRaw}" tidak dikenali (pakai: ${PRODUCT_KATEGORI_LIST.join(', ')}), produk tetap diimport tanpa kategori`
        );
      }
      const deskripsi = (row?.deskripsi || row?.['Deskripsi'] || row?.['Deskripsi Produk'] || '').toString().trim();
      if (!nama) {
        errors.push(`Baris ${i + 1}: nama kosong, dilewati`);
        continue;
      }
      const namaKey = nama.toLowerCase();
      if (existingNama.has(namaKey) || namaDalamBatchIni.has(namaKey)) {
        errors.push(`Baris ${i + 1}: produk "${nama}" sudah ada, dilewati`);
        continue;
      }
      // kode BOLEH sama dengan produk lain (kode seri/grup) — kalau kosong,
      // dibuatkan otomatis dari nama, tidak perlu dicek keunikan.
      if (!kode) kode = slugKode(nama, i);

      const hargaJualRaw = row?.hargaJual ?? row?.['Harga jual'] ?? row?.['Harga Jual'];
      const imageUrl = row?.imageUrl ?? row?.['link gambar'] ?? row?.['Link Gambar'];
      const ukuranBotolRaw = row?.ukuranBotolMl ?? row?.['Ukuran Botol'];
      const stokMl = parseStokMl(row);
      if (stokMl > 0 && !cabangId) {
        errors.push(`Baris ${i + 1}: kolom stok diisi (${stokMl} ml) tapi cabang tujuan belum dipilih, stok dilewati`);
      }

      const product = {
        id: randomUUID(),
        nama,
        kode,
        deskripsi: deskripsi || undefined,
        hargaJual: hargaJualRaw ? Number(hargaJualRaw) : undefined,
        imageDriveId: imageUrl || undefined,
        kategori,
        isBotol: ukuranBotolRaw ? true : !hargaJualRaw, // default: kalau tidak ada harga jual flat, anggap parfum isi ulang
        ukuranBotolMl: ukuranBotolRaw ? Number(ukuranBotolRaw) : undefined,
        createdAt: new Date().toISOString(),
      };
      added.push(product);
      namaDalamBatchIni.add(namaKey);
      if (stokMl > 0 && cabangId) stokRows.push({ productId: product.id, ml: stokMl });
    }

    const updated = [...products, ...added];
    await saveProducts(updated);

    // Catat stok awal (kalau ada) sebagai stock_movements — dilakukan
    // setelah produk berhasil tersimpan, supaya productId-nya valid.
    if (stokRows.length > 0 && cabangId) {
      const tanggal = new Date().toISOString().slice(0, 10);
      for (const s of stokRows) {
        await insertStockMovement({
          id: randomUUID(),
          cabangId,
          productId: s.productId,
          tanggal,
          kg: s.ml / 1000,
          ml: s.ml,
          createdBy: session.username,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ imported: added.length, skipped: errors.length, errors, stokDiisi: stokRows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
