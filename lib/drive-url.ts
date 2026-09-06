// Helper murni (tidak menyentuh env/server) buat dipakai di komponen client
// mana pun yang perlu menampilkan foto publik dari Google Drive (foto produk,
// foto feed, logo toko). Apapun format lama yang tersimpan (ID mentah, URL
// "uc?export=view", URL "thumbnail?id=") dikonversi ke satu bentuk yang
// SELALU stabil: proxy kita sendiri di /api/public-image/:id, yang mengambil
// bytes gambar lewat Drive API server-side (bukan hotlink langsung ke Google
// yang sering diblokir/gagal tampil).
export function driveImageUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // Sudah dalam bentuk proxy kita — pakai apa adanya.
  if (trimmed.startsWith('/api/public-image/')) return trimmed;

  // Coba ekstrak file ID dari berbagai format URL Google Drive yang lama.
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const dSlashMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const driveId = idParamMatch?.[1] || dSlashMatch?.[1];
  if (driveId) return `/api/public-image/${driveId}`;

  // URL http lain yang bukan format Drive dikenal (mis. link gambar
  // eksternal yang ditempel manual admin) — tampilkan apa adanya.
  if (trimmed.startsWith('http')) return trimmed;

  // Selain itu anggap ini ID file Drive mentah.
  return `/api/public-image/${trimmed}`;
}
