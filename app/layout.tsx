import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sistem Pengurusan Penilaian Murid',
  description: 'Platform penilaian tahap penguasaan murid yang komprehensif',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}
