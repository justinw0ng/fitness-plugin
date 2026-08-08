/** Timezone-aware calendar helpers without luxon. */

export function ymdInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function nowYear(timeZone: string): number {
  return Number(ymdInZone(new Date(), timeZone).slice(0, 4));
}

export function nowMonth(timeZone: string): number {
  return Number(ymdInZone(new Date(), timeZone).slice(5, 7));
}

export function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** Sunday = 0 … Saturday = 6 (UTC calendar date). */
export function weekdaySun0(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

export function addDays(
  y: number,
  m: number,
  d: number,
  delta: number,
): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(y, m - 1, d + delta, 12));
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  };
}

export function formatYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function monthShortZh(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    timeZone: "UTC",
  }).format(dt);
}

export function fullDateZh(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

export function monthLongEn(y: number, m: number): string {
  const dt = new Date(Date.UTC(y, m - 1, 1, 12));
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

export function monthLongZh(y: number, m: number): string {
  const dt = new Date(Date.UTC(y, m - 1, 1, 12));
  return new Intl.DateTimeFormat("zh-HK", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(dt);
}

export function extractYmdFromPath(path: string): string | null {
  const m = String(path || "").match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export function extractYearFromFrontmatterOrPath(
  yearFm: unknown,
  path: string,
  fallbackYear: number,
): number {
  const n = Number(yearFm);
  if (Number.isFinite(n) && n >= 1970 && n <= 2100) return n;
  const ymd = extractYmdFromPath(path);
  if (ymd) return Number(ymd.slice(0, 4));
  return fallbackYear;
}
