/**
 * pages/api/users/index.js
 * GET  — daftar users (admin)
 * POST — buat user baru (admin)
 */

import { getCollection, saveCollection } from '../../../lib/jsonbin';
import { requireRole, hashPassword } from '../../../lib/auth';
import { uid } from '../../../lib/utils';

export default async function handler(req, res) {
  const session = requireRole(req, 'admin');
  if (!session) return res.status(403).json({ success: false, error: 'Akses ditolak' });

  if (req.method === 'GET') {
    try {
      const users = await getCollection('users');
      // Jangan kirim password ke client
      return res.status(200).json({
        success: true,
        data: users.map(({ password: _, ...u }) => u),
      });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { name, username, password, role } = req.body ?? {};
    if (!username || !password)
      return res.status(400).json({ success: false, error: 'Username dan password wajib diisi' });
    if (username.length < 3)
      return res.status(400).json({ success: false, error: 'Username minimal 3 karakter' });
    if (password.length < 6)
      return res.status(400).json({ success: false, error: 'Password minimal 6 karakter' });

    try {
      const users = await getCollection('users');
      const exists = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (exists) return res.status(409).json({ success: false, error: 'Username sudah dipakai' });

      const hashed = await hashPassword(password);
      const user = {
        id:         uid(),
        username:   username.trim(),
        password:   hashed,
        role:       ['admin', 'kasir'].includes(role) ? role : 'kasir',
        name:       name?.trim() || username.trim(),
        created_at: new Date().toISOString(),
      };
      users.push(user);
      await saveCollection('users', users);
      const { password: _, ...safe } = user;
      return res.status(201).json({ success: true, data: safe });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
