/**
 * pages/api/products/[id].js
 * PUT    — update produk (admin)
 * DELETE — hapus produk (admin)
 */

import { getCollection, saveCollection } from '../../../lib/jsonbin';
import { requireRole } from '../../../lib/auth';

export default async function handler(req, res) {
  const { id } = req.query;
  const session = requireRole(req, 'admin');
  if (!session) return res.status(403).json({ success: false, error: 'Akses ditolak' });

  try {
    const products = await getCollection('products');
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });

    if (req.method === 'PUT') {
      const { name, price, desc, category, images } = req.body ?? {};
      products[idx] = {
        ...products[idx],
        name:     name?.trim()      ?? products[idx].name,
        price:    price != null     ? parseInt(price) : products[idx].price,
        desc:     desc?.trim()      ?? products[idx].desc,
        category: category?.trim()  ?? products[idx].category,
        images:   Array.isArray(images) ? images : (images ? [images] : products[idx].images ?? []),
        img:      Array.isArray(images) ? (images[0] ?? '') : (images ?? products[idx].img ?? ''),
        updated_at: new Date().toISOString(),
      };
      await saveCollection('products', products);
      return res.status(200).json({ success: true, data: products[idx] });
    }

    if (req.method === 'DELETE') {
      products.splice(idx, 1);
      await saveCollection('products', products);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
