import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getProducts, saveProducts } from '@/lib/supabase';

// Body: { rows: [{ nama, kode, hargaJual?, imageUrl?, isBotol?, ukuranBotolMl? }] }
// Klien parse file Excel/CSV pakai SheetJS dulu (kolom: Nama Parfum, Kode,
// Harga jual, link gambar, [Nama Botol, Ukuran Botol]) lalu kirim JSON ke sini.
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
      const nama = (row?.nama || row?.['Nama Parfum'] || '').toString().trim();
      const kode = (row?.kode || row?.['Kode'] || '').toString().trim();
      if (!nama || !kode) {
        errors.push(`Baris ${i + 1}: nama/kode kosong, dilewati`);
        continue;
      }
      if (existingKode.has(kode.toLowerCase())) {
        errors.push(`Baris ${i + 1}: kode "${kode}" sudah ada, dilewati`);
        continue;
      }

      const hargaJualRaw = row?.hargaJual ?? row?.['Harga jual'];
      const imageUrl = row?.imageUrl ?? row?.['link gambar'];
      const ukuranBotolRaw = row?.ukuranBotolMl ?? row?.['Ukuran Botol'];

      const product = {
        id: randomUUID(),
        nama,
        kode,
        hargaJual: hargaJualRaw ? Number(hargaJualRaw) : undefined,
        imageDriveId: imageUrl || undefined,
        isBotol: Boolean(ukuranBotolRaw),
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
