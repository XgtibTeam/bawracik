import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${display.variable} ${body.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
