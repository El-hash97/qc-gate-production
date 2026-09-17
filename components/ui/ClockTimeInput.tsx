'use client';

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Modal } from './Modal';
import { useDraftValue } from '@/hooks/useDraftValue';
import { angleFromPoint, minuteFromAngle, angleForMinute, angleForHour } from '@/utils/clockAngle';
import styles from './ClockTimeInput.module.css';

interface ClockTimeInputProps {
  // "HH:MM", 24h. Empty string (no selection yet) is allowed — the trigger
  // shows a placeholder and the dial opens on 00:00.
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}

type Step = 'hour' | 'minute';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_MARKS = Array.from({ length: 12 }, (_, i) => i * 5);

// Hour ring layout, Android 24h style: inner ring 1-12, outer ring 13-23 + 00
// (00 shares the "12" position at the top — same spot a real clock's 12 sits).
const INNER_RING_RADIUS = 0.32;
const OUTER_RING_RADIUS = 0.44;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parseTime(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':').map((part) => parseInt(part, 10));
  return { hour: Number.isFinite(h) ? h : 0, minute: Number.isFinite(m) ? m : 0 };
}

function formatTime(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// Turns whatever was typed into a valid 24h "HH:MM" — the manual-entry safety
// net for when the circular picker misbehaves. Non-digits are dropped; the
// trailing up to 2 digits become minutes, anything before that becomes hours,
// then both are clamped into range: "730" -> "07:30", "1430" -> "14:30",
// "7" -> "07:00", "2599" -> "23:59". Falls back to the last committed value
// when nothing recognizable was typed (e.g. cleared, or letters only).
function correctTimeInput(raw: string, fallback: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return fallback;
  const hourDigits = digits.length <= 2 ? digits : digits.slice(0, -2);
  const minuteDigits = digits.length <= 2 ? '0' : digits.slice(-2);
  const hour = clamp(parseInt(hourDigits, 10), 0, 23);
  const minute = clamp(parseInt(minuteDigits, 10), 0, 59);
  return formatTime(hour, minute);
}

// Small clock glyph for the icon button that opens the circular dial —
// inherits colour from the button via currentColor, same as other icon
// buttons in this app (e.g. TopNav's gear/person icons).
function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Position of a dial-face child, as a percentage offset from the center, for
// a given clock-degree angle and ring radius (fraction of the face's size).
function ringPosition(angleDeg: number, radiusFraction: number): { left: string; top: string } {
  const rad = (angleDeg * Math.PI) / 180;
  const left = 50 + radiusFraction * 100 * Math.sin(rad);
  const top = 50 - radiusFraction * 100 * Math.cos(rad);
  return { left: `${left}%`, top: `${top}%` };
}

export function ClockTimeInput({ value, onChange, ariaLabel }: ClockTimeInputProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('hour');
  const [draft, setDraft] = useState(() => parseTime(value));
  const dialRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // The manual field: free typing, corrected into a valid "HH:MM" on
  // blur/Enter — same draft-then-commit pattern as every other text field in
  // this app, so it's immune to whatever the circular dial does.
  const manual = useDraftValue(value, onChange, {
    parse: (raw: string) => correctTimeInput(raw, value),
    format: (v: string) => v,
  });

  function openPicker() {
    setDraft(parseTime(value));
    setStep('hour');
    setOpen(true);
  }

  function cancel() {
    setOpen(false);
  }

  function confirm() {
    onChange(formatTime(draft.hour, draft.minute));
    setOpen(false);
  }

  function pickHour(hour: number) {
    setDraft((d) => ({ ...d, hour }));
    setStep('minute');
  }

  function pickMinute(minute: number) {
    setDraft((d) => ({ ...d, minute }));
  }

  function minuteFromPointer(event: { clientX: number; clientY: number }): number {
    const rect = dialRef.current!.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = angleFromPoint(centerX, centerY, event.clientX, event.clientY);
    return minuteFromAngle(angle);
  }

  function handleDialPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    pickMinute(minuteFromPointer(event));
    // Keeps the drag tracking even if the pointer strays outside the dial
    // mid-gesture (easy to do near the edge of a small circle on a touch
    // screen). Not implemented in every test environment, hence the guard.
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleDialPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    pickMinute(minuteFromPointer(event));
  }

  function handleDialPointerUp() {
    draggingRef.current = false;
  }

  return (
    <span className={styles.wrapper}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="--:--"
        aria-label={ariaLabel}
        className={styles.manualInput}
        value={manual.value}
        onChange={manual.onChange}
        onBlur={manual.onBlur}
        onKeyDown={manual.onKeyDown}
      />
      <button
        type="button"
        className={styles.iconButton}
        aria-label={`${ariaLabel} (jam melingkar)`}
        onClick={openPicker}
      >
        <ClockIcon />
      </button>

      <Modal
        isOpen={open}
        onClose={cancel}
        title={
          <span className={styles.readout}>
            <button
              type="button"
              className={step === 'hour' ? styles.readoutPartActive : styles.readoutPart}
              onClick={() => setStep('hour')}
            >
              {pad2(draft.hour)}
            </button>
            <span className={styles.readoutColon}>:</span>
            <button
              type="button"
              className={step === 'minute' ? styles.readoutPartActive : styles.readoutPart}
              onClick={() => setStep('minute')}
            >
              {pad2(draft.minute)}
            </button>
          </span>
        }
      >
        {step === 'hour' ? (
          <div className={styles.dial}>
            {HOURS.map((hour) => {
              const isOuter = hour === 0 || hour >= 13;
              const angle = angleForHour(hour);
              const pos = ringPosition(angle, isOuter ? OUTER_RING_RADIUS : INNER_RING_RADIUS);
              return (
                <button
                  key={hour}
                  type="button"
                  className={hour === draft.hour ? styles.dialButtonActive : styles.dialButton}
                  style={pos}
                  aria-label={`Jam ${hour}`}
                  onClick={() => pickHour(hour)}
                >
                  {pad2(hour)}
                </button>
              );
            })}
          </div>
        ) : (
          <div
            ref={dialRef}
            className={styles.dial}
            data-testid="minute-dial-face"
            onPointerDown={handleDialPointerDown}
            onPointerMove={handleDialPointerMove}
            onPointerUp={handleDialPointerUp}
          >
            {MINUTE_MARKS.map((minute) => {
              const pos = ringPosition(angleForMinute(minute), OUTER_RING_RADIUS);
              return (
                <button
                  key={minute}
                  type="button"
                  className={minute === draft.minute ? styles.dialButtonActive : styles.dialButton}
                  style={pos}
                  aria-label={`Menit ${minute}`}
                  onClick={() => pickMinute(minute)}
                >
                  {pad2(minute)}
                </button>
              );
            })}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={cancel}>Batal</button>
          <button type="button" className={styles.okButton} onClick={confirm}>OK</button>
        </div>
      </Modal>
    </span>
  );
}
