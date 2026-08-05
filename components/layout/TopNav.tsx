'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './TopNav.module.css';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/input', label: 'Input' },
  { href: '/history', label: 'History' },
] as const;

function RealTimeClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const date = now.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

  return (
    <div className={styles.clock} aria-label="Waktu real-time">
      <span className={styles.clockTime}>{time}</span>
      <span className={styles.clockDate}>{date}</span>
    </div>
  );
}

export function TopNav() {
  const pathname = usePathname();

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
      <RealTimeClock />
    </header>
  );
}
