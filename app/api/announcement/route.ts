import { NextRequest, NextResponse } from 'next/server';
import { getAnnouncement, saveAnnouncement } from '@/lib/jsonbin';

export async function GET() {
  try {
    const announcement = await getAnnouncement();
    return NextResponse.json(announcement);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = typeof body?.text === 'string' ? body.text : '';
    const announcement = await saveAnnouncement(text.trim());
    return NextResponse.json(announcement);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
