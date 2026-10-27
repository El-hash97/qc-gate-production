'use client';

import { useMemo } from 'react';
import { ParetoChart } from '@/components/production/ParetoChart';
import type { DefectLineMapping, DefectProduct, EntryLog } from '@/lib/types';
import { MIN_RUN, repairSuspects } from '@/utils/repairSuspect';
import styles from './RepairSuspectPanel.module.css';

// Repairs that keep coming back from one die + lot in a row point at a mould
// or core problem upstream: the totals, a Pareto per suspect line, and the runs.
export function RepairSuspectPanel({ logs, mappings, product }: {
  logs: EntryLog[]; mappings: DefectLineMapping[]; product?: DefectProduct;
}) {
  const s = useMemo(() => repairSuspects(logs, mappings, product), [logs, mappings, product]);

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Pareto Suspect Repair Berulang</div>
          <div className={styles.sub}>Repair dari No. Die dan Lot yang sama berturut-turut, termasuk jenis repair berbeda.</div>
        </div>
        <div className={styles.kpis}>
          <div className={styles.kpi}><b>{s.pcs}</b><span>pcs repair suspect</span></div>
          <div className={styles.kpi}><b>{s.runs}</b><span>rangkaian berulang</span></div>
          <div className={styles.kpi}><b>{s.lines}</b><span>line terindikasi</span></div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.chart}>
          <ParetoChart data={s.byLine} />
        </div>
        <div className={styles.tableWrap}>
          {s.rows.length === 0 ? (
            <div className={styles.empty}>Belum ada repair berulang di shift ini</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Line suspect</th><th>Produk</th><th>Repair</th><th>Die</th><th>Lot</th>
                  <th>Input</th><th>Rangkaian</th><th>Pcs</th><th>Urutan log</th>
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r) => (
                  <tr key={`${r.from}-${r.type}`}>
                    <td className={styles.line}>{r.lines.join(', ')}</td>
                    <td>{r.product}</td>
                    <td>{r.type}</td>
                    <td className={styles.num}>{r.die}</td>
                    <td className={styles.num}>{r.lot}</td>
                    <td className={styles.num}>{r.inputs}</td>
                    <td className={styles.num}>{r.runInputs} input</td>
                    <td className={styles.num}><b>{r.qty}</b></td>
                    <td className={styles.num}>{r.from === r.to ? r.from : `${r.from}–${r.to}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <details className={styles.rules}>
        <summary>Aturan deteksi</summary>
        Suspect bila ≥ {MIN_RUN} input repair berurutan punya No. Die, Lot, dan produk yang sama (jenis repair boleh beda).
        Hanya repair yang mencatat No. Die yang dihitung (Mejashi Bore, Camshaft); input lain di antaranya tidak memutus rangkaian.
        Line suspect diambil dari master data defect → line; repair yang belum dipetakan masuk &quot;Belum dipetakan&quot;.
      </details>
    </div>
  );
}
