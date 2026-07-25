// ============================================================
// Lapisan data JSONBin — HANYA untuk data teks/master data:
// absensi, cabang, karyawan, pengumuman, profil toko, harga,
// produk, member, voucher.
//
// Rekap transaksi (jual-beli) TIDAK di sini — itu di Supabase,
// lihat lib/supabase-db.ts. Foto TIDAK di sini — itu di Google
// Drive, lihat lib/google-drive.ts.
// ============================================================

import type {
  Branch,
  Employee,
  StoreProfile,
  PricingConfig,
  Product,
  Member,
  Voucher,
} from './types';

const JSONBIN_BASE = 'https://api.jsonbin.io/v3/b';

function headers() {
  const key = process.env.JSONBIN_API_KEY;
  if (!key) throw new Error('JSONBIN_API_KEY belum diatur di .env.local');
  return {
    'Content-Type': 'application/json',
    'X-Master-Key': key,
  };
}

export async function readBin<T>(binId: string): Promise<T> {
  const res = await fetch(`${JSONBIN_BASE}/${binId}/latest`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Gagal membaca bin JSONBin (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  return json.record as T;
}

export async function writeBin<T>(binId: string, data: T): Promise<void> {
  const res = await fetch(`${JSONBIN_BASE}/${binId}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Gagal menulis bin JSONBin (${res.status}): ${await res.text()}`);
  }
}

function requireBinId(envName: string): string {
  const binId = process.env[envName];
  if (!binId) throw new Error(`${envName} belum diatur di .env.local`);
  return binId;
}

async function getCollection<T>(envName: string, fallback: T): Promise<T> {
  const binId = requireBinId(envName);
  try {
    const data = await readBin<T>(binId);
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

async function saveCollection<T>(envName: string, data: T): Promise<void> {
  const binId = requireBinId(envName);
  await writeBin(binId, data);
}

// ============================================================
// ABSENSI (dipertahankan dari sistem lama, tidak berubah)
// ============================================================

export type AttendanceRecord = {
  id: string;
  nama: string;
  cabang: string;
  keterangan: 'Hadir' | 'Sakit' | 'Izin' | 'Lembur' | 'Lainnya';
  keteranganLainnya?: string;
  tanggal: string; // YYYY-MM-DD (Asia/Jakarta)
  jam: string; // HH:mm:ss (Asia/Jakarta)
  timestamp: string; // ISO string, waktu server saat submit
  fotoPath: string; // Google Drive File ID
  shift?: 'Pagi' | 'Siang' | '-'; // auto-detect dari jam kedatangan, lihat lib/shift.ts
  statusKehadiran?: 'Tepat Waktu' | 'Terlambat' | '-';
  telatMenit?: number;
};

export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  return getCollection<AttendanceRecord[]>('JSONBIN_BIN_ID_ATTENDANCE', []);
}
export async function saveAttendanceRecords(records: AttendanceRecord[]): Promise<void> {
  await saveCollection('JSONBIN_BIN_ID_ATTENDANCE', records);
}

export type Announcement = { text: string; updatedAt: string | null };

export async function getAnnouncement(): Promise<Announcement> {
  return getCollection<Announcement>('JSONBIN_BIN_ID_ANNOUNCEMENT', { text: '', updatedAt: null });
}
export async function saveAnnouncement(text: string): Promise<Announcement> {
  const announcement: Announcement = { text, updatedAt: new Date().toISOString() };
  await saveCollection('JSONBIN_BIN_ID_ANNOUNCEMENT', announcement);
  return announcement;
}

// ============================================================
// CABANG (bin: branches) — dipakai bareng oleh absensi & toko
// ============================================================

export async function getBranches(): Promise<Branch[]> {
  const binId = requireBinId('JSONBIN_BIN_ID_BRANCHES');
  try {
    const data = await readBin<Branch[] | string[]>(binId);
    if (!Array.isArray(data)) return [];
    // Migrasi otomatis dari format lama (string[] nama cabang saja)
    if (data.length > 0 && typeof data[0] === 'string') {
      return (data as string[]).map((nama, i) => ({
        id: `branch-legacy-${i}`,
        nama,
        createdAt: new Date().toISOString(),
      }));
    }
    return data as Branch[];
  } catch {
    return [];
  }
}
export async function saveBranches(branches: Branch[]): Promise<void> {
  await saveCollection('JSONBIN_BIN_ID_BRANCHES', branches);
}

// ============================================================
// KARYAWAN & ADMIN (bin: employees)
// Menggantikan bin lama yg cuma string[] nama karyawan.
// ============================================================

export async function getEmployees(): Promise<Employee[]> {
  const binId = requireBinId('JSONBIN_BIN_ID_EMPLOYEES');
  try {
    const data = await readBin<Employee[] | string[]>(binId);
    if (!Array.isArray(data)) return [];
    // Data lama cuma nama doang, tidak punya password/role -> tidak bisa dipakai
    // login, jadi cukup di-skip (admin perlu re-create lewat panel admin baru).
    if (data.length > 0 && typeof data[0] === 'string') return [];
    return data as Employee[];
  } catch {
    return [];
  }
}
export async function saveEmployees(employees: Employee[]): Promise<void> {
  await saveCollection('JSONBIN_BIN_ID_EMPLOYEES', employees);
}

// ============================================================
// PROFIL TOKO (bin: store_profile)
// ============================================================

const DEFAULT_STORE_PROFILE: StoreProfile = {
  namaToko: 'Biang Aroma X Me.Racik Parfum',
  deskripsi: '',
  logoUrl: '',
  socialMedia: {},
  pembayaran: {},
  homeSections: [],
  updatedAt: new Date(0).toISOString(),
};

export async function getStoreProfile(): Promise<StoreProfile> {
  const profile = await getCollection<StoreProfile>('JSONBIN_BIN_ID_STORE_PROFILE', DEFAULT_STORE_PROFILE);
  // Migrasi: profil lama yang tersimpan sebelum ada homeSections
  return { ...profile, homeSections: profile.homeSections ?? [] };
}
export async function saveStoreProfile(profile: StoreProfile): Promise<void> {
  await saveCollection('JSONBIN_BIN_ID_STORE_PROFILE', {
    ...profile,
    updatedAt: new Date().toISOString(),
  });
}

// ============================================================
// HARGA — DIPINDAH KE SUPABASE, lihat lib/supabase.ts.
// ============================================================

// ============================================================
// PRODUK & HARGA — DIPINDAH KE SUPABASE (lib/supabase.ts), tidak lagi di
// JSONBin. Lihat getProducts/saveProducts/getPricingConfig/savePricingConfig
// di lib/supabase.ts. Jalankan supabase-schema.sql sebelum deploy.
// ============================================================

// ============================================================
// MEMBER (bin: members)
// ============================================================

export async function getMembers(): Promise<Member[]> {
  return getCollection<Member[]>('JSONBIN_BIN_ID_MEMBERS', []);
}
export async function saveMembers(members: Member[]): Promise<void> {
  await saveCollection('JSONBIN_BIN_ID_MEMBERS', members);
}

// ============================================================
// VOUCHER (bin: vouchers)
// ============================================================

export async function getVouchers(): Promise<Voucher[]> {
  return getCollection<Voucher[]>('JSONBIN_BIN_ID_VOUCHERS', []);
}
export async function saveVouchers(vouchers: Voucher[]): Promise<void> {
  await saveCollection('JSONBIN_BIN_ID_VOUCHERS', vouchers);
}
