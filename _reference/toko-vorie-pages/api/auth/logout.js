/**
 * pages/api/auth/logout.js
 * POST — hapus httpOnly cookie
 */

import { clearSessionCookie } from '../../../lib/auth';

export default function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' });

  clearSessionCookie(res);
  return res.status(200).json({ success: true });
}
