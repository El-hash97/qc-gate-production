import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TopNav } from '@/components/layout/TopNav';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'QC Gate Production',
  description: 'QC Gate Production Block Cylinder Line Finishing Monitoring System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
