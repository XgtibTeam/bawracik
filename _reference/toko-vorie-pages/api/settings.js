/**
 * pages/api/settings.js
 * GET  — ambil store settings (public)
 * PUT  — update settings (admin)
 */

import { getCollection, saveCollection } from '../../lib/jsonbin';
import { requireRole } from '../../lib/auth';

const DEFAULTS = {
  store_name: 'Toko Vorie',
  tagline:    'We Build And We Sell',
  logo_url:   '',
  payment: {
    dana:    { name: 'DANA', account: '', instruction: 'Transfer lalu tunjukkan bukti ke kasir.' },
    seabank: { name: 'SeaBank', account: '', instruction: 'Transfer lalu tunjukkan bukti ke kasir.' },
    qris:    { name: 'QRIS All Payment', link: '', instruction: 'Scan QRIS.' },
  },
  social: { instagram: '', tiktok: '', whatsapp: '' },
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const raw = await getCollection('settings');
      const cfg = Array.isArray(raw) ? raw[0] : raw;
      return res.status(200).json({ success: true, data: { ...DEFAULTS, ...cfg } });
    } catch {
      return res.status(200).json({ success: true, data: DEFAULTS });
    }
  }

  if (req.method === 'PUT') {
    const session = requireRole(req, 'admin');
    if (!session) return res.status(403).json({ success: false, error: 'Akses ditolak' });

    try {
      const current = await getCollection('settings').then(r => Array.isArray(r) ? r[0] : r).catch(() => ({}));
      const updated = { ...DEFAULTS, ...current, ...req.body, updated_at: new Date().toISOString() };
      await saveCollection('settings', updated);
      return res.status(200).json({ success: true, data: updated });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
