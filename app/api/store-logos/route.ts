import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getStoreLogos, addStoreLogo, deleteStoreLogo } from '@/lib/supabase';

export async function GET() {
  try {
    const logos = await getStoreLogos();
    return NextResponse.json({ logos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Auth (superadmin/admin) sudah dicek middleware.ts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body?.url;
    if (!url) return NextResponse.json({ error: 'URL logo wajib diisi' }, { status: 400 });

    const existing = await getStoreLogos();
    const id = randomUUID();
    await addStoreLogo(id, url, existing.length);
    return NextResponse.json({ id, url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body?.id;
    if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 });
    await deleteStoreLogo(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
