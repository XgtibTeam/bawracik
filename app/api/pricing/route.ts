import { NextRequest, NextResponse } from 'next/server';
import { getPricingConfig, savePricingConfig } from '@/lib/jsonbin';

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
    const ecerMaxMl = Number(body?.ecerMaxMl) || 100;
    const grosirMaxMl = Number(body?.grosirMaxMl) || 1000;
    if (!Array.isArray(mlTiers) || !Array.isArray(bottleTiers)) {
      return NextResponse.json({ error: 'mlTiers dan bottleTiers wajib array' }, { status: 400 });
    }
    await savePricingConfig({ mlTiers, bottleTiers, ecerMaxMl, grosirMaxMl, updatedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
