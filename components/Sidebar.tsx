'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home / Dashboard' },
  { href: '/belanja', label: 'Belanja' },
  { href: '/feeds', label: 'Feeds' },
  { href: '/member', label: 'Member Area' },
  { href: '/kasir/login', label: 'Login / Absen Karyawan' },
];

export default function Sidebar({ waCS }: { waCS?: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-ink/10 bg-white px-3 py-2 text-sm">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition ${
              active ? 'bg-accent text-white' : 'text-ink/60 hover:bg-paper'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      {waCS && (
        <a
          href={`https://wa.me/${waCS.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto whitespace-nowrap rounded-lg bg-accentSoft px-3 py-1.5 font-medium text-accent"
        >
          CS Medsos
        </a>
      )}
    </nav>
  );
}
