'use client';

import { Home, ShoppingBag, Images, CircleUserRound, Users } from 'lucide-react';
import BottomNav, { type NavItem } from './BottomNav';

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: Home, exact: true },
  { href: '/belanja', label: 'Belanja', icon: ShoppingBag },
  { href: '/feeds', label: 'Feeds', icon: Images },
  { href: '/member', label: 'Member', icon: CircleUserRound },
  { href: '/kasir/login', label: 'Karyawan', icon: Users },
];

export default function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-20">
      {children}
      <p className="pb-3 pt-6 text-center text-[11px] text-ink/30">By Toko Vorie</p>
      <BottomNav items={NAV_ITEMS} />
    </div>
  );
}
