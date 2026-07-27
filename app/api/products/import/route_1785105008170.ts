import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getProducts, saveProducts } from '@/lib/supabase';

// Body: { rows: [{ nama, kode?, deskripsi?, hargaJual?, imageUrl?, isBotol?, ukuranBotolMl? }] }
// Klien parse file Excel/CSV pakai SheetJS dulu (kolom minimal: Nama Produk,
// Deskripsi — kolom lain opsional) lalu kirim JSON ke sini. Kode produk
// dibuat otomatis dari nama kalau tidak diisi di file.
function slugKode(nama: string, i: number): string {
  const slug = nama
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 20);
  return `${slug || 'produk'}-${Date.now().toString(36)}${i}`;
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
    const existingKode = new Set(products.map((p) => p.kode.toLowerCase()));

    const errors: string[] = [];
    const added: typeof products = [];

    for (const [i, row] of rows.entries()) {
      const nama = (row?.nama || row?.['Nama Produk'] || row?.['Nama Parfum'] || '').toString().trim();
      let kode = (row?.kode || row?.['Kode'] || '').toString().trim();
      const deskripsi = (row?.deskripsi || row?.['Deskripsi'] || row?.['Deskripsi Produk'] || '').toString().trim();
      if (!nama) {
        errors.push(`Baris ${i + 1}: nama kosong, dilewati`);
        continue;
      }
      if (!kode) kode = slugKode(nama, i);
      if (existingKode.has(kode.toLowerCase())) {
        errors.push(`Baris ${i + 1}: kode "${kode}" sudah ada, dilewati`);
        continue;
      }

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
        isBotol: ukuranBotolRaw ? true : !hargaJualRaw, // default: kalau tidak ada harga jual flat, anggap parfum isi ulang
        ukuranBotolMl: ukuranBotolRaw ? Number(ukuranBotolRaw) : undefined,
        createdAt: new Date().toISOString(),
      };
      added.push(product);
      existingKode.add(kode.toLowerCase());
    }

    const updated = [...products, ...added];
    await saveProducts(updated);

    return NextResponse.json({ imported: added.length, skipped: errors.length, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
