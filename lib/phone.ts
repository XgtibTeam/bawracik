// Normalisasi nomor WA supaya "0812...", "62812...", "+62 812...", "0812-3456-7890"
// semua dianggap nomor yang SAMA. Dulu perbandingan nomor WA pakai `===` string
// mentah, jadi kalau member ketik dengan format sedikit beda dari waktu daftar,
// sistem menganggap dia "member baru" terus / gagal ditemukan sama sekali.
export function normalizeWa(raw: string): string {
  let digits = (raw || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  if (digits.startsWith('8')) digits = '62' + digits; // jaga-jaga kalau "0"-nya ikut hilang
  return digits;
}
