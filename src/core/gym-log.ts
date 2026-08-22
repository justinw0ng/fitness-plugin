/** Pure gym set-table and exercise-catalog helpers — no Obsidian imports. */

export type GymSetRow = {
  exercise: string;
  muscle: string;
  weight: string | number;
  reps: string | number;
  notes: string;
};

export type GymExercisePair = {
  exercise: string;
  muscle: string;
};

export type GymLogSetup = "pending" | "complete" | "skipped";

export const NEW_EXERCISE_SENTINEL = "__atomic_new_exercise__";
export const CUSTOM_MUSCLE_SENTINEL = "__atomic_custom_muscle__";
export const GYM_LOG_BLOCK_KIND = "atomic-gym-log";

const GYM_LOG_FENCE_RE = /```atomic-gym-log\b/;
const SET_TABLE_ALIGN_RE = /^:?-{1,}:?$/;
const DAILY_SESSION_FILE_RE = /\d{4}-\d{2}-\d{2}\.md$/i;

export type SetTableHeaders = {
  exercise: string;
  muscle: string;
  weight: string;
  reps: string;
  notes: string;
};

export const DEFAULT_SET_TABLE_HEADERS: SetTableHeaders = {
  exercise: "Exercise",
  muscle: "Muscle",
  weight: "Weight",
  reps: "Reps",
  notes: "Notes",
};

export function isGymLogSetup(value: unknown): value is GymLogSetup {
  return value === "pending" || value === "complete" || value === "skipped";
}

export function gymExercisePairKey(pair: GymExercisePair): string {
  return `${normalizePairPart(pair.exercise)}\0${normalizePairPart(pair.muscle)}`;
}

export function gymExercisePairLabel(pair: GymExercisePair): string {
  return `${pair.exercise} · ${pair.muscle}`;
}

export function parseGymExercisePairValue(value: string): GymExercisePair | null {
  if (!value || value === NEW_EXERCISE_SENTINEL) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length < 2) return null;
    const exercise = String(parsed[0] ?? "").trim();
    const muscle = String(parsed[1] ?? "").trim();
    if (!exercise || !muscle) return null;
    return { exercise, muscle };
  } catch {
    return null;
  }
}

export function gymExercisePairValue(pair: GymExercisePair): string {
  return JSON.stringify([pair.exercise, pair.muscle]);
}

export function normalizeGymExercisePair(
  value: unknown,
): GymExercisePair | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const exercise = String(record.exercise ?? "").trim();
  const muscle = String(record.muscle ?? "").trim();
  if (!exercise || !muscle) return null;
  return { exercise, muscle };
}

export function normalizeGymExercises(value: unknown): GymExercisePair[] {
  if (!Array.isArray(value)) return [];
  return mergeGymExercises([], value);
}

export function mergeGymExercises(
  existing: readonly GymExercisePair[],
  incoming: readonly unknown[],
): GymExercisePair[] {
  const byKey = new Map<string, GymExercisePair>();
  for (const value of [...existing, ...incoming]) {
    const pair = normalizeGymExercisePair(value);
    if (!pair) continue;
    const key = gymExercisePairKey(pair);
    if (!byKey.has(key)) byKey.set(key, pair);
  }
  return [...byKey.values()].sort((a, b) => {
    const exercise = a.exercise.localeCompare(b.exercise);
    if (exercise !== 0) return exercise;
    return a.muscle.localeCompare(b.muscle);
  });
}

export function extractExercisePairs(markdown: string): GymExercisePair[] {
  return mergeGymExercises([], pairsFromSetTable(markdown));
}

/** Last filled exercise+muscle in the note's set table, or null if none. */
export function lastExercisePairFromSetTable(
  markdown: string,
): GymExercisePair | null {
  const lines = String(markdown || "").split(/\r?\n/);
  const table = findSetTableRange(lines);
  if (!table) return null;
  for (let i = table.end; i >= table.firstData; i -= 1) {
    const cells = parsePipeCells(lines[i] ?? "");
    if (isAlignmentRow(cells) || isEmptySetTableRow(cells)) continue;
    const exercise = cells[0] || "";
    const muscle = cells[1] || "";
    if (!exercise || !muscle) continue;
    return { exercise, muscle };
  }
  return null;
}

/**
 * Keep the last exercise on this note: remembered pick, else last logged row,
 * else the first catalog option.
 */
export function resolveGymLogDropdownValue(
  remembered: string | undefined,
  lastLogged: string | null | undefined,
  catalogFirst: string | null | undefined,
  optionValues: readonly string[],
): string {
  const allowed = new Set(
    optionValues.filter((value) => value && value !== NEW_EXERCISE_SENTINEL),
  );
  if (remembered && allowed.has(remembered)) return remembered;
  if (lastLogged && allowed.has(lastLogged)) return lastLogged;
  if (catalogFirst && allowed.has(catalogFirst)) return catalogFirst;
  return "";
}

export function hasGymLogBlock(markdown: string): boolean {
  return GYM_LOG_FENCE_RE.test(String(markdown || ""));
}

export function isGymLogMigrationTarget(path: string): boolean {
  const base = String(path || "").split("/").pop() ?? "";
  if (!base.toLowerCase().endsWith(".md")) return false;
  if (/^cues\.md$/i.test(base)) return false;
  return true;
}

export function isDailySessionPath(path: string): boolean {
  return DAILY_SESSION_FILE_RE.test(String(path || ""));
}

export function sanitizeSetTableCell(value: unknown): string {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatSetTableRow(
  row: GymSetRow,
  columnCount = 5,
): string {
  const cells = [
    sanitizeSetTableCell(row.exercise),
    sanitizeSetTableCell(row.muscle),
    sanitizeSetTableCell(row.weight),
    sanitizeSetTableCell(row.reps),
    sanitizeSetTableCell(row.notes),
  ];
  while (cells.length < columnCount) cells.push("");
  return `| ${cells.slice(0, columnCount).join(" | ")} |`;
}

export function emptySetTable(headers: SetTableHeaders = DEFAULT_SET_TABLE_HEADERS): string {
  return [
    `| ${headers.exercise} | ${headers.muscle} | ${headers.weight} | ${headers.reps} | ${headers.notes} |`,
    "| --- | --- | --- | --- | --- |",
    "",
  ].join("\n");
}

export function appendSetRow(
  markdown: string,
  row: GymSetRow,
  headers: SetTableHeaders = DEFAULT_SET_TABLE_HEADERS,
): { markdown: string; filledEmpty: boolean } {
  const lines = String(markdown || "").split(/\r?\n/);
  const table = findSetTableRange(lines);
  const formatted = formatSetTableRow(row, table?.columnCount ?? 5);
  if (!table) {
    const suffix = `${ensureTrailingNewline(markdown).replace(/\n+$/, "\n\n")}${emptySetTable(headers)}${formatted}\n`;
    return { markdown: suffix, filledEmpty: false };
  }

  for (let i = table.firstData; i <= table.end; i += 1) {
    if (isEmptySetTableRow(parsePipeCells(lines[i] ?? ""))) {
      lines[i] = formatted;
      return { markdown: lines.join("\n"), filledEmpty: true };
    }
  }

  lines.splice(table.end + 1, 0, formatted);
  return { markdown: lines.join("\n"), filledEmpty: false };
}

export function insertGymLogFence(
  markdown: string,
  fence: string,
  headers: SetTableHeaders = DEFAULT_SET_TABLE_HEADERS,
): { markdown: string; changed: boolean } {
  const source = String(markdown || "");
  if (hasGymLogBlock(source)) return { markdown: source, changed: false };

  const lines = source.split(/\r?\n/);
  const table = findSetTableRange(lines);
  const block = String(fence || "").trim();
  if (!block) return { markdown: source, changed: false };

  if (table) {
    const prefix = lines.slice(0, table.header).join("\n").replace(/\s+$/, "");
    const rest = lines.slice(table.header).join("\n");
    return {
      markdown: withSingleTrailingNewline(joinMarkdownSeams([prefix, block, rest])),
      changed: true,
    };
  }

  const prefix = source.replace(/\n+$/, "");
  const tableMarkdown = emptySetTable(headers).replace(/\n+$/, "");
  return {
    markdown: withSingleTrailingNewline(
      joinMarkdownSeams([prefix, block, tableMarkdown]),
    ),
    changed: true,
  };
}

export type GymLogNotePlan = {
  path: string;
  nextMarkdown: string;
};

export type GymLogSetupPlan = {
  pairs: GymExercisePair[];
  notes: GymLogNotePlan[];
};

export function planGymLogSetup(
  files: ReadonlyArray<{ path: string; markdown: string }>,
  fence: string,
  headers: SetTableHeaders = DEFAULT_SET_TABLE_HEADERS,
): GymLogSetupPlan {
  const notes: GymLogNotePlan[] = [];
  let pairs: GymExercisePair[] = [];

  for (const file of files) {
    if (!isGymLogMigrationTarget(file.path)) continue;
    const markdown = String(file.markdown || "");
    pairs = mergeGymExercises(pairs, extractExercisePairs(markdown));
    const shouldRewrite =
      isDailySessionPath(file.path) || hasSetTableHeader(markdown);
    if (!shouldRewrite) continue;
    const next = insertGymLogFence(markdown, fence, headers);
    if (next.changed) {
      notes.push({ path: file.path, nextMarkdown: next.markdown });
    }
  }

  return { pairs, notes };
}

function normalizePairPart(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function ensureTrailingNewline(markdown: string): string {
  const source = String(markdown || "");
  return source.endsWith("\n") ? source : `${source}\n`;
}

function withSingleTrailingNewline(markdown: string): string {
  return `${String(markdown || "").replace(/\n+$/, "")}\n`;
}

/** Join inserted pieces with one blank line at each seam, leaving other gaps intact. */
function joinMarkdownSeams(parts: string[]): string {
  return parts.filter((part) => part.length > 0).join("\n\n");
}

function parsePipeCells(line: string): string[] {
  if (!line.trim().startsWith("|")) return [];
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function isSetTableHeader(cells: string[]): boolean {
  const joined = cells.join(" ").toLowerCase();
  return joined.includes("exercise") && joined.includes("muscle");
}

function isAlignmentRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => SET_TABLE_ALIGN_RE.test(cell));
}

function isEmptySetTableRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => cell === "");
}

function hasSetTableHeader(markdown: string): boolean {
  return findSetTableRange(String(markdown || "").split(/\r?\n/)) !== null;
}

function findSetTableRange(
  lines: string[],
): { header: number; firstData: number; end: number; columnCount: number } | null {
  let header = -1;
  let columnCount = 5;
  for (let i = 0; i < lines.length; i += 1) {
    const cells = parsePipeCells(lines[i] ?? "");
    if (!isSetTableHeader(cells)) continue;
    header = i;
    columnCount = cells.length;
    break;
  }
  if (header < 0) return null;

  let firstData = header + 1;
  while (firstData < lines.length && isAlignmentRow(parsePipeCells(lines[firstData] ?? ""))) {
    firstData += 1;
  }
  let end = firstData - 1;
  for (let i = firstData; i < lines.length; i += 1) {
    if (!String(lines[i] ?? "").trim().startsWith("|")) break;
    end = i;
  }
  return { header, firstData, end, columnCount };
}

function pairsFromSetTable(markdown: string): GymExercisePair[] {
  const lines = String(markdown || "").split(/\r?\n/);
  const table = findSetTableRange(lines);
  if (!table) return [];
  const pairs: GymExercisePair[] = [];
  for (let i = table.firstData; i <= table.end; i += 1) {
    const cells = parsePipeCells(lines[i] ?? "");
    if (isAlignmentRow(cells) || isEmptySetTableRow(cells)) continue;
    const exercise = cells[0] || "";
    const muscle = cells[1] || "";
    if (!exercise || !muscle) continue;
    pairs.push({ exercise, muscle });
  }
  return pairs;
}
