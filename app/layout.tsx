import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QC Gate Production',
  description: 'QC Gate Production Block Cylinder Line Finishing Monitoring System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
