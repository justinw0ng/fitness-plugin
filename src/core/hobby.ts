/** Pure hobby timer logic. No Obsidian imports. */

export type TimeLogEntry = {
  date: string;
  minutes: number;
  note: string;
  startIso?: string;
  endIso?: string;
};

export type TimerFrontmatter = {
  totalMin: number;
  timerStartedAt: string | null;
};

const TIME_LOG_HEADING = /^#{1,6}\s+Time log\s*$/i;
const HEADING = /^(#{1,6})\s+/;
const TIMER_METADATA =
  /<!--\s*atomic-timer\s+start="([^"]+)"\s+end="([^"]+)"\s*-->/;
const TIME_LOG_ENTRY =
  /^\s*[-*]\s+(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2})\s*(?:-|\u2013|\u2014)\s*(\d{2}:\d{2}))?\s*(?:\||\u00b7)?\s*(\d+)\s*min(?:\s*(?:\||\u2014|-)\s*(.*?))?\s*$/;

export function parseTimeLog(markdown: string): TimeLogEntry[] {
  const lines = String(markdown || "").split(/\r?\n/);
  const entries: TimeLogEntry[] = [];
  let timeLogLevel: number | null = null;

  for (const line of lines) {
    const heading = line.match(HEADING);
    if (heading && timeLogLevel !== null && heading[1].length <= timeLogLevel) {
      break;
    }
    if (TIME_LOG_HEADING.test(line.trim())) {
      timeLogLevel = line.match(HEADING)?.[1].length ?? 0;
      continue;
    }
    if (timeLogLevel === null) continue;

    const entry = parseTimeLogLine(line);
    if (entry) entries.push(entry);
  }

  return entries;
}

export function appendTimeLog(markdown: string, entry: TimeLogEntry): string {
  const normalizedEntry = normalizeEntry(entry);
  if (hasMatchingIsoEntry(parseTimeLog(markdown), normalizedEntry)) {
    return ensureTrailingNewline(markdown);
  }

  const entryLine = formatTimeLogEntry(normalizedEntry);
  const lines = String(markdown || "").split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => TIME_LOG_HEADING.test(line.trim()));

  if (headingIndex === -1) {
    const base = trimTrailingBlankLines(lines).join("\n");
    return `${base}${base ? "\n\n" : ""}## Time log\n\n${entryLine}\n`;
  }

  const headingLevel = lines[headingIndex].match(HEADING)?.[1].length ?? 0;
  let sectionEnd = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const heading = lines[index].match(HEADING);
    if (heading && heading[1].length <= headingLevel) {
      sectionEnd = index;
      break;
    }
  }

  let insertAt = sectionEnd;
  while (insertAt > headingIndex + 1 && lines[insertAt - 1].trim() === "") {
    insertAt -= 1;
  }

  const before = lines.slice(0, insertAt);
  const after = lines.slice(sectionEnd);
  if (before[before.length - 1]?.trim() === lines[headingIndex].trim()) {
    before.push("");
  }
  before.push(entryLine);
  if (after.length > 0 && after[0].trim() !== "") {
    before.push("");
  }

  return ensureTrailingNewline([...before, ...after].join("\n"));
}

export function stopTimer(input: {
  markdown: string;
  startedAtIso: string;
  stoppedAtIso: string;
  note?: string;
}): { markdown: string; minutes: number; totalMin: number } {
  const startedAtMs = Date.parse(input.startedAtIso);
  const stoppedAtMs = Date.parse(input.stoppedAtIso);
  if (!Number.isFinite(startedAtMs)) {
    throw new Error("Invalid timer start time");
  }
  if (!Number.isFinite(stoppedAtMs)) {
    throw new Error("Invalid timer stop time");
  }
  if (stoppedAtMs < startedAtMs) {
    throw new Error("Timer stop time cannot be before start time");
  }

  const minutes = Math.round((stoppedAtMs - startedAtMs) / 60000);
  const entry: TimeLogEntry = {
    date: dateFromIso(input.startedAtIso),
    minutes,
    note: input.note?.trim() ?? "",
    startIso: input.startedAtIso,
    endIso: input.stoppedAtIso,
  };

  const existingEntries = parseTimeLog(input.markdown);
  const alreadyLogged = hasMatchingIsoEntry(existingEntries, entry);
  const markdownWithLog = alreadyLogged
    ? input.markdown
    : appendTimeLog(input.markdown, entry);
  const frontmatter = readTimerFrontmatter(input.markdown);
  const previousLogTotal = sumMinutes(existingEntries);
  const totalMin = alreadyLogged
    ? Math.max(frontmatter.totalMin, previousLogTotal)
    : Math.max(frontmatter.totalMin, previousLogTotal) + minutes;
  const markdown = updateTimerFrontmatter(markdownWithLog, {
    totalMin,
    timerStartedAtIso: null,
  });

  return { markdown, minutes, totalMin };
}

export function minutesByDate(entries: TimeLogEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    totals.set(entry.date, (totals.get(entry.date) ?? 0) + entry.minutes);
  }
  return totals;
}

/** Totals for dates in a calendar year (`YYYY-…`). */
export function minutesByDateForYear(
  entries: TimeLogEntry[],
  year: number,
): Map<string, number> {
  const prefix = `${year}-`;
  return minutesByDate(entries.filter((entry) => entry.date.startsWith(prefix)));
}

export function sumMinutesForYear(entries: TimeLogEntry[], year: number): number {
  const prefix = `${year}-`;
  let total = 0;
  for (const entry of entries) {
    if (entry.date.startsWith(prefix)) total += entry.minutes;
  }
  return total;
}

export function readTimerFrontmatter(markdown: string): TimerFrontmatter {
  const parts = splitFrontmatter(markdown);
  if (!parts) return { totalMin: 0, timerStartedAt: null };

  let totalMin = 0;
  let timerStartedAt: string | null = null;
  for (let index = 1; index < parts.endIndex; index += 1) {
    const line = parts.lines[index];
    const totalMatch = line.match(/^total_min\s*:\s*(.*)$/);
    if (totalMatch) {
      const total = Number(unquoteYamlScalar(totalMatch[1]));
      totalMin = Number.isFinite(total) && total > 0 ? Math.trunc(total) : 0;
      continue;
    }
    const startedMatch = line.match(/^timer_started_at\s*:\s*(.*)$/);
    if (startedMatch) {
      timerStartedAt = emptyToNull(unquoteYamlScalar(startedMatch[1]));
    }
  }

  return { totalMin, timerStartedAt };
}

export function updateTimerFrontmatter(
  markdown: string,
  fields: { totalMin?: number; timerStartedAtIso?: string | null },
): string {
  const text = String(markdown || "");
  const parts = splitFrontmatter(text);
  if (!parts) {
    const frontmatter = [
      "---",
      ...(fields.totalMin === undefined
        ? []
        : [`total_min: ${normalizeMinutes(fields.totalMin)}`]),
      ...(fields.timerStartedAtIso === undefined
        ? []
        : [formatTimerStartedAt(fields.timerStartedAtIso)]),
      "---",
      "",
    ];
    return `${frontmatter.join("\n")}${text}`;
  }

  let lines = parts.lines.slice();
  if (fields.totalMin !== undefined) {
    lines = setFrontmatterField(
      lines,
      "total_min",
      `total_min: ${normalizeMinutes(fields.totalMin)}`,
    );
  }
  if (fields.timerStartedAtIso !== undefined) {
    lines = setFrontmatterField(
      lines,
      "timer_started_at",
      formatTimerStartedAt(fields.timerStartedAtIso),
    );
  }

  return ensureTrailingNewline(lines.join("\n"));
}

function parseTimeLogLine(line: string): TimeLogEntry | null {
  const metadata = line.match(TIMER_METADATA);
  const visibleLine = line.replace(TIMER_METADATA, "").trimEnd();
  const match = visibleLine.match(TIME_LOG_ENTRY);
  if (!match) return null;

  return {
    date: match[1],
    minutes: Number(match[4]),
    note: (match[5] ?? "").trim(),
    ...(metadata
      ? {
          startIso: unescapeHtmlAttribute(metadata[1]),
          endIso: unescapeHtmlAttribute(metadata[2]),
        }
      : {}),
  };
}

function normalizeEntry(entry: TimeLogEntry): TimeLogEntry {
  return {
    date: entry.date,
    minutes: normalizeMinutes(entry.minutes),
    note: sanitizeLogNote(entry.note),
    ...(entry.startIso ? { startIso: entry.startIso } : {}),
    ...(entry.endIso ? { endIso: entry.endIso } : {}),
  };
}

function formatTimeLogEntry(entry: TimeLogEntry): string {
  const timeRange =
    entry.startIso && entry.endIso
      ? ` ${timeFromIso(entry.startIso)}-${timeFromIso(entry.endIso)}`
      : "";
  const note = entry.note ? ` | ${entry.note}` : "";
  const metadata =
    entry.startIso && entry.endIso
      ? ` <!-- atomic-timer start="${escapeHtmlAttribute(
          entry.startIso,
        )}" end="${escapeHtmlAttribute(entry.endIso)}" -->`
      : "";
  return `- ${entry.date}${timeRange} | ${entry.minutes} min${note}${metadata}`;
}

function hasMatchingIsoEntry(
  entries: TimeLogEntry[],
  entry: TimeLogEntry,
): boolean {
  if (!entry.startIso || !entry.endIso) return false;
  return entries.some(
    (existing) =>
      existing.startIso === entry.startIso && existing.endIso === entry.endIso,
  );
}

function splitFrontmatter(
  markdown: string,
): { lines: string[]; endIndex: number } | null {
  const lines = String(markdown || "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      return { lines, endIndex: index };
    }
  }
  return null;
}

function setFrontmatterField(
  lines: string[],
  key: "total_min" | "timer_started_at",
  line: string,
): string[] {
  const next = lines.slice();
  const endIndex = splitFrontmatter(next.join("\n"))?.endIndex;
  if (endIndex === undefined) return next;

  for (let index = 1; index < endIndex; index += 1) {
    if (new RegExp(`^${key}\\s*:`).test(next[index])) {
      next[index] = line;
      return next;
    }
  }

  next.splice(endIndex, 0, line);
  return next;
}

function formatTimerStartedAt(value: string | null): string {
  if (!value) return "timer_started_at:";
  return `timer_started_at: "${escapeYamlDoubleQuoted(value)}"`;
}

function dateFromIso(iso: string): string {
  const directDate = iso.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (directDate) return directDate[1];
  return new Date(iso).toISOString().slice(0, 10);
}

function timeFromIso(iso: string): string {
  const directTime = iso.match(/T(\d{2}:\d{2})/);
  if (directTime) return directTime[1];
  return new Date(iso).toISOString().slice(11, 16);
}

function sumMinutes(entries: TimeLogEntry[]): number {
  return entries.reduce((total, entry) => total + entry.minutes, 0);
}

function normalizeMinutes(minutes: number): number {
  return Math.max(0, Math.round(minutes));
}

function sanitizeLogNote(note: unknown): string {
  return String(note || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trimTrailingBlankLines(lines: string[]): string[] {
  const next = lines.slice();
  while (next.length > 0 && next[next.length - 1].trim() === "") {
    next.pop();
  }
  return next;
}

function ensureTrailingNewline(markdown: string): string {
  return markdown.endsWith("\n") ? markdown : `${markdown}\n`;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "~" || trimmed.toLowerCase() === "null") {
    return null;
  }
  return trimmed;
}

function unquoteYamlScalar(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

function escapeYamlDoubleQuoted(value: string): string {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeHtmlAttribute(value: string): string {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function unescapeHtmlAttribute(value: string): string {
  return String(value).replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}
