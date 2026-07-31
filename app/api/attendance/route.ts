import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  getAttendanceRecords,
  saveAttendanceRecords,
  AttendanceRecord,
} from '@/lib/jsonbin';
import { uploadPhotoToDrive } from '@/lib/google-drive';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { detectShift } from '@/lib/shift';

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

// Route ini SELALU dijalankan dinamis (bukan di-cache statis Next.js) —
// tanpa ini, data baru (mis. feed/produk/harga terbaru) bisa 'macet' di
// snapshot lama sampai redeploy, karena Next.js App Router men-static-kan
// Route Handler GET yang tidak baca cookies/searchParams.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin', 'kasir'].includes(session.role)) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 });
    }

    const body = await req.json();
    // Nama SELALU dari session yang sedang login (bukan input bebas dari client),
    // supaya absensi tidak bisa dipalsukan atas nama orang lain.
    const nama = session.nama;
    const cabang = (body?.cabang || '').trim();
    const keterangan = body?.keterangan || 'Hadir';
    const keteranganLainnya = (body?.keteranganLainnya || '').trim();
    const photoBase64 = body?.photoBase64;

    if (!cabang || !photoBase64) {
      return NextResponse.json(
        { error: 'Cabang dan swafoto wajib diisi' },
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

    // Shift Pagi (07:00) / Siang (14:00) & status keterlambatan dihitung otomatis
    // dari jam kedatangan — tidak perlu dipilih manual oleh karyawan.
    const shiftInfo = detectShift(jam, keterangan);

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
      shift: shiftInfo.shift,
      statusKehadiran: shiftInfo.status,
      telatMenit: shiftInfo.telatMenit,
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

