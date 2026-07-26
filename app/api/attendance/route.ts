import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  getAttendanceRecords,
  saveAttendanceRecords,
  AttendanceRecord,
} from '@/lib/jsonbin';
import { uploadPhotoToDrive } from '@/lib/google-drive';

const VALID_KETERANGAN = ['Hadir', 'Sakit', 'Izin', 'Lembur', 'Lainnya'];

function formatJakartaParts(date: Date) {
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }); // en-CA -> YYYY-MM-DD
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }); // en-GB -> HH:mm:ss
  const dayFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
  }); // -> Senin, Selasa, dst

  return {
    tanggal: dateFormatter.format(date),
    jam: timeFormatter.format(date),
    hari: dayFormatter.format(date),
  };
}

function sanitizeForFilename(text: string): string {
  return text
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nama = (body?.nama || '').trim();
    const cabang = (body?.cabang || '').trim();
    const keterangan = body?.keterangan;
    const keteranganLainnya = (body?.keteranganLainnya || '').trim();
    const photoBase64 = body?.photoBase64;

    if (!nama || !cabang || !keterangan || !photoBase64) {
      return NextResponse.json(
        { error: 'Nama, cabang, keterangan, dan foto wajib diisi' },
        { status: 400 }
      );
    }
    if (!VALID_KETERANGAN.includes(keterangan)) {
      return NextResponse.json({ error: 'Keterangan tidak valid' }, { status: 400 });
    }
    if (keterangan === 'Lainnya' && !keteranganLainnya) {
      return NextResponse.json(
        { error: 'Mohon isi keterangan lainnya' },
        { status: 400 }
      );
    }

    const now = new Date();
    const { tanggal, jam, hari } = formatJakartaParts(now);
    const id = randomUUID();

    // Format nama file: nama-hari-keterangan-waktu.jpg
    const waktuUntukNamaFile = jam.replace(/:/g, '.');
    const filename = `${sanitizeForFilename(nama)}-${hari}-${keterangan}-${waktuUntukNamaFile}.jpg`;

    const { path: fotoPath } = await uploadPhotoToDrive(photoBase64, filename);

    const record: AttendanceRecord = {
      id,
      nama,
      cabang,
      keterangan,
      keteranganLainnya: keterangan === 'Lainnya' ? keteranganLainnya : undefined,
      tanggal,
      jam,
      timestamp: now.toISOString(),
      fotoPath,
    };

    const records = await getAttendanceRecords();
    records.push(record);
    await saveAttendanceRecords(records);

    return NextResponse.json({ ok: true, record });
  } catch (err: any) {
    console.error('Gagal submit absensi:', err);
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan saat submit absensi' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const records = await getAttendanceRecords();
    const sorted = [...records].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return NextResponse.json({ records: sorted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

