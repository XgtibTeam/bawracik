import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getProducts, insertProduct, updateProduct, deleteProduct } from '@/lib/supabase';

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

    const product = {
      id: randomUUID(),
      nama,
      deskripsi: (body?.deskripsi || '').trim(),
      kode: body?.kode?.trim() || undefined,
      hargaJual: body?.hargaJual ? Number(body.hargaJual) : undefined,
      imageUrl: body?.imageUrl || undefined,
      isBotol: Boolean(body?.isBotol),
      ukuranBotolMl: body?.ukuranBotolMl ? Number(body.ukuranBotolMl) : undefined,
      createdAt: new Date().toISOString(),
    };
    await insertProduct(product);
    return NextResponse.json({ product });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body?.id;
    if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 });
    await deleteProduct(id);
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

    await updateProduct(id, {
      nama: body?.nama?.trim(),
      deskripsi: body?.deskripsi,
      kode: body?.kode?.trim(),
      hargaJual: body?.hargaJual !== undefined ? Number(body.hargaJual) : undefined,
      imageUrl: body?.imageUrl,
      isBotol: body?.isBotol !== undefined ? Boolean(body.isBotol) : undefined,
      ukuranBotolMl: body?.ukuranBotolMl !== undefined ? Number(body.ukuranBotolMl) : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
