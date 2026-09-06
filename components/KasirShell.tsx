'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Camera, ShoppingCart, Boxes, UserRound, ShieldCheck } from 'lucide-react';
import BottomNav, { type NavItem } from './BottomNav';

const BASE_NAV_ITEMS: NavItem[] = [
  { href: '/kasir/absen', label: 'Absen', icon: Camera },
  { href: '/kasir', label: 'Kasir', icon: ShoppingCart, exact: true },
  { href: '/kasir/stok', label: 'Stok', icon: Boxes },
  { href: '/akun/password', label: 'Akun', icon: UserRound },
];

const ADMIN_NAV_ITEM: NavItem = { href: '/admin', label: 'Admin', icon: ShieldCheck };

export default function KasirShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/kasir/login';
  const [isAdminRole, setIsAdminRole] = useState(false);

  // Tab "Admin" cuma tampil kalau karyawan yang login role-nya admin/superadmin
  // — supaya admin cabang bisa langsung pindah ke panel absensi & kelola toko
  // tanpa perlu login terpisah lewat /admin/login.
  useEffect(() => {
    if (isPublicPage) return;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setIsAdminRole(d.session?.role === 'admin' || d.session?.role === 'superadmin'))
      .catch(() => setIsAdminRole(false));
  }, [isPublicPage]);

  if (isPublicPage) {
    return <>{children}</>;
  }

  const navItems = isAdminRole ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM] : BASE_NAV_ITEMS;

  return (
    <div className="pb-20">
      {children}
      <BottomNav items={navItems} />
    </div>
  );
}
