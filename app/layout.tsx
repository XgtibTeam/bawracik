import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import ThemeToggle from '@/components/ThemeToggle';
import { getStoreProfile } from '@/lib/jsonbin';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
});

// Dipertahankan sbg alias supaya class lama (font-body) tidak perlu diganti satu-satu.
const display = jakarta;
const body = jakarta;

export const metadata: Metadata = {
  title: 'Biang Aroma X Me.Racik Parfum',
  description: 'Webstore & sistem member BAW Group',
  icons: {
    icon: '/logo.png',
  },
};

// Skema warna (hijau/maroon) diatur ADMIN di Profil Toko — berlaku utk
// SEMUA pengunjung, jadi di-render server-side lewat atribut data-theme di
// <html> (bukan localStorage). Mode gelap/terang TETAP pilihan masing-masing
// pengunjung sendiri, disimpan di localStorage browsernya via ThemeToggle.
export const dynamic = 'force-dynamic';

// Script kecil ini jalan SEBELUM React hydrate/paint, supaya mode
// dark/light yang tersimpan di localStorage pengunjung langsung kepakai
// tanpa kedip putih dulu (flash of unstyled theme).
const themeInitScript = `
(function () {
  try {
    var mode = localStorage.getItem('baw-theme-mode') || 'light';
    if (mode === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getStoreProfile();
  const colorScheme = profile.colorScheme === 'maroon' ? 'maroon' : undefined;

  return (
    <html lang="id" data-theme={colorScheme}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${display.variable} ${body.variable} font-body antialiased`}>
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
