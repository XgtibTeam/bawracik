function formatTanggal(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatHargaRibuan(rupiah: number): string {
  // 2000 -> "2k", 2500 -> "2.5k"
  const k = rupiah / 1000;
  return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}

export type WaTemplateParams = {
  namaToko: string; // "Racik Parfum"
  alamatToko: string; // "Jalan Danau Sentarum"
  namaMember: string;
  parfumList: string[]; // ["polo blue", "hmns farhampton", ...]
  hargaPerMl: number;
  pengisianKe: number[]; // [1,2,3] urutan pengisian per botol pada transaksi ini
  poinDariTransaksi: number;
  poinTotalAkumulasi: number;
};

export function buildWaMessage(params: WaTemplateParams): string {
  const tanggal = formatTanggal(new Date());
  return `Halo sobat ${params.namaToko}!!

Terimakasih atas kunjungan anda ke store ${params.namaToko} yang berada di ${params.alamatToko}, berikut rincian atas member anda:

Nama : ${params.namaMember}
Tanggal : ${tanggal}
Parfum : ${params.parfumList.join(', ')}
Harga : ${formatHargaRibuan(params.hargaPerMl)}
Pengisian ke : ${params.pengisianKe.join(',')} (satu botol dihitung 1 pengisian)
Poin : ${params.poinDariTransaksi}

Total akumulasi poin : ${params.poinTotalAkumulasi}`;
}

/** Bangun link wa.me dari nomor tujuan + pesan (nomor otomatis dirapikan ke format 62). */
export function buildWaLink(nomorWa: string, message: string): string {
  let nomor = nomorWa.replace(/[^0-9]/g, '');
  if (nomor.startsWith('0')) nomor = '62' + nomor.slice(1);
  if (!nomor.startsWith('62')) nomor = '62' + nomor;
  return `https://wa.me/${nomor}?text=${encodeURIComponent(message)}`;
}
