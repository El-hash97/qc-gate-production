// Chronological order for a set of "HH:00" hour keys, correct across midnight.
//
// A plain string/numeric sort puts "00:00" before "20:00" — fine for a day
// shift, wrong for a night shift (20:00 -> 23:00 -> 00:00 -> ...), which would
// show the post-midnight hours jumping back to the left of the chart/table
// instead of continuing off the right edge.
//
// There's no stored "shift start hour" to anchor on, so this finds it from the
// data itself: lay the present hours out on the 24-hour clock face, find the
// single largest empty gap between consecutive ones (the shift's off period),
// and start the sequence right after it. Works for any shift, at any start
// hour, whether it's finished or still only partway through.
export function sortHourKeys(keys: string[]): string[] {
  if (keys.length <= 1) return [...keys];

  const byHour = new Map<number, string>();
  for (const key of keys) byHour.set(parseInt(key.slice(0, 2), 10), key);
  const hours = [...byHour.keys()].sort((a, b) => a - b);

  let gapStart = 0;
  let maxGap = -1;
  for (let i = 0; i < hours.length; i++) {
    const next = hours[(i + 1) % hours.length];
    const gap = (next - hours[i] + 24) % 24 || 24; // 24 when every hour is present
    if (gap > maxGap) {
      maxGap = gap;
      gapStart = i;
    }
  }

  const pivot = (gapStart + 1) % hours.length;
  return [...hours.slice(pivot), ...hours.slice(0, pivot)].map((h) => byHour.get(h)!);
}
