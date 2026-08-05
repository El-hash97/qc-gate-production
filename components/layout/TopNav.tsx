'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './TopNav.module.css';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/input', label: 'Input' },
  { href: '/history', label: 'History' },
] as const;

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div>
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
    </header>
  );
}
