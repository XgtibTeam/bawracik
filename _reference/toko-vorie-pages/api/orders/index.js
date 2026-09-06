/**
 * pages/api/orders/index.js
 * GET  — daftar order (kasir/admin)
 * POST — buat order baru (public)
 */

import { getCollection, saveCollection } from '../../../lib/jsonbin';
import { requireRole } from '../../../lib/auth';
import { uid } from '../../../lib/utils';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const session = requireRole(req, 'admin', 'kasir');
    if (!session) return res.status(403).json({ success: false, error: 'Akses ditolak' });
    try {
      const orders = await getCollection('orders');
      return res.status(200).json({ success: true, data: orders });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { customer, acc, items, total, rating, feedback } = req.body ?? {};
    if (!acc || !items || !items.length)
      return res.status(400).json({ success: false, error: 'Data order tidak lengkap' });

    try {
      const orders = await getCollection('orders');
      const order = {
        id:         uid(),
        customer:   customer?.trim() || 'Anonim',
        acc:        acc.trim(),
        items,
        total:      parseInt(total) || 0,
        rating:     rating ?? undefined,
        feedback:   feedback?.trim() || undefined,
        status:     'pending',
        created_at: new Date().toISOString(),
        history:    [{ event: 'created', at: new Date().toISOString() }],
      };
      orders.push(order);
      await saveCollection('orders', orders);
      return res.status(201).json({ success: true, data: order });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
