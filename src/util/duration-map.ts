// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { minutesByDateForYear, type TimeLogEntry } from "../core/hobby.ts";
import type { DayActivity, SessionMeta } from "../types";

export function durationMapFromSessions(
  sessions: SessionMeta[],
): Map<string, DayActivity> {
  const map = new Map<string, DayActivity>();
  for (const session of sessions) {
    if (!session.date) continue;
    const entry = map.get(session.date) || { minutes: 0, path: null };
    entry.minutes += session.duration_min;
    if (!entry.path) entry.path = session.path;
    map.set(session.date, entry);
  }
  return map;
}

export function addHobbyItemMinutes(
  map: Map<string, DayActivity>,
  path: string,
  totals: Map<string, number>,
): void {
  for (const [date, minutes] of totals) {
    const entry = map.get(date) || { minutes: 0, path };
    entry.minutes += minutes;
    if (!entry.path) entry.path = path;
    map.set(date, entry);
  }
}

export function durationMapFromHobbyLogs(
  items: Array<{ path: string; entries: TimeLogEntry[] }>,
  year: number,
): Map<string, DayActivity> {
  const map = new Map<string, DayActivity>();
  for (const item of items) {
    addHobbyItemMinutes(
      map,
      item.path,
      minutesByDateForYear(item.entries, year),
    );
  }
  return map;
}
