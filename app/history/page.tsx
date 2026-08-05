'use client';

import { useState } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { HistoryFilterBar } from '@/components/history/HistoryFilterBar';
import { HistoryTable } from '@/components/history/HistoryTable';
import { HistoryDetail } from '@/components/history/HistoryDetail';
import { exportShiftToExcel } from '@/utils/excelExport';
import { todayString } from '@/utils/date';
import styles from './page.module.css';

export default function HistoryPage() {
  const [date, setDate] = useState(todayString());
  const [shift, setShift] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: records = [], isLoading, isError } = useHistory({ date: date || undefined, shift: shift || undefined });

  return (
    <main className={styles.page}>
      <HistoryFilterBar date={date} shift={shift} onDateChange={setDate} onShiftChange={setShift} />

      {isLoading && <p>Memuat histori…</p>}
      {isError && <p className={styles.error}>Gagal memuat histori.</p>}

      {!isLoading && !isError && (
        <HistoryTable
          records={records}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId((current) => (current === id ? null : id))}
          renderDetail={(record) => <HistoryDetail record={record} />}
          onExport={exportShiftToExcel}
        />
      )}
    </main>
  );
}
