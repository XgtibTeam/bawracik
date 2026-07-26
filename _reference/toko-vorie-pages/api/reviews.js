/**
 * pages/api/reviews.js
 * GET — ambil daftar ulasan publik (hanya order yang punya rating)
 * Tidak butuh autentikasi
 */

import { getCollection } from '../../lib/jsonbin';

export default async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const orders = await getCollection('orders');
    const reviews = orders
      .filter(o => o.rating && o.status !== 'rejected')
      .map(o => ({
        id:         o.id,
        customer:   o.customer || 'Anonim',
        rating:     o.rating,
        feedback:   o.feedback ?? '',
        created_at: o.created_at,
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 24);

    return res.status(200).json({ success: true, data: reviews });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
