// Helper murni (tidak menyentuh env/server) buat dipakai di komponen client
// mana pun yang perlu menampilkan foto publik dari Google Drive (foto produk,
// foto feed, logo toko). imageDriveId yang tersimpan di database CUMA berupa
// ID file Drive, BUKAN URL siap pakai — jadi tidak boleh langsung dipasang ke
// <img src={idNya}>, harus lewat helper ini dulu.
export function driveImageUrl(fileId?: string | null): string | undefined {
  if (!fileId) return undefined;
  // Kalau yang tersimpan ternyata sudah berupa URL penuh (data lama / kasus
  // lain), pakai apa adanya supaya tidak dobel-format.
  if (fileId.startsWith('http')) return fileId;
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}
