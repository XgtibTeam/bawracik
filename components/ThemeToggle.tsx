'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

type Mode = 'light' | 'dark';

// Cuma ngatur mode gelap/terang milik pengunjung sendiri (disimpan di
// localStorage browsernya). Skema warna situs (hijau/maroon) diatur ADMIN
// di Profil Toko dan berlaku utk semua orang — lihat app/layout.tsx.
export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('light');

  useEffect(() => {
    const saved = (localStorage.getItem('baw-theme-mode') as Mode) || 'light';
    setMode(saved);
  }, []);

  function toggleMode() {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('baw-theme-mode', next);
  }

  return (
    <button
      onClick={toggleMode}
      aria-label="Ganti mode gelap/terang"
      className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-lg hover:opacity-90"
    >
      {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
