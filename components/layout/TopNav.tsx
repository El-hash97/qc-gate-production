'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardSettings, PANELS, type PanelId } from '@/hooks/useDashboardSettings';
import { LoginModal } from './LoginModal';
import { SettingsModal } from './SettingsModal';
import styles from './TopNav.module.css';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/input', label: 'Input' },
  { href: '/history', label: 'History' },
  { href: '/master-data', label: 'Master Data' },
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

// Plain "person" glyph — inherits colour from the button via currentColor,
// same as the theme toggle's ☀/☾ characters do.
function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill="currentColor" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Standard "settings" gear glyph (the widely-used Feather Icons outline).
function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
      />
    </svg>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { authed, loginModalOpen, openLoginModal, closeLoginModal, login, logout } = useAuth();
  const { hidden, toggle: togglePanel, settingsOpen, openSettings, closeSettings } = useDashboardSettings();

  return (
    <header className={styles.header}>
      {authed ? (
        <>
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
        </>
      ) : (
        <>
          <div className={styles.logoGroup}>
            {/* eslint-disable-next-line @next/next/no-img-element -- matches
                the plain <img> convention already used for PicCard photos */}
            <img className={styles.logo} src="/logo.png" alt="Toyota" />
          </div>
          <div className={`${styles.titleGroup} ${styles.titleGroupCenter}`}>
            <div className={styles.title}>QC Gate Production</div>
            <div className={styles.subtitle}>Block Cylinder Line Finishing — Monitoring System</div>
          </div>
        </>
      )}
      <div className={styles.rightControls}>
        <button
          type="button"
          className={authed ? `${styles.authButton} ${styles.authButtonActive}` : styles.authButton}
          onClick={authed ? logout : openLoginModal}
          aria-label={authed ? 'Logout' : 'Login'}
          title={authed ? 'Logout' : 'Login'}
        >
          <PersonIcon />
        </button>
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        {authed && (
          <button
            type="button"
            className={styles.authButton}
            onClick={openSettings}
            aria-label="Pengaturan dashboard"
            title="Pengaturan dashboard"
          >
            <GearIcon />
          </button>
        )}
        <RealTimeClock />
      </div>
      <LoginModal isOpen={loginModalOpen} onClose={closeLoginModal} onLogin={login} />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={closeSettings}
        panels={PANELS}
        hidden={hidden}
        onToggle={(id) => togglePanel(id as PanelId)}
      />
    </header>
  );
}
