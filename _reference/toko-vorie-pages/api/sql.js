/**
 * pages/api/sql.js
 * POST — jalankan SQL query ke Supabase (admin only)
 * Pakai SUPABASE_SERVICE_KEY dari env, tidak pernah ke client
 */

import { requireRole } from '../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = requireRole(req, 'admin');
  if (!session) return res.status(403).json({ success: false, error: 'Akses ditolak' });

  const { query } = req.body ?? {};
  if (!query?.trim()) return res.status(400).json({ success: false, error: 'Query kosong' });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key)
    return res.status(500).json({ success: false, error: 'Supabase belum dikonfigurasi' });

  try {
    const r = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (r.status === 404) {
      return res.status(400).json({
        success: false,
        error: 'Fungsi exec_sql tidak tersedia. Buat dulu di Supabase SQL Editor:\nCREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE result jsonb; BEGIN EXECUTE query INTO result; RETURN result; END; $$;',
      });
    }

    const data = await r.json();
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
