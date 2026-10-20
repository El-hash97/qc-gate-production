import { sql } from './db';
import type { LineStop } from './types';
import type { DatedStop } from '@/utils/stopHistory';

// The line stops of archived shifts from `since` ("YYYY-MM-DD") on, flattened
// and dated by their shift. Only stops that name a station: the rest belong to
// no machine, and history rows are far too big to ship whole for this.
export async function getArchivedLineStops(since: string): Promise<DatedStop[]> {
  const rows = (await sql`
    SELECT date, line_stops FROM history
    WHERE date >= ${since} AND line_stops <> '[]'::jsonb
    ORDER BY date, id
  `) as { date: string; line_stops: LineStop[] }[];
  return rows.flatMap((r) => (r.line_stops ?? []).filter((s) => s.station).map((s) => ({ ...s, date: r.date })));
}
