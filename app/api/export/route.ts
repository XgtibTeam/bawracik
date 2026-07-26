import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getAttendanceRecords } from '@/lib/jsonbin';
import { detectShift } from '@/lib/shift';

// Route ini SELALU dijalankan dinamis (bukan di-cache statis Next.js) —
// tanpa ini, data baru (mis. feed/produk/harga terbaru) bisa 'macet' di
// snapshot lama sampai redeploy, karena Next.js App Router men-static-kan
// Route Handler GET yang tidak baca cookies/searchParams.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bulan = searchParams.get('bulan'); // format "01".."12"
    const tahun = searchParams.get('tahun'); // format "2026"

    const records = await getAttendanceRecords();

    const filtered = records.filter((r) => {
      if (!bulan && !tahun) return true;
      const [rTahun, rBulan] = r.tanggal.split('-');
      const matchBulan = bulan ? rBulan === bulan.padStart(2, '0') : true;
      const matchTahun = tahun ? rTahun === tahun : true;
      return matchBulan && matchTahun;
    });

    const rows = filtered
      .sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1))
      .map((r) => {
        const info = detectShift(r.jam, r.keterangan);
        return {
          Nama: r.nama,
          Tanggal: r.tanggal,
          'Waktu Kedatangan (Jam:Menit:Detik)': r.jam,
          'Cabang Toko': r.cabang,
          Keterangan:
            r.keterangan === 'Lainnya'
              ? `Lainnya - ${r.keteranganLainnya || ''}`
              : r.keterangan,
          Shift: info.shift,
          'Jam Masuk Shift': info.jamMasukShift,
          'Status Kehadiran': info.status,
          'Telat (menit)': info.telatMenit,
          'Nama File Foto': r.fotoPath,
        };
      });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 22 }, // Nama
      { wch: 12 }, // Tanggal
      { wch: 26 }, // Waktu Kedatangan
      { wch: 20 }, // Cabang
      { wch: 22 }, // Keterangan
      { wch: 10 }, // Shift
      { wch: 16 }, // Jam Masuk Shift
      { wch: 16 }, // Status Kehadiran
      { wch: 14 }, // Telat (menit)
      { wch: 45 }, // Nama File Foto
    ];

    const workbook = XLSX.utils.book_new();
    const sheetName =
      bulan && tahun ? `Absensi ${bulan}-${tahun}` : 'Absensi';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const fileLabel =
      bulan && tahun ? `absensi_${tahun}-${bulan}` : 'absensi_semua_data';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileLabel}.xlsx"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
