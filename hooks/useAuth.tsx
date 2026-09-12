'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// NOTE: this is a privacy gate, not real security. The credentials live in
// this client-side bundle, so anyone who opens devtools/view-source can read
// them and flip `authed` themselves — it stops a casual bystander at a shared
// kiosk display from wandering into Input/History, nothing more. Do not rely
// on this to protect anything that needs actual access control.
const VALID_USERNAME = 'finishing';
const VALID_PASSWORD = 'toyota@1';

const AUTH_STORAGE_KEY = 'qc-auth';

interface AuthContextValue {
  authed: boolean;
  // False only for the first client render before the stored session has
  // been read (mirrors useTheme's mount guard) — lets AuthGate hold off
  // judging a protected route until it actually knows the real state.
  mounted: boolean;
  loginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

// Sensible default for components rendered without an <AuthProvider> (e.g.
// in isolation in tests) — logged out, but already "mounted" since there is
// no real session to wait for.
const AuthContext = createContext<AuthContextValue>({
  authed: false,
  mounted: true,
  loginModalOpen: false,
  openLoginModal: () => {},
  closeLoginModal: () => {},
  login: () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // sessionStorage (not localStorage): clears when the browser/tab closes,
  // so a shared kiosk display doesn't stay logged in indefinitely — a
  // refresh mid-shift keeps the session, closing the browser drops it.
  useEffect(() => {
    try {
      setAuthed(sessionStorage.getItem(AUTH_STORAGE_KEY) === VALID_USERNAME);
    } catch {
      /* private mode / storage disabled — stays logged out */
    }
    setMounted(true);
  }, []);

  const login = useCallback((username: string, password: string): boolean => {
    const ok = username.trim() === VALID_USERNAME && password === VALID_PASSWORD;
    if (ok) {
      setAuthed(true);
      try {
        sessionStorage.setItem(AUTH_STORAGE_KEY, VALID_USERNAME);
      } catch {
        /* still logged in for this render even if it can't persist */
      }
    }
    return ok;
  }, []);

  const logout = useCallback(() => {
    setAuthed(false);
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      /* nothing stored to remove */
    }
  }, []);

  const openLoginModal = useCallback(() => setLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  return (
    <AuthContext.Provider value={{ authed, mounted, loginModalOpen, openLoginModal, closeLoginModal, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
