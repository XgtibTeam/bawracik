import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import ThemeToggle from '@/components/ThemeToggle';

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

// Script kecil ini jalan SEBELUM React hydrate/paint, supaya tema
// dark/light & skema warna (hijau/maroon) yang tersimpan di localStorage
// langsung kepakai tanpa kedip putih dulu (flash of unstyled theme).
const themeInitScript = `
(function () {
  try {
    var mode = localStorage.getItem('baw-theme-mode') || 'light';
    var scheme = localStorage.getItem('baw-theme-scheme') || 'hijau';
    if (mode === 'dark') document.documentElement.classList.add('dark');
    if (scheme === 'maroon') document.documentElement.setAttribute('data-theme', 'maroon');
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
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
