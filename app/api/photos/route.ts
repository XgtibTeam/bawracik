import { NextResponse } from 'next/server';
import { listPhotos } from '@/lib/google-drive';

export async function GET() {
  try {
    const photos = await listPhotos();
    return NextResponse.json({ photos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
