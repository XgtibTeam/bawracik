import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getProducts, bulkInsertProducts } from '@/lib/supabase';

// Body: { rows: [{ nama, deskripsi, kode?, hargaJual?, imageUrl?, ukuranBotolMl? }] }
// Klien parse file Excel/CSV pakai SheetJS dulu (kolom: Nama Parfum, Deskripsi
// Produk, dan opsional Kode/Harga jual/link gambar/Ukuran Botol) lalu kirim JSON
// ke sini.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows = body?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Data import kosong' }, { status: 400 });
    }

    const existing = await getProducts();
    const existingNama = new Set(existing.map((p) => p.nama.toLowerCase()));

    const errors: string[] = [];
    const added: Awaited<ReturnType<typeof getProducts>> = [];

    for (const [i, row] of rows.entries()) {
      const nama = (row?.nama || row?.['Nama Parfum'] || row?.['nama parfum'] || '').toString().trim();
      if (!nama) {
        errors.push(`Baris ${i + 1}: nama kosong, dilewati`);
        continue;
      }
      if (existingNama.has(nama.toLowerCase())) {
        errors.push(`Baris ${i + 1}: produk "${nama}" sudah ada, dilewati`);
        continue;
      }

      const deskripsi = (
        row?.deskripsi ||
        row?.['Deskripsi Produk'] ||
        row?.['Deskripsi'] ||
        row?.['deskripsi produk'] ||
        ''
      )
        .toString()
        .trim();
      const kode = row?.kode || row?.['Kode'];
      const hargaJualRaw = row?.hargaJual ?? row?.['Harga jual'] ?? row?.['Harga Jual'];
      const imageUrl = row?.imageUrl ?? row?.['link gambar'] ?? row?.['Link Gambar'];
      const ukuranBotolRaw = row?.ukuranBotolMl ?? row?.['Ukuran Botol'];

      added.push({
        id: randomUUID(),
        nama,
        deskripsi,
        kode: kode ? String(kode).trim() : undefined,
        hargaJual: hargaJualRaw ? Number(hargaJualRaw) : undefined,
        imageUrl: imageUrl || undefined,
        isBotol: Boolean(ukuranBotolRaw),
        ukuranBotolMl: ukuranBotolRaw ? Number(ukuranBotolRaw) : undefined,
        createdAt: new Date().toISOString(),
      });
      existingNama.add(nama.toLowerCase());
    }

    await bulkInsertProducts(added);

    return NextResponse.json({ imported: added.length, skipped: errors.length, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
