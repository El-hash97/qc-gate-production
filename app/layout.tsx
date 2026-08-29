import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { TopNav } from '@/components/layout/TopNav';
import { THEME_INIT_SCRIPT } from '@/hooks/useTheme';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'QC Gate Production',
  description: 'QC Gate Production Block Cylinder Line Finishing Monitoring System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        {/* Applies the saved theme to <html> before first paint — no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Providers>
          <TopNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
