// ============================================================
// Server (Vercel serverless function) jalan di UTC, BUKAN di WIB (UTC+7).
// Kalau kode server pakai `new Date().toISOString().slice(0, 10)` buat
// "hari ini", itu tanggal UTC — pas jam 00:00-06:59 WIB (dini hari),
// tanggal UTC masih tanggal KEMARIN. Efeknya: stok masuk / transaksi yang
// diinput dini hari ke-log di tanggal yang salah (mundur 1 hari), jadi gak
// nyambung sama rekap yang dilihat pakai tanggal HARI INI versi WIB
// (tanggal yang kepilih di date-picker browser kasir, yang jalan di device
// mereka sendiri jadi otomatis udah WIB).
//
// Pakai helper ini di server (API routes / lib) tiap butuh "tanggal hari
// ini" buat kolom `tanggal` (stock_movements, transaksi, dll) — JANGAN
// pakai `new Date().toISOString().slice(0,10)` langsung lagi di server.
// ============================================================

const JAKARTA_TZ = 'Asia/Jakarta';

/** "Hari ini" dalam kalender WIB, format YYYY-MM-DD. */
export function todayJakarta(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: JAKARTA_TZ }).format(new Date());
}

/** YYYY-MM-DD (WIB) dari sebuah Date/instant tertentu — dipakai kalau butuh hari lain, bukan cuma "sekarang". */
export function jakartaDateStr(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: JAKARTA_TZ }).format(d);
}
