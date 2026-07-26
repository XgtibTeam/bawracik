/**
 * pages/api/auth/login.js
 * POST — login, verifikasi password, set httpOnly cookie
 */

import { getCollection, saveCollection } from '../../../lib/jsonbin';
import { checkPassword, hashPassword, setSessionCookie, requireAuth } from '../../../lib/auth';

export default async function handler(req, res) {
  // GET — cek session aktif
  if (req.method === 'GET') {
    const session = requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: 'Tidak ada sesi aktif' });
    return res.status(200).json({ success: true, user: session });
  }

  // POST — login
  if (req.method !== 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { username, password } = req.body ?? {};
  if (!username || !password)
    return res.status(400).json({ success: false, error: 'Username dan password wajib diisi' });

  try {
    const users = await getCollection('users');
    const user  = users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());

    if (!user)
      return res.status(401).json({ success: false, error: 'Username atau password salah' });

    const valid = await checkPassword(password.trim(), user.password);
    if (!valid)
      return res.status(401).json({ success: false, error: 'Username atau password salah' });

    // Migrasi: jika password masih plaintext, hash sekarang
    if (user.password && !user.password.startsWith('$2')) {
      user.password = await hashPassword(password.trim());
      const idx = users.findIndex(u => u.id === user.id);
      if (idx !== -1) users[idx] = user;
      await saveCollection('users', users).catch(() => {}); // fire and forget
    }

    // Record absensi (hanya satu kali per hari, simpan ke server tidak bisa karena stateless)
    // Absensi di-handle terpisah kalau perlu, atau tetap di localStorage

    setSessionCookie(res, user);

    return res.status(200).json({
      success: true,
      user: {
        id:       user.id,
        username: user.username,
        role:     user.role,
        name:     user.name ?? user.username,
      },
    });
  } catch (e) {
    console.error('[login]', e);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
