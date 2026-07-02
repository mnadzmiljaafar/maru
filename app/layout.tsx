import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Sistem Pengurusan Penilaian Murid - SK Taman Jasmin',
  description: 'Platform penilaian tahap penguasaan murid Sekolah Kebangsaan Taman Jasmin',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ms">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
