import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { getStoreProfile } from '@/lib/jsonbin';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

const body = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
});

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
  let waCS: string | undefined;
  try {
    const profile = await getStoreProfile();
    waCS = profile.socialMedia?.whatsapp;
  } catch {
    waCS = undefined;
  }

  return (
    <html lang="id">
      <body className={`${display.variable} ${body.variable} font-body`}>
        <Sidebar waCS={waCS} />
        {children}
      </body>
    </html>
  );
}
