'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'qc-theme';

// Runs before paint (injected in app/layout.tsx) so the correct palette is on
// <html> before the first render — no flash of the dark theme.
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}`;

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {},
});

function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 'dark' matches SSR; on mount we adopt the stored choice (the pre-paint
  // script has usually already put it on <html>, so there is no flash).
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readStoredTheme());
    setMounted(true);
  }, []);

  // Side effects live here (not in the updater) so a double-invoked setState in
  // StrictMode can't desync the DOM or storage.
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* private mode / storage disabled — the toggle still works for the session */
    }
  }, [theme, mounted]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Canvas colours for Chart.js — it can't read CSS variables, so resolve them
// from the active theme here and pass them into chart options.
export interface ChartTheme {
  tick: string; // axis tick labels
  label: string; // bold data labels / strong text
  grid: string; // gridlines
  gridBorder: string; // heatmap cell borders
}

const DARK: ChartTheme = {
  tick: '#9ca3b8',
  label: '#f0f1f5',
  grid: 'rgba(255,255,255,0.06)',
  gridBorder: 'rgba(255,255,255,0.08)',
};

const LIGHT: ChartTheme = {
  tick: '#59616f',
  label: '#1b1e28',
  grid: 'rgba(16,24,40,0.08)',
  gridBorder: 'rgba(16,24,40,0.12)',
};

export function useChartTheme(): ChartTheme {
  return useTheme().theme === 'light' ? LIGHT : DARK;
}
