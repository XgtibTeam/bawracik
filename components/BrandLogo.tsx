'use client';

import { useEffect, useState } from 'react';
import { driveImageUrl } from '@/lib/drive-url';

export default function BrandLogo({ className = 'h-20 w-20' }: { className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [nama, setNama] = useState('BAW Group');

  useEffect(() => {
    fetch('/api/store-profile')
      .then((r) => r.json())
      .then((d) => {
        setNama(d?.profile?.namaToko || 'BAW Group');
        const drive = driveImageUrl(d?.profile?.logoUrl);
        setSrc(drive || '/logo.png');
      })
      .catch(() => setSrc('/logo.png'));
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || '/logo.png'}
      alt={nama}
      className={`${className} rounded-full object-cover`}
      onError={(e) => {
        if ((e.target as HTMLImageElement).src.indexOf('/logo.png') === -1) {
          (e.target as HTMLImageElement).src = '/logo.png';
        }
      }}
    />
  );
}
