// Geometry for the circular clock dial (ClockTimeInput): everything here is in
// "clock degrees" — 0 at 12 o'clock (top), increasing clockwise — the way a
// clock face reads, not the math convention (0 at 3 o'clock, counter-clockwise).

// Angle from a dial's center to an arbitrary point (e.g. a pointer position),
// in clock degrees [0, 360).
export function angleFromPoint(centerX: number, centerY: number, x: number, y: number): number {
  const dx = x - centerX;
  const dy = y - centerY;
  const deg = Math.atan2(dx, -dy) * (180 / Math.PI);
  return deg < 0 ? deg + 360 : deg;
}

// Nearest minute (0-59) for a clock-degree angle on the minute ring (6° per minute).
export function minuteFromAngle(angle: number): number {
  const m = Math.round(angle / 6) % 60;
  return m < 0 ? m + 60 : m;
}

// Where a given minute sits on the ring, in clock degrees — inverse of minuteFromAngle.
export function angleForMinute(minute: number): number {
  return (minute % 60) * 6;
}

// Where a given hour sits on the 12-position hour ring, in clock degrees
// (30° per hour; hour 0 and hour 12 both land at the top, like a real clock).
export function angleForHour(hour: number): number {
  return (hour % 12) * 30;
}
