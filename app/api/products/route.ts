import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getProducts, saveProducts } from '@/lib/supabase';
import type { Product } from '@/lib/types';

// Auto-generate kode dari nama kalau kolom kode dikosongkan di form Tambah
// Produk Manual (dulu tidak ada fallback ini — cuma ada di jalur import
// Excel — jadi kalau admin biarkan kosong, tersangkut error tanpa pesan).
function slugKode(nama: string): string {
  const slug = nama
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 20);
  return `${slug || 'produk'}-${Date.now().toString(36)}`;
}

// Dipakai buat cek "nama mirip DALAM kode yang sama" (mis. kode sudah ada
// "Scandalous", lalu ada yang mau tambah "VS Scandalous" di kode YANG SAMA
// — dianggap produk yang sama, harus ditolak). TIDAK berlaku lintas kode:
// kode lain boleh punya nama "Scandalous"-nya sendiri.
function normalizeNama(nama: string): string {
  return nama
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// true kalau salah satu nama (setelah dinormalisasi) "mengandung" nama yang
// lain secara utuh per kata (bukan cuma exact match) — supaya "VS
// Scandalous" ketangkep sebagai produk yang sama dengan "Scandalous".
function isSameProductName(a: string, b: string): boolean {
  const na = normalizeNama(a);
  const nb = normalizeNama(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const wordsA = new Set(na.split(' '));
  const wordsB = new Set(nb.split(' '));
  const [shorter, shorterWords, longer] = na.length <= nb.length ? [na, wordsA, nb] : [nb, wordsB, na];
  // "mengandung" hanya dianggap sama produk kalau kata inti (kata terakhir/
  // paling khas dari nama yang lebih pendek) memang muncul utuh di nama
  // yang lebih panjang — mencegah false-positive nama pendek yang kebetulan
  // jadi substring nama lain yang sebenarnya beda produk.
  const coreWord = Array.from(shorterWords).sort((x, y) => y.length - x.length)[0];
  if (!coreWord || coreWord.length < 4) return false;
  return longer.includes(coreWord) && longer.includes(shorter);
}

function findDuplicateInKode(products: Product[], nama: string, kode: string): Product | undefined {
  const kodeNorm = kode.trim().toLowerCase();
  return products.find((p) => (p.kode || '').trim().toLowerCase() === kodeNorm && isSameProductName(p.nama, nama));
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

// Auth (superadmin/admin/kasir) sudah dicek middleware.ts — karyawan (kasir)
// boleh POST supaya bisa nambah produk sendiri dari halaman Data Harian,
// tapi dicek duplikat DALAM SATU KODE PRODUK saja (lihat findDuplicateInKode).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nama = (body?.nama || '').trim();
    if (!nama) {
      return NextResponse.json({ error: 'Nama produk wajib diisi' }, { status: 400 });
    }

    const products = await getProducts();
    // PENTING: sama seperti jalur import (lihat api/products/import/route.ts)
    // — `kode` adalah kode SERI/grup, BUKAN SKU unik, jadi boleh dipakai
    // bareng-bareng oleh banyak nama parfum. Duplikat dicek per-KODE: nama
    // yang mirip/sama HANYA ditolak kalau kode-nya juga sama; kode lain
    // tetap boleh punya nama serupa (mis. "Scandalous" ada di beberapa kode).
    let kode = (body?.kode || '').trim();
    if (!kode) kode = slugKode(nama);
    const dupe = findDuplicateInKode(products, nama, kode);
    if (dupe) {
      return NextResponse.json(
        {
          error: `Produk "${dupe.nama}" sudah ada di kode "${dupe.kode}". Kalau memang parfum baru yang beda, pakai kode lain.`,
          duplicate: { id: dupe.id, nama: dupe.nama, kode: dupe.kode },
        },
        { status: 409 }
      );
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
