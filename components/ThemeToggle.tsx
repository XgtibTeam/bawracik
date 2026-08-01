'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Palette } from 'lucide-react';

type Mode = 'light' | 'dark';
type Scheme = 'hijau' | 'maroon';

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('light');
  const [scheme, setScheme] = useState<Scheme>('hijau');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const savedMode = (localStorage.getItem('baw-theme-mode') as Mode) || 'light';
    const savedScheme = (localStorage.getItem('baw-theme-scheme') as Scheme) || 'hijau';
    setMode(savedMode);
    setScheme(savedScheme);
  }, []);

  function apply(nextMode: Mode, nextScheme: Scheme) {
    const html = document.documentElement;
    html.classList.toggle('dark', nextMode === 'dark');
    if (nextScheme === 'maroon') html.setAttribute('data-theme', 'maroon');
    else html.removeAttribute('data-theme');
    localStorage.setItem('baw-theme-mode', nextMode);
    localStorage.setItem('baw-theme-scheme', nextScheme);
  }

  function toggleMode() {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    apply(next, scheme);
  }

  function pickScheme(next: Scheme) {
    setScheme(next);
    apply(mode, next);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="ticket mb-2 w-48 space-y-2 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Warna Tema</p>
          <div className="flex gap-2">
            <button
              onClick={() => pickScheme('hijau')}
              className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${
                scheme === 'hijau' ? 'border-accent text-accent' : 'border-ink/15 text-ink/50'
              }`}
            >
              🟢 Hijau
            </button>
            <button
              onClick={() => pickScheme('maroon')}
              className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${
                scheme === 'maroon' ? 'border-accent text-accent' : 'border-ink/15 text-ink/50'
              }`}
            >
              🔴 Maroon
            </button>
          </div>
          <button
            onClick={toggleMode}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2 text-xs font-semibold text-white"
          >
            {mode === 'light' ? (
              <>
                <Moon size={14} /> Mode Gelap
              </>
            ) : (
              <>
                <Sun size={14} /> Mode Terang
              </>
            )}
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Pengaturan tema"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-lg hover:opacity-90"
      >
        <Palette size={18} />
      </button>
    </div>
  );
}
