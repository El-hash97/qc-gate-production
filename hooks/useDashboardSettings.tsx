'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// Which bento panels a viewer can hide — persisted per-browser (not per
// login) so the choice affects the Dashboard for everyone on that device,
// logged in or not. Only the toggle UI itself is login-gated (see TopNav).
export const PANELS = [
  { id: 'distribution', label: 'Production Distribution' },
  { id: 'hourlyChart', label: 'Hourly Production' },
  { id: 'lineStop', label: 'Line Stop' },
  { id: 'hourlyTable', label: 'Hourly (Tabel)' },
  { id: 'oeeChart', label: 'OEE per Jam' },
  { id: 'paretoNg', label: 'Pareto Defect (NG)' },
  { id: 'paretoRepair', label: 'Pareto Repair' },
  { id: 'defectDetails', label: 'Defect Details' },
  { id: 'repairDetails', label: 'Repair Details' },
  { id: 'heatmap', label: 'Flask/Cavity × Defect' },
  { id: 'lotDefect', label: 'Lot × Defect' },
  { id: 'entryLog', label: 'Lot/Flask Log' },
] as const;
export type PanelId = (typeof PANELS)[number]['id'];

const STORAGE_KEY = 'qc-dashboard-hidden-panels';

interface DashboardSettingsValue {
  hidden: Set<PanelId>;
  toggle: (id: PanelId) => void;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const DashboardSettingsContext = createContext<DashboardSettingsValue>({
  hidden: new Set(),
  toggle: () => {},
  settingsOpen: false,
  openSettings: () => {},
  closeSettings: () => {},
});

export function DashboardSettingsProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<Set<PanelId>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHidden(new Set(JSON.parse(raw)));
    } catch {
      /* private mode / bad stored value — everything stays visible */
    }
  }, []);

  function toggle(id: PanelId) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <DashboardSettingsContext.Provider value={{
      hidden, toggle, settingsOpen,
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
    }}>
      {children}
    </DashboardSettingsContext.Provider>
  );
}

export function useDashboardSettings() {
  return useContext(DashboardSettingsContext);
}
