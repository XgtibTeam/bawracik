import { NextRequest, NextResponse } from 'next/server';
import { getPricingConfig, savePricingConfig } from '@/lib/supabase';

// Route ini SELALU dijalankan dinamis (bukan di-cache statis Next.js) —
// tanpa ini, data baru (mis. feed/produk/harga terbaru) bisa 'macet' di
// snapshot lama sampai redeploy, karena Next.js App Router men-static-kan
// Route Handler GET yang tidak baca cookies/searchParams.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getPricingConfig();
    return NextResponse.json({ config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Auth (superadmin/admin) sudah dicek middleware.ts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mlTiers = body?.mlTiers;
    const bottleTiers = body?.bottleTiers;
    if (!Array.isArray(mlTiers) || !Array.isArray(bottleTiers)) {
      return NextResponse.json({ error: 'mlTiers dan bottleTiers wajib array' }, { status: 400 });
    }
    await savePricingConfig({ mlTiers, bottleTiers, updatedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
