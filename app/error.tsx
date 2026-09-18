'use client';

import { useEffect } from 'react';
import styles from './error.module.css';

// Next.js App Router error boundary — catches any otherwise-uncaught client
// exception from a page/component below this in the tree (a rare null-ref,
// a fetch that rejected mid-render, a Neon cold-start timeout, etc.) and
// shows a recoverable message instead of the framework's own generic
// "Application error: a client-side exception has occurred" white screen,
// which offered no way back into the app short of a manual URL reload.
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Logged, not swallowed — the only trace of what actually broke, since
    // this is the last line of defense before the framework's own fallback.
    console.error(error);
  }, [error]);

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Terjadi kesalahan tak terduga</div>
      <p className={styles.message}>
        Halaman ini mengalami masalah. Coba lagi, atau muat ulang halaman jika masalah berlanjut.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.retryButton} onClick={reset}>
          Coba Lagi
        </button>
        <button type="button" className={styles.reloadButton} onClick={() => window.location.reload()}>
          Muat Ulang
        </button>
      </div>
    </div>
  );
}
