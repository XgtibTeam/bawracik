import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getBranches, saveBranches } from '@/lib/jsonbin';

export async function GET() {
  try {
    const branches = await getBranches();
    return NextResponse.json({ branches });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Auth (superadmin/admin) sudah dicek di middleware.ts untuk method ini.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nama = (body?.nama || '').trim();
    const alamat = (body?.alamat || '').trim();
    const waCS = (body?.waCS || '').trim();
    if (!nama) {
      return NextResponse.json({ error: 'Nama cabang tidak boleh kosong' }, { status: 400 });
    }
    const branches = await getBranches();
    if (branches.some((b) => b.nama.toLowerCase() === nama.toLowerCase())) {
      return NextResponse.json({ error: 'Cabang sudah ada' }, { status: 400 });
    }
    const newBranch = {
      id: randomUUID(),
      nama,
      alamat: alamat || undefined,
      waCS: waCS || undefined,
      createdAt: new Date().toISOString(),
    };
    const updated = [...branches, newBranch];
    await saveBranches(updated);
    return NextResponse.json({ branches: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body?.id;
    const branches = await getBranches();
    const updated = branches.filter((b) => b.id !== id);
    await saveBranches(updated);
    return NextResponse.json({ branches: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
