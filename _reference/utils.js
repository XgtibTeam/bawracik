/** Generate UUID v4 sederhana */
export const uid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });

/** Format angka ke Rupiah — aman dari null/undefined/NaN */
export const money = v => {
  const n = Math.max(0, parseInt(v) || 0);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/** Clamp rating ke 0–5 integer, aman dari nilai aneh */
export const safeRating = v => Math.min(5, Math.max(0, Math.floor(Number(v) || 0)));

/** Format tanggal ke locale Indonesia */
export const formatDate = (iso, opts = {}) =>
  new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    ...opts,
  });

export const formatDateTime = iso =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

/** Sapa sesuai jam */
export const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Selamat Pagi';
  if (h < 15) return 'Selamat Siang';
  if (h < 18) return 'Selamat Sore';
  return 'Selamat Malam';
};

/** Warna status badge */
export const statusBadge = status => {
  const map = {
    pending:   'warning',
    accepted:  'info',
    completed: 'success',
    rejected:  'danger',
  };
  return map[status] ?? 'purple';
};

export const statusLabel = status => {
  const map = {
    pending:   'Menunggu',
    accepted:  'Diproses',
    completed: 'Selesai',
    rejected:  'Ditolak',
  };
  return map[status] ?? status;
};

/** Ambil URL gambar pertama dari array atau string */
export const firstImage = img => {
  if (!img) return null;
  if (Array.isArray(img)) return img[0] ?? null;
  return img;
};

/** Pastikan img selalu berupa array */
export const imagesArray = img => {
  if (!img) return [];
  if (Array.isArray(img)) return img;
  return [img];
};

/** Respons API standar */
export const ok  = data             => ({ success: true,  data });
export const err = (msg, status=400) => ({ success: false, error: msg, status });
