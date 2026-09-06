'use client';

import { useEffect } from 'react';

export default function GlobalPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Terjadi error di halaman:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="ticket w-full max-w-sm p-8">
        <p className="text-4xl">⚠️</p>
        <h1 className="mt-3 font-display text-lg font-semibold text-ink">
          Ada yang tidak beres
        </h1>
        <p className="mt-1.5 text-sm text-ink/60">
          Halaman ini mengalami error. Coba muat ulang, atau kembali ke beranda.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => reset()}
            className="w-full rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Coba Lagi
          </button>
          <a
            href="/"
            className="w-full rounded-card border border-ink/15 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5"
          >
            Kembali ke Beranda
          </a>
        </div>
        <p className="mt-4 text-[11px] text-ink/30">BAW Group</p>
      </div>
    </main>
  );
}
