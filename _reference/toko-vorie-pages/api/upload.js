/**
 * pages/api/upload.js
 * POST — upload satu atau lebih gambar ke Supabase Storage
 * Hanya bisa diakses oleh admin/kasir
 * 
 * Form data: files[] (multiple)
 * Returns: { urls: string[] }
 */

import { requireRole } from '../../lib/auth';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = requireRole(req, 'admin', 'kasir');
  if (!session) return res.status(403).json({ success: false, error: 'Akses ditolak' });

  // Parse multipart form dengan raw stream
  const busboy = (await import('busboy')).default;
  const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_KEY;
  const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ?? 'store-assets';

  return new Promise((resolve) => {
    const urls   = [];
    const errors = [];
    let pending  = 0;

    const bb = busboy({ headers: req.headers, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

    bb.on('file', (fieldname, file, info) => {
      const { filename, mimeType } = info;
      const ext  = filename.split('.').pop().toLowerCase();
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const chunks = [];

      pending++;
      file.on('data', c => chunks.push(c));
      file.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        try {
          const uploadRes = await fetch(
            `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${path}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': mimeType,
                'x-upsert': 'true',
              },
              body: buffer,
            }
          );
          if (!uploadRes.ok) throw new Error(`Upload gagal: ${uploadRes.status}`);
          urls.push(`${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`);
        } catch (e) {
          errors.push(e.message);
        }
        pending--;
        if (pending === 0) {
          if (errors.length > 0 && urls.length === 0)
            res.status(500).json({ success: false, error: errors[0] });
          else
            res.status(200).json({ success: true, urls });
          resolve();
        }
      });
    });

    bb.on('finish', () => {
      if (pending === 0) {
        res.status(200).json({ success: true, urls });
        resolve();
      }
    });

    req.pipe(bb);
  });
}
