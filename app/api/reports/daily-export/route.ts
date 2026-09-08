import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getTransactions, getProducts, getPricingConfig } from '@/lib/supabase';
import { getEmployees } from '@/lib/jsonbin';
import { buildDailyRekap, buildAkumulasi, groupByDate, type ParfumSection, type BotolSection } from '@/lib/daily-rekap';

// GET /api/reports/daily-export?from=YYYY-MM-DD&to=YYYY-MM-DD&karyawanId=
//
// Export buat DICETAK KERTAS & DIPOTONG per hari — beda dari
// /api/reports/daily (yang itu satu hari, tampil di layar). Di sini tiap
// tanggal dalam rentang dapet KOTAK/BLOK sendiri dengan garis tabel penuh
// (persis rekap manual lama yang biasa dipakai), disusun ke bawah satu
// per satu — jadi tinggal print & gunting antar blok.
//
// Sheet yang dihasilkan: REFILL, BOTOL, SERIES (blok per hari) + TOTAL
// AKUMULASI (rekap total ml terjual per parfum, digabung se-rentang tanggal
// yang dipilih, bukan per hari).
export const dynamic = 'force-dynamic';

const THIN = { style: 'thin' as const, color: { argb: 'FF999999' } };
const BOX = { top: THIN, left: THIN, bottom: THIN, right: THIN };

function fmtTanggalIndo(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur = new Date(cur.getTime() + 86400000);
  }
  return out;
}

function boxCell(cell: ExcelJS.Cell) {
  cell.border = BOX;
}

/** Satu blok kotak: judul (tanggal) di baris pertama (merge selebar tabel),
 * header kolom, baris data, baris TOTAL — semuanya dikasih garis tabel
 * penuh biar keliatan sebagai satu kotak utuh yang bisa dipotong. */
function writeParfumBlock(sheet: ExcelJS.Worksheet, startRow: number, judul: string, section: ParfumSection): number {
  const headers = ['NAMA PARFUM', 'PRODUK', 'ML', 'PER ML', 'HARGA'];
  let r = startRow;

  sheet.mergeCells(r, 1, r, 5);
  const titleCell = sheet.getCell(r, 1);
  titleCell.value = judul;
  titleCell.font = { bold: true };
  titleCell.alignment = { horizontal: 'center' };
  for (let c = 1; c <= 5; c++) boxCell(sheet.getCell(r, c));
  r++;

  headers.forEach((h, i) => {
    const cell = sheet.getCell(r, i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: i >= 2 ? 'right' : 'left' };
    boxCell(cell);
  });
  r++;

  const minRows = Math.max(section.rows.length, 3);
  for (let i = 0; i < minRows; i++) {
    const row = section.rows[i];
    const vals = row ? [row.namaParfum + (row.susulan ? ' (susulan)' : ''), row.kode, row.ml, row.hargaPerMl, row.harga] : ['', '', '', '', ''];
    vals.forEach((v, c) => {
      const cell = sheet.getCell(r, c + 1);
      cell.value = v === '' ? null : (v as any);
      if (c >= 2 && typeof v === 'number') cell.numFmt = '#,##0';
      cell.alignment = { horizontal: c >= 2 ? 'right' : 'left' };
      boxCell(cell);
    });
    r++;
  }

  const totalVals = ['TOTAL', '', section.totalMl, '', section.totalHarga];
  totalVals.forEach((v, c) => {
    const cell = sheet.getCell(r, c + 1);
    cell.value = v === '' ? null : (v as any);
    cell.font = { bold: true };
    if (c >= 2 && typeof v === 'number') cell.numFmt = '#,##0';
    cell.alignment = { horizontal: c >= 2 ? 'right' : 'left' };
    boxCell(cell);
  });
  r++;

  return r + 1; // 1 baris kosong pemisah sebelum blok berikutnya
}

function writeBotolBlock(sheet: ExcelJS.Worksheet, startRow: number, judul: string, section: BotolSection): number {
  const headers = ['NAMA BOTOL', 'PCS', 'HARGA JUAL'];
  let r = startRow;

  sheet.mergeCells(r, 1, r, 3);
  const titleCell = sheet.getCell(r, 1);
  titleCell.value = judul;
  titleCell.font = { bold: true };
  titleCell.alignment = { horizontal: 'center' };
  for (let c = 1; c <= 3; c++) boxCell(sheet.getCell(r, c));
  r++;

  headers.forEach((h, i) => {
    const cell = sheet.getCell(r, i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.alignment = { horizontal: i >= 1 ? 'right' : 'left' };
    boxCell(cell);
  });
  r++;

  const minRows = Math.max(section.rows.length, 3);
  for (let i = 0; i < minRows; i++) {
    const row = section.rows[i];
    const vals = row ? [row.namaBotol, row.pcs, row.hargaJual] : ['', '', ''];
    vals.forEach((v, c) => {
      const cell = sheet.getCell(r, c + 1);
      cell.value = v === '' ? null : (v as any);
      if (c >= 1 && typeof v === 'number') cell.numFmt = '#,##0';
      cell.alignment = { horizontal: c >= 1 ? 'right' : 'left' };
      boxCell(cell);
    });
    r++;
  }

  const totalVals = ['TOTAL', section.totalPcs, section.totalHarga];
  totalVals.forEach((v, c) => {
    const cell = sheet.getCell(r, c + 1);
    cell.value = v === '' ? null : (v as any);
    cell.font = { bold: true };
    if (c >= 1 && typeof v === 'number') cell.numFmt = '#,##0';
    cell.alignment = { horizontal: c >= 1 ? 'right' : 'left' };
    boxCell(cell);
  });
  r++;

  return r + 1;
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || !['superadmin', 'admin', 'kasir'].includes(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 });
    }

    const from = req.nextUrl.searchParams.get('from') || new Date().toISOString().slice(0, 10);
    const to = req.nextUrl.searchParams.get('to') || from;
    let cabangId = req.nextUrl.searchParams.get('cabangId') || undefined;
    if (session.role !== 'superadmin') cabangId = session.cabangId ?? undefined;
    const karyawanId =
      session.role === 'kasir' ? session.username : req.nextUrl.searchParams.get('karyawanId') || undefined;

    const [transactions, products, employees, pricingConfig] = await Promise.all([
      getTransactions({
        cabangId,
        karyawanId,
        from: `${from}T00:00:00.000Z`,
        to: `${to}T23:59:59.999Z`,
      }),
      getProducts(),
      getEmployees(),
      getPricingConfig(),
    ]);

    const namaKaryawan = karyawanId ? employees.find((e) => e.username === karyawanId)?.nama || karyawanId : 'Semua Staff';
    const byDate = groupByDate(transactions);
    const tanggalList = eachDate(from, to);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'BAW Group';
    wb.created = new Date();

    const wsRefill = wb.addWorksheet('REFILL');
    const wsBotol = wb.addWorksheet('BOTOL');
    const wsSeries = wb.addWorksheet('SERIES');
    wsRefill.columns = [{ width: 26 }, { width: 10 }, { width: 8 }, { width: 10 }, { width: 12 }];
    wsBotol.columns = [{ width: 24 }, { width: 8 }, { width: 12 }];
    wsSeries.columns = [{ width: 26 }, { width: 10 }, { width: 8 }, { width: 10 }, { width: 12 }];

    let rowRefill = 1;
    let rowBotol = 1;
    let rowSeries = 1;

    for (const tgl of tanggalList) {
      const txHariIni = byDate.get(tgl) || [];
      const { refill, botol, series } = buildDailyRekap(txHariIni, products, pricingConfig);
      const judul = fmtTanggalIndo(tgl);
      rowRefill = writeParfumBlock(wsRefill, rowRefill, judul, refill);
      rowBotol = writeBotolBlock(wsBotol, rowBotol, judul, botol);
      rowSeries = writeParfumBlock(wsSeries, rowSeries, judul, series);
    }

    // ---- Sheet TOTAL AKUMULASI: total ml terjual per parfum, se-rentang tanggal ----
    const wsAkumulasi = wb.addWorksheet('TOTAL AKUMULASI');
    wsAkumulasi.columns = [{ width: 30 }, { width: 12 }, { width: 12 }];
    const akumulasi = buildAkumulasi(transactions, products);
    let ra = 1;
    wsAkumulasi.mergeCells(ra, 1, ra, 3);
    const judulAkumulasi = wsAkumulasi.getCell(ra, 1);
    judulAkumulasi.value = `Total Akumulasi Parfum Terjual — ${namaKaryawan} — ${fmtTanggalIndo(from)}${to !== from ? ` s/d ${fmtTanggalIndo(to)}` : ''}`;
    judulAkumulasi.font = { bold: true };
    ra += 2;
    ['NAMA PARFUM', 'PRODUK', 'ML'].forEach((h, i) => {
      const cell = wsAkumulasi.getCell(ra, i + 1);
      cell.value = h;
      cell.font = { bold: true };
      boxCell(cell);
    });
    ra++;
    let grandTotalMl = 0;
    for (const row of akumulasi) {
      wsAkumulasi.getCell(ra, 1).value = row.namaParfum;
      wsAkumulasi.getCell(ra, 2).value = row.kode;
      const cellMl = wsAkumulasi.getCell(ra, 3);
      cellMl.value = row.totalMl;
      cellMl.numFmt = '#,##0';
      cellMl.alignment = { horizontal: 'right' };
      for (let c = 1; c <= 3; c++) boxCell(wsAkumulasi.getCell(ra, c));
      grandTotalMl += row.totalMl;
      ra++;
    }
    wsAkumulasi.getCell(ra, 1).value = 'TOTAL';
    wsAkumulasi.getCell(ra, 1).font = { bold: true };
    const totalCell = wsAkumulasi.getCell(ra, 3);
    totalCell.value = Math.round(grandTotalMl * 10) / 10;
    totalCell.font = { bold: true };
    totalCell.numFmt = '#,##0';
    totalCell.alignment = { horizontal: 'right' };
    for (let c = 1; c <= 3; c++) boxCell(wsAkumulasi.getCell(ra, c));

    const buffer = await wb.xlsx.writeBuffer();
    const namaFile = `Data-Harian-${(namaKaryawan || 'Karyawan').replace(/\s+/g, '-')}-${from}${to !== from ? `_${to}` : ''}.xlsx`;

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${namaFile}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
