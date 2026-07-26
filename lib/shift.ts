// Deteksi shift & keterlambatan berdasarkan jam kedatangan (WIB, format "HH:mm:ss").
//
// Aturan:
// - Shift Pagi mulai 07:00
// - Shift Siang mulai 14:00
// - Toleransi keterlambatan: 5 menit dari jam mulai shift
// - Lewat dari toleransi -> status "Terlambat", dengan jumlah menit keterlambatan
//   dihitung dari jam mulai shift (bukan dari batas toleransi)
//
// Shift ditentukan dari shift terdekat SEBELUM/SAMA DENGAN jam kedatangan.
// Kedatangan sebelum jam 07:00 tetap dianggap shift Pagi (datang lebih awal, tidak telat).

export type ShiftName = 'Pagi' | 'Siang';

export type ShiftInfo = {
  shift: ShiftName | '-';
  jamMasukShift: string; // "07:00" / "14:00" / "-"
  status: 'Tepat Waktu' | 'Terlambat' | '-';
  telatMenit: number;
};

type ShiftDef = { name: ShiftName; startSeconds: number; label: string };

const SHIFTS: ShiftDef[] = [
  { name: 'Pagi', startSeconds: 7 * 3600, label: '07:00' },
  { name: 'Siang', startSeconds: 14 * 3600, label: '14:00' },
];

const TOLERANSI_DETIK = 5 * 60; // 5 menit

function jamToSeconds(jam: string): number {
  const parts = (jam || '').split(':').map((p) => parseInt(p, 10));
  const h = Number.isFinite(parts[0]) ? parts[0] : 0;
  const m = Number.isFinite(parts[1]) ? parts[1] : 0;
  const s = Number.isFinite(parts[2]) ? parts[2] : 0;
  return h * 3600 + m * 60 + s;
}

/**
 * Deteksi shift & status keterlambatan dari jam kedatangan.
 * Untuk keterangan selain "Hadir" (Sakit/Izin/Lainnya), shift & status
 * dikembalikan sebagai "-" karena konsep telat tidak berlaku.
 */
export function detectShift(jam: string, keterangan?: string): ShiftInfo {
  if (keterangan && keterangan !== 'Hadir') {
    return { shift: '-', jamMasukShift: '-', status: '-', telatMenit: 0 };
  }
  if (!jam) {
    return { shift: '-', jamMasukShift: '-', status: '-', telatMenit: 0 };
  }

  const detik = jamToSeconds(jam);

  let shift: ShiftDef = SHIFTS[0];
  for (const s of SHIFTS) {
    if (detik >= s.startSeconds) shift = s;
  }

  const selisihDetik = detik - shift.startSeconds;
  const isTerlambat = selisihDetik > TOLERANSI_DETIK;
  const telatMenit = isTerlambat ? Math.round(selisihDetik / 60) : 0;

  return {
    shift: shift.name,
    jamMasukShift: shift.label,
    status: isTerlambat ? 'Terlambat' : 'Tepat Waktu',
    telatMenit,
  };
}
