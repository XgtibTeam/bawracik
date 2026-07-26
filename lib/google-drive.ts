// ============================================================
// Integrasi Google Drive untuk menyimpan foto swafoto absensi.
//
// PENTING: pakai OAuth (login akun Gmail biasa kamu sendiri) — BUKAN Service
// Account. Service Account tidak punya kuota penyimpanan sendiri, jadi upload
// akan selalu gagal dengan error "storageQuotaExceeded" kalau foldernya ada
// di akun Gmail biasa (bukan Google Workspace + Shared Drive).
//
// Caranya: sekali di awal, kamu login lewat Google OAuth Playground pakai
// akun Gmail kamu sendiri untuk menghasilkan "refresh token". Refresh token
// itu disimpan di .env.local, lalu server otomatis pakai token itu buat
// minta access token baru tiap kali upload/baca foto — jadi tidak perlu
// login manual berulang-ulang. Lihat README bagian Langkah 3 untuk panduan
// lengkap ambil Client ID/Secret/Refresh Token.
// ============================================================

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} belum diatur di .env.local`);
  }
  return value;
}

export type DriveFolder = 'attendance' | 'products' | 'feed';

function getFolderId(folder: DriveFolder = 'attendance'): string {
  if (folder === 'products') return getEnv('GOOGLE_DRIVE_FOLDER_ID_PRODUCTS');
  if (folder === 'feed') return getEnv('GOOGLE_DRIVE_FOLDER_ID_FEED');
  return getEnv('GOOGLE_DRIVE_FOLDER_ID');
}

// Cache token di memori proses server (bertahan ~beberapa menit,
// server serverless biasanya "dingin" ulang tiap beberapa saat,
// jadi ini cukup buat kurangi request token berulang-ulang).
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const clientId = getEnv('GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = getEnv('GOOGLE_OAUTH_CLIENT_SECRET');
  const refreshToken = getEnv('GOOGLE_OAUTH_REFRESH_TOKEN');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Gagal refresh token Google Drive (cek GOOGLE_OAUTH_CLIENT_ID/GOOGLE_OAUTH_CLIENT_SECRET/GOOGLE_OAUTH_REFRESH_TOKEN): ${await res.text()}`
    );
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token as string,
    expiresAt: Date.now() + (Number(data.expires_in || 3600) * 1000),
  };
  return cachedToken.token;
}

export async function uploadPhotoToDrive(
  base64DataUrl: string,
  filename: string,
  folder: DriveFolder = 'attendance'
): Promise<{ path: string }> {
  const matches = base64DataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Format foto tidak valid');
  }
  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');

  const accessToken = await getAccessToken();
  const folderId = getFolderId(folder);

  const boundary = `gxo_${Math.random().toString(16).slice(2)}`;
  const metadata = { name: filename, parents: [folderId] };

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
      'utf-8'
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--`, 'utf-8'),
  ]);

  const res = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Gagal mengunggah foto ke Google Drive: ${await res.text()}`);
  }

  const data = await res.json();
  // "path" di sini berupa Google Drive File ID (dipakai lagi untuk ambil/preview foto)
  return { path: data.id as string };
}

export type PhotoListItem = {
  id: string;
  name: string;
  updatedAt: string | null;
  sizeBytes: number | null;
};

async function makeFilePublic(fileId: string, accessToken: string): Promise<void> {
  const res = await fetch(`${DRIVE_API}/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
  if (!res.ok) {
    throw new Error(`Gagal set akses publik foto: ${await res.text()}`);
  }
}

/**
 * Upload gambar yang MEMANG boleh publik (logo toko, QRIS, foto produk) —
 * beda dari uploadPhotoToDrive (swafoto absensi) yang sengaja privat.
 * Mengembalikan fileId + URL langsung yang bisa dipasang di <img src>.
 */
export async function uploadPublicImage(
  base64DataUrl: string,
  filename: string,
  folder: DriveFolder = 'products'
): Promise<{ fileId: string; url: string }> {
  const { path: fileId } = await uploadPhotoToDrive(base64DataUrl, filename, folder);
  const accessToken = await getAccessToken();
  await makeFilePublic(fileId, accessToken);
  return { fileId, url: `https://drive.google.com/uc?export=view&id=${fileId}` };
}

export async function listPhotos(folder: DriveFolder = 'attendance'): Promise<PhotoListItem[]> {
  const accessToken = await getAccessToken();
  const folderId = getFolderId(folder);

  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, createdTime, modifiedTime, size)',
    orderBy: 'createdTime desc',
    pageSize: '1000',
  });

  const res = await fetch(`${DRIVE_API}/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Gagal mengambil daftar foto: ${await res.text()}`);
  }

  const data = await res.json();
  const files = (data.files || []) as Array<{
    id: string;
    name: string;
    createdTime?: string;
    modifiedTime?: string;
    size?: string;
  }>;

  return files.map((f) => ({
    id: f.id,
    name: f.name,
    updatedAt: f.modifiedTime || f.createdTime || null,
    sizeBytes: f.size ? Number(f.size) : null,
  }));
}

// Karena file di Drive disimpan PRIVAT (tidak di-share publik), cara
// paling aman untuk preview di panel admin adalah server mengambil bytes
// foto lewat OAuth akun Gmail lalu mengembalikannya sebagai data URL
// (base64) — jadi link Drive-nya sendiri tidak pernah perlu dibuka publik.
export async function getPhotoDataUrl(fileId: string): Promise<string> {
  const accessToken = await getAccessToken();

  const metaRes = await fetch(`${DRIVE_API}/files/${fileId}?fields=mimeType,name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!metaRes.ok) {
    throw new Error(`Gagal mengambil info foto: ${await metaRes.text()}`);
  }
  const meta = await metaRes.json();
  const mimeType = meta.mimeType || 'image/jpeg';

  const mediaRes = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!mediaRes.ok) {
    throw new Error(`Gagal memuat foto: ${await mediaRes.text()}`);
  }
  const arrayBuffer = await mediaRes.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:${mimeType};base64,${base64}`;
}
