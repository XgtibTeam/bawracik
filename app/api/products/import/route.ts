import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getProducts, saveProducts } from '@/lib/supabase';
import { PRODUCT_KATEGORI_LIST } from '@/lib/types';

// Body: { rows: [{ nama, kode?, kategori?, deskripsi?, hargaJual?, imageUrl?, isBotol?, ukuranBotolMl? }] }
// Klien parse file Excel/CSV pakai SheetJS dulu (kolom yang didukung:
// nama_product / Nama Produk, kode_product / Kode, kategori_product /
// Kategori — nilainya salah satu dari biasa/sedang/mewah/series) lalu kirim
// JSON ke sini. Kode produk dibuat otomatis dari nama kalau tidak diisi.
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

// Route ini SELALU dijalankan dinamis (bukan di-cache statis Next.js) —
// tanpa ini, data baru (mis. feed/produk/harga terbaru) bisa 'macet' di
// snapshot lama sampai redeploy, karena Next.js App Router men-static-kan
// Route Handler GET yang tidak baca cookies/searchParams.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows = body?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Data import kosong' }, { status: 400 });
    }

    const products = await getProducts();
    // PENTING: `kode` adalah kode SERI/grup produk (mis. "R" dipakai banyak
    // nama parfum sekaligus, lihat MyKonos_Series.xlsx) — BUKAN SKU unik,
    // jadi tidak boleh dipakai sbg kunci duplikat. Dedup pakai `nama` saja.
    const existingNama = new Set(products.map((p) => p.nama.trim().toLowerCase()));

    const errors: string[] = [];
    const added: typeof products = [];
    const namaDalamBatchIni = new Set<string>();

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
    }

    const updated = [...products, ...added];
    await saveProducts(updated);

    return NextResponse.json({ imported: added.length, skipped: errors.length, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
