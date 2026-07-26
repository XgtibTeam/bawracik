/**
 * pages/api/products/index.js
 * GET  — ambil semua produk (public)
 * POST — tambah produk (admin only)
 */

import { getCollection, saveCollection } from '../../../lib/jsonbin';
import { requireRole } from '../../../lib/auth';
import { uid } from '../../../lib/utils';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const products = await getCollection('products');
      return res.status(200).json({ success: true, data: products });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  if (req.method === 'POST') {
    const session = requireRole(req, 'admin');
    if (!session) return res.status(403).json({ success: false, error: 'Akses ditolak' });

    const { name, price, desc, category, images } = req.body ?? {};
    if (!name || !price)
      return res.status(400).json({ success: false, error: 'Nama dan harga wajib diisi' });

    try {
      const products = await getCollection('products');
      const product = {
        id:         uid(),
        name:       name.trim(),
        price:      parseInt(price),
        desc:       desc?.trim() ?? '',
        category:   category?.trim() ?? '',
        images:     Array.isArray(images) ? images : (images ? [images] : []),
        // img tetap disimpan untuk kompatibilitas dengan data lama
        img:        Array.isArray(images) ? (images[0] ?? '') : (images ?? ''),
        created_at: new Date().toISOString(),
      };
      products.push(product);
      await saveCollection('products', products);
      return res.status(201).json({ success: true, data: product });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
