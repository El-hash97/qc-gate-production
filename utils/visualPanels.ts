import type { EntryLog, HourlySnapshot, LineStop, ProductionState } from '@/lib/types';
import { getAchievementPercent, getNgTotal, getOkTotal, getRepairTotal } from '@/utils/rates';
import {
  DEFAULT_CYCLE_TIME_SEC, hourCapacity, lineStopsByHour, shiftOee, windowMinutes,
  workedMinutesInHour, type OeeBreakdown,
} from '@/utils/oee';
import { hoursForShiftTime } from '@/utils/shiftHours';
import { pareto } from '@/utils/charts';
import { toMinutes, hhmmNow } from '@/utils/lineStop';

// Everything the Visualisasi overlay panels show, for Block Cylinder (lines 1+2)
// only — the same scope as the 3D line. Mirrors the dashboard's B/C view.
export interface PanelData {
  ok: number;
  repair: number;
  ng: number;
  total: number;
  target: number;
  achievement: number;
  remaining: number;
  // minutes to reach the target at the shift's pace so far; null = no pace yet / done
  etaMin: number | null;
  oee: OeeBreakdown;
  stopMin: Record<LineStop['category'], number>;
  hourly: { hour: string; produced: number; plan: number }[];
  currentHour: string;
  topNg: { label: string; count: number }[];
  topRepair: { label: string; count: number }[];
  recent: EntryLog[];
  lastStop: LineStop | null;
}

const top = (data: Record<string, number>, n = 5) => {
  const p = pareto(data);
  return p.labels.slice(0, n).map((label, i) => ({ label, count: p.counts[i] }));
};

function stopMinutes(stop: LineStop, now: Date): number {
  const a = toMinutes(stop.start);
  // ongoing stop (no end yet): counts up to the minute of `now`
  const b = toMinutes(stop.end ?? hhmmNow(now));
  if (a === null || b === null) return 0;
  return b >= a ? b - a : b + 24 * 60 - a; // past midnight
}

export function panelData(state: ProductionState, now: Date): PanelData {
  const ok = getOkTotal(state, 'bc');
  const repair = getRepairTotal(state, 'bc');
  const ng = getNgTotal(state, 'bc');
  const total = ok + repair + ng;
  const target = state.targetBc ?? 0;

  // the shift's hours in order, empty ones filled with zeros
  const base = state.hourlyData ?? {};
  const hours = [...hoursForShiftTime(state.shiftTime)];
  for (const h of Object.keys(base).sort()) if (!hours.includes(h)) hours.push(h);
  const windows = state.hourlyWindow ?? {};
  const capacity = hourCapacity(state.cycleTimeBc || DEFAULT_CYCLE_TIME_SEC);
  const stopsByHour = lineStopsByHour(state.lineStops, now);
  const snap = (h: string): HourlySnapshot => base[h] ?? { ok: 0, repair: 0, ng: 0 };
  const hourly = hours.map((hour) => {
    const s = snap(hour);
    return { hour, produced: s.ok + s.repair + s.ng, plan: Math.round((capacity * windowMinutes(hour, windows)) / 60) };
  });

  // OEE and pace only over hours that saw production or a stop (as the dashboard)
  const touched: Record<string, HourlySnapshot> = {};
  let workedMin = 0;
  for (const h of hours) {
    const s = snap(h);
    if (s.ok + s.repair + s.ng > 0 || (stopsByHour[h]?.length ?? 0) > 0) {
      touched[h] = s;
      workedMin += workedMinutesInHour(h, windows, now);
    }
  }
  const remaining = Math.max(target - total, 0);
  const pace = workedMin > 0 ? total / workedMin : 0;
  const etaMin = remaining > 0 && pace > 0 ? Math.round(remaining / pace) : null;

  const stopMin = { AV: 0, PE: 0, RQ: 0 };
  for (const s of state.lineStops ?? []) stopMin[s.category] += stopMinutes(s, now);

  const bcLogs = (state.entryLogs ?? []).filter((log) => (log.group ?? 'bc') === 'bc');
  return {
    ok, repair, ng, total, target,
    achievement: getAchievementPercent(state, target, 'bc'),
    remaining, etaMin,
    oee: shiftOee(touched, state.lineStops, now, windows),
    stopMin,
    hourly,
    currentHour: `${String(now.getHours()).padStart(2, '0')}:00`,
    topNg: top(state.defectData ?? {}),
    topRepair: top(state.repairData ?? {}),
    recent: bcLogs.slice(-5).reverse(),
    lastStop: state.lineStops?.at(-1) ?? null,
  };
}
