'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/hooks/useTheme';
import styles from './TopNav.module.css';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/input', label: 'Input' },
  { href: '/history', label: 'History' },
] as const;

function RealTimeClock() {
  // Null until mounted: the server and the first client render both emit empty
  // spans, so there is nothing to mismatch during hydration. The effect fills
  // in the real time immediately after.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now
    ? now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '';
  const date = now
    ? now.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })
    : '';

  return (
    <div className={styles.clock} aria-label="Waktu real-time">
      <span className={styles.clockTime}>{time}</span>
      <span className={styles.clockDate}>{date}</span>
    </div>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        <div className={styles.title}>QC Gate Production</div>
        <div className={styles.subtitle}>Block Cylinder Line Finishing — Monitoring System</div>
      </div>
      <nav className={styles.nav}>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname.startsWith(link.href) ? styles.linkActive : styles.link}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className={styles.rightControls}>
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <RealTimeClock />
      </div>
    </header>
  );
}
