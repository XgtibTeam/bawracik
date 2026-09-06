/**
 * pages/api/orders/[id].js
 * PUT — update status order (kasir/admin)
 */

import { getCollection, saveCollection } from '../../../lib/jsonbin';
import { requireRole } from '../../../lib/auth';

const VALID_STATUSES = ['pending', 'accepted', 'completed', 'rejected'];

export default async function handler(req, res) {
  if (req.method !== 'PUT')
    return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = requireRole(req, 'admin', 'kasir');
  if (!session) return res.status(403).json({ success: false, error: 'Akses ditolak' });

  const { id } = req.query;
  const { status } = req.body ?? {};

  if (!VALID_STATUSES.includes(status))
    return res.status(400).json({ success: false, error: 'Status tidak valid' });

  try {
    const orders = await getCollection('orders');
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Order tidak ditemukan' });

    orders[idx].status = status;
    orders[idx].history = [
      ...(orders[idx].history ?? []),
      { event: `status_changed_to_${status}`, by: session.username, at: new Date().toISOString() },
    ];
    orders[idx].updated_at = new Date().toISOString();

    await saveCollection('orders', orders);
    return res.status(200).json({ success: true, data: orders[idx] });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
