'use client';

import { usePathname } from 'next/navigation';
import { Camera, ShoppingCart, Boxes, UserRound } from 'lucide-react';
import BottomNav, { type NavItem } from './BottomNav';

const NAV_ITEMS: NavItem[] = [
  { href: '/kasir/absen', label: 'Absen', icon: Camera },
  { href: '/kasir', label: 'Kasir', icon: ShoppingCart, exact: true },
  { href: '/kasir/stok', label: 'Stok', icon: Boxes },
  { href: '/akun/password', label: 'Akun', icon: UserRound },
];

export default function KasirShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/kasir/login';

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="pb-20">
      {children}
      <BottomNav items={NAV_ITEMS} />
    </div>
  );
}
