import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getProducts, saveProducts } from '@/lib/supabase';

// Auto-generate kode dari nama kalau kolom kode dikosongkan — dulu ini cuma
// ada di jalur import Excel, sementara form "Tambah Produk Manual" MEWAJIBKAN
// kode diisi tanpa fallback, jadi kalau kosong API balas error 400 tapi UI-nya
// tidak menampilkan pesan itu (kelihatan seperti "eror" tanpa penjelasan).
function slugKode(nama: string): string {
  const slug = nama
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 20);
  return `${slug || 'produk'}-${Date.now().toString(36)}`;
}

// Route ini SELALU dijalankan dinamis (bukan di-cache statis Next.js) —
// tanpa ini, data baru (mis. feed/produk/harga terbaru) bisa 'macet' di
// snapshot lama sampai redeploy, karena Next.js App Router men-static-kan
// Route Handler GET yang tidak baca cookies/searchParams.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json({ products });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Auth (superadmin/admin) sudah dicek middleware.ts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nama = (body?.nama || '').trim();
    if (!nama) {
      return NextResponse.json({ error: 'Nama produk wajib diisi' }, { status: 400 });
    }

    const products = await getProducts();
    let kode = (body?.kode || '').trim();
    if (!kode) {
      // Auto-generate, jamin unik walau nama sama persis dengan produk lain
      kode = slugKode(nama);
      while (products.some((p) => p.kode.toLowerCase() === kode.toLowerCase())) {
        kode = slugKode(nama);
      }
    } else if (products.some((p) => p.kode.toLowerCase() === kode.toLowerCase())) {
      return NextResponse.json({ error: `Kode "${kode}" sudah dipakai produk lain, pakai kode lain atau kosongkan biar dibuat otomatis` }, { status: 400 });
    }

    const product = {
      id: randomUUID(),
      nama,
      kode,
      deskripsi: (body?.deskripsi || '').trim() || undefined,
      hargaJual: body?.hargaJual ? Number(body.hargaJual) : undefined,
      imageDriveId: body?.imageDriveId || undefined,
      kategori: body?.kategori || undefined,
      isBotol: Boolean(body?.isBotol),
      ukuranBotolMl: body?.ukuranBotolMl ? Number(body.ukuranBotolMl) : undefined,
      createdAt: new Date().toISOString(),
    };
    const updated = [...products, product];
    await saveProducts(updated);
    return NextResponse.json({ product });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body?.id;
    const products = await getProducts();
    const updated = products.filter((p) => p.id !== id);
    await saveProducts(updated);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body?.id;
    if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 });

    const products = await getProducts();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });

    products[idx] = {
      ...products[idx],
      nama: body?.nama?.trim() ?? products[idx].nama,
      kode: body?.kode?.trim() ?? products[idx].kode,
      deskripsi: body?.deskripsi !== undefined ? (body.deskripsi.trim() || undefined) : products[idx].deskripsi,
      hargaJual: body?.hargaJual !== undefined ? Number(body.hargaJual) : products[idx].hargaJual,
      imageDriveId: body?.imageDriveId ?? products[idx].imageDriveId,
      kategori: body?.kategori ?? products[idx].kategori,
      isBotol: body?.isBotol !== undefined ? Boolean(body.isBotol) : products[idx].isBotol,
      ukuranBotolMl:
        body?.ukuranBotolMl !== undefined ? Number(body.ukuranBotolMl) : products[idx].ukuranBotolMl,
    };
    await saveProducts(products);
    return NextResponse.json({ product: products[idx] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
