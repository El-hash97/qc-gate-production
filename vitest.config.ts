import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    // tests/e2e is Playwright-only (conflicting test()/expect() globals) —
    // exclude it here so Vitest doesn't try to collect it too.
    // .claude/worktrees/** excludes nested git worktrees living physically
    // inside this repo tree (each has its own full copy of tests/ and its
    // own node_modules) — without this, running from the repo root also
    // collects and runs the worktree's duplicate tests against mismatched
    // module instances, causing spurious failures.
    exclude: ['**/node_modules/**', 'tests/e2e/**', '.claude/worktrees/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
