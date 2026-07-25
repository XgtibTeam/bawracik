import { NextRequest, NextResponse } from 'next/server';
import { getPhotoDataUrl } from '@/lib/google-drive';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path'); // ini adalah Google Drive File ID
    if (!path) {
      return NextResponse.json({ error: 'Parameter path wajib diisi' }, { status: 400 });
    }
    const url = await getPhotoDataUrl(path);
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
