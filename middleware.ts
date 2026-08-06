import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import type { Role } from '@/lib/types';

// Halaman yang butuh login, dan role apa saja yang boleh masuk
const PROTECTED_PAGES: { prefix: string; publicSubpaths: string[]; roles: Role[] }[] = [
  { prefix: '/admin', publicSubpaths: ['/admin/login'], roles: ['superadmin', 'admin'] },
  { prefix: '/kasir', publicSubpaths: ['/kasir/login'], roles: ['superadmin', 'admin', 'kasir'] },
  { prefix: '/member', publicSubpaths: ['/member/login'], roles: ['member'] },
  { prefix: '/akun', publicSubpaths: ['/kasir/login'], roles: ['superadmin', 'admin', 'kasir'] },
];

// API yang butuh login staff (superadmin/admin/kasir) untuk method tertentu
const STAFF_PROTECTED_API: { prefix: string; methods: string[]; roles: Role[] }[] = [
  { prefix: '/api/attendance', methods: ['GET'], roles: ['superadmin', 'admin', 'kasir'] },
  { prefix: '/api/export', methods: ['GET'], roles: ['superadmin', 'admin'] },
  { prefix: '/api/photos', methods: ['GET', 'POST', 'DELETE'], roles: ['superadmin', 'admin'] },
  { prefix: '/api/branches', methods: ['POST', 'DELETE', 'PUT'], roles: ['superadmin', 'admin'] },
  { prefix: '/api/employees', methods: ['POST', 'DELETE', 'PUT'], roles: ['superadmin', 'admin'] },
  { prefix: '/api/announcement', methods: ['POST'], roles: ['superadmin', 'admin'] },
  { prefix: '/api/products', methods: ['POST', 'DELETE', 'PUT'], roles: ['superadmin', 'admin'] },
  { prefix: '/api/pricing', methods: ['POST', 'PUT'], roles: ['superadmin', 'admin'] },
  { prefix: '/api/vouchers', methods: ['POST', 'DELETE', 'PUT'], roles: ['superadmin', 'admin'] },
  { prefix: '/api/stock-recap', methods: ['GET', 'POST'], roles: ['superadmin', 'admin', 'kasir'] },
  { prefix: '/api/stock-movements', methods: ['GET', 'POST'], roles: ['superadmin', 'admin', 'kasir'] },
  { prefix: '/api/stock-snapshot', methods: ['GET', 'POST'], roles: ['superadmin', 'admin', 'kasir'] },
  { prefix: '/api/stock-summary', methods: ['GET'], roles: ['superadmin', 'admin', 'kasir'] },
  { prefix: '/api/reports/export', methods: ['GET'], roles: ['superadmin', 'admin', 'kasir'] },
  { prefix: '/api/store-profile', methods: ['POST', 'PUT'], roles: ['superadmin', 'admin'] },
  { prefix: '/api/upload', methods: ['POST'], roles: ['superadmin', 'admin'] },
  { prefix: '/api/auth/change-password', methods: ['POST'], roles: ['superadmin', 'admin', 'kasir'] },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  // ---- Halaman ----
  for (const page of PROTECTED_PAGES) {
    if (pathname.startsWith(page.prefix) && !page.publicSubpaths.includes(pathname)) {
      if (!session || !page.roles.includes(session.role)) {
        const loginUrl = new URL(page.publicSubpaths[0], req.url);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // ---- API ----
  for (const api of STAFF_PROTECTED_API) {
    if (pathname.startsWith(api.prefix) && api.methods.includes(req.method)) {
      if (!session || !api.roles.includes(session.role)) {
        return NextResponse.json({ error: 'Akses ditolak, silakan login' }, { status: 401 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/kasir/:path*',
    '/member/:path*',
    '/akun/:path*',
    '/api/attendance/:path*',
    '/api/export/:path*',
    '/api/branches/:path*',
    '/api/employees/:path*',
    '/api/announcement/:path*',
    '/api/photos/:path*',
    '/api/products/:path*',
    '/api/pricing/:path*',
    '/api/vouchers/:path*',
    '/api/transactions/:path*',
    '/api/stock-recap/:path*',
    '/api/stock-movements/:path*',
    '/api/stock-snapshot/:path*',
    '/api/stock-summary/:path*',
    '/api/reports/export/:path*',
    '/api/store-profile/:path*',
    '/api/upload/:path*',
    '/api/auth/change-password/:path*',
  ],
};
