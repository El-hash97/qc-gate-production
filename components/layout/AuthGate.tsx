'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from './AuthGate.module.css';

// Dashboard stays public (the whole point of the login gate is to keep it
// the always-visible view); Input writes shift data and History exposes past
// shifts, so those two are what "lebih privasi" is actually asking to lock.
const PROTECTED_PATHS = ['/input', '/history'];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { authed, mounted, openLoginModal } = useAuth();
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

  // Before mount, the real session (read from sessionStorage) isn't known
  // yet — render children rather than flash a locked screen that a mounted
  // logged-in user would immediately see replaced.
  if (isProtected && mounted && !authed) {
    return (
      <main className={styles.locked}>
        <p className={styles.message}>Halaman ini memerlukan login.</p>
        <button type="button" className={styles.loginButton} onClick={openLoginModal}>
          Login
        </button>
      </main>
    );
  }

  return <>{children}</>;
}
