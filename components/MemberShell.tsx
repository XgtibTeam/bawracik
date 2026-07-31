'use client';

import { usePathname } from 'next/navigation';
import { Compass, Ticket, UserPlus, CircleUserRound } from 'lucide-react';
import BottomNav, { type NavItem } from './BottomNav';

const NAV_ITEMS: NavItem[] = [
  { href: '/member', label: 'Beranda', icon: Compass, exact: true },
  { href: '/member/voucher', label: 'Voucher', icon: Ticket },
  { href: '/member/undang', label: 'Undang', icon: UserPlus },
  { href: '/member/profil', label: 'Profil', icon: CircleUserRound },
];

export default function MemberShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/member/login';

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
