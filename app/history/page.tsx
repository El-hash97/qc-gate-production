'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHistory } from '@/hooks/useHistory';
import { useProductionState } from '@/hooks/useProductionState';
import { useRestoreHistory } from '@/hooks/useRestoreHistory';
import { HistoryFilterBar } from '@/components/history/HistoryFilterBar';
import { HistoryTable } from '@/components/history/HistoryTable';
import { HistoryDetail } from '@/components/history/HistoryDetail';
import { Modal } from '@/components/ui/Modal';
import { exportShiftToExcel } from '@/utils/excelExport';
import { getGrandTotal } from '@/utils/rates';
import { todayString } from '@/utils/date';
import type { HistoryRecord } from '@/lib/types';
import modalStyles from '@/components/production/EntryModal.module.css';
import styles from './page.module.css';

export default function HistoryPage() {
  const router = useRouter();
  const [date, setDate] = useState(todayString());
  const [shift, setShift] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pendingEdit, setPendingEdit] = useState<HistoryRecord | null>(null);

  const { data: records = [], isLoading, isError } = useHistory({ date: date || undefined, shift: shift || undefined });
  const { state: current } = useProductionState();
  const restore = useRestoreHistory();

  const activeShiftHasData = current ? getGrandTotal(current) > 0 : false;

  function confirmEdit() {
    if (!pendingEdit) return;
    restore.mutate(pendingEdit.id, {
      onSuccess: () => {
        setPendingEdit(null);
        router.push('/input');
      },
    });
  }

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
          onEdit={setPendingEdit}
        />
      )}

      <Modal
        isOpen={pendingEdit !== null}
        onClose={() => setPendingEdit(null)}
        title="Edit shift dari history"
      >
        <p className={modalStyles.description}>
          Shift <strong>{pendingEdit?.date} — {pendingEdit?.shift}</strong> akan dikembalikan ke
          shift aktif supaya bisa diedit / ditambah lewat halaman Input, lalu dihapus dari history.
          Dashboard ikut menampilkannya.
          {activeShiftHasData && (
            <>
              <br />
              <br />
              ⚠️ Shift aktif sekarang <strong>ada isinya dan belum diarsipkan</strong> — datanya akan
              tertimpa dan hilang.
            </>
          )}
        </p>
        {restore.isError && (
          <p className={styles.error}>Gagal: {(restore.error as Error).message}</p>
        )}
        <div className={modalStyles.actions}>
          <button type="button" className={modalStyles.cancelButton} onClick={() => setPendingEdit(null)}>
            Batal
          </button>
          <button
            type="button"
            className={modalStyles.saveButtonNg}
            onClick={confirmEdit}
            disabled={restore.isPending}
          >
            {restore.isPending ? 'Memproses…' : 'Ya, edit'}
          </button>
        </div>
      </Modal>
    </main>
  );
}
