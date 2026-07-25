/**
 * pages/api/users/[id].js
 * PUT    — update user (admin)
 * DELETE — hapus user (admin)
 */

import { getCollection, saveCollection } from '../../../lib/jsonbin';
import { requireRole, hashPassword } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = requireRole(req, 'admin');
  if (!session) return res.status(403).json({ success: false, error: 'Akses ditolak' });

  const { id } = req.query;

  try {
    const users = await getCollection('users');
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'User tidak ditemukan' });

    if (req.method === 'PUT') {
      const { name, username, password, role } = req.body ?? {};

      // Jangan downgrade admin terakhir
      if (users[idx].role === 'admin' && role !== 'admin') {
        const adminCount = users.filter(u => u.role === 'admin').length;
        if (adminCount <= 1)
          return res.status(400).json({ success: false, error: 'Tidak bisa downgrade admin terakhir' });
      }

      // Cek username unik (kecuali milik sendiri)
      if (username && users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== id))
        return res.status(409).json({ success: false, error: 'Username sudah dipakai' });

      users[idx] = {
        ...users[idx],
        name:       name?.trim()     ?? users[idx].name,
        username:   username?.trim() ?? users[idx].username,
        role:       ['admin', 'kasir'].includes(role) ? role : users[idx].role,
        updated_at: new Date().toISOString(),
      };

      if (password && password.length >= 6) {
        users[idx].password = await hashPassword(password);
      }

      await saveCollection('users', users);
      const { password: _, ...safe } = users[idx];
      return res.status(200).json({ success: true, data: safe });
    }

    if (req.method === 'DELETE') {
      // Jangan hapus admin terakhir
      if (users[idx].role === 'admin') {
        const adminCount = users.filter(u => u.role === 'admin').length;
        if (adminCount <= 1)
          return res.status(400).json({ success: false, error: 'Tidak bisa hapus admin terakhir' });
      }
      // Jangan hapus diri sendiri
      if (users[idx].id === session.id)
        return res.status(400).json({ success: false, error: 'Tidak bisa hapus akun sendiri' });

      users.splice(idx, 1);
      await saveCollection('users', users);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
