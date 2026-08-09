import type { FitnessSettings, SeriesConfig } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isSafeVaultFolder } from "./vault-path.ts";

export type MigrateMove = { from: string; to: string };

export type MigratePlan = {
  moves: MigrateMove[];
  skippedMoves: MigrateMove[];
  settingsPatch: Partial<FitnessSettings>;
};

type MoveDefinition = MigrateMove & {
  kind: "dashboard" | "gym" | "golf";
};

type OpenFence = {
  marker: "`" | "~";
  length: number;
};

const MOVE_DEFINITIONS: readonly MoveDefinition[] = [
  {
    kind: "dashboard",
    from: "Fitness/Dashboard.md",
    to: "atomics/Dashboard.md",
  },
  { kind: "gym", from: "Gym", to: "atomics/exercise/Gym" },
  { kind: "golf", from: "Golf", to: "atomics/exercise/Golf" },
];

const FENCE_REWRITES: Record<string, string> = {
  "fitness-heatmap": "atomic-heatmap",
  "fitness-today": "atomic-today",
  "fitness-dashboard": "atomic-dashboard",
  "fitness-actions": "atomic-actions",
  "fitness-golf-cues": "atomic-golf-cues",
  "fitness-cues": "atomic-golf-cues",
  "fitness-gym-cues": "atomic-gym-cues",
};

const OPEN_RE = /^( {0,3})(```+|~~~+)([^\n]*)$/;
const CLOSE_RE = /^( {0,3})(```+|~~~+)[ \t]*$/;

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "").trim();
}

function pathExists(existingPaths: Set<string>, path: string): boolean {
  const normalized = normalizePath(path);
  for (const existingPath of existingPaths) {
    const existing = normalizePath(existingPath);
    if (existing === normalized || existing.startsWith(`${normalized}/`)) {
      return true;
    }
  }
  return false;
}

function moveWasPlanned(moves: MigrateMove[], from: string): boolean {
  return moves.some((move) => move.from === from);
}

function patchSeriesFolders(
  settings: FitnessSettings,
  moves: MigrateMove[],
): SeriesConfig[] | undefined {
  let changed = false;
  const next = settings.series.map((series) => {
    if (moveWasPlanned(moves, "Gym") && series.folder === "Gym") {
      changed = true;
      return { ...series, folder: "atomics/exercise/Gym" };
    }
    if (moveWasPlanned(moves, "Golf") && series.folder === "Golf") {
      changed = true;
      return { ...series, folder: "atomics/exercise/Golf" };
    }
    return series;
  });
  return changed ? next : undefined;
}

export function planFitnessMigration(input: {
  existingPaths: Set<string>;
  settings: FitnessSettings;
}): MigratePlan {
  const moves: MigrateMove[] = [];
  const skippedMoves: MigrateMove[] = [];

  for (const definition of MOVE_DEFINITIONS) {
    if (!isSafeVaultFolder(definition.from) || !isSafeVaultFolder(definition.to)) {
      continue;
    }
    if (!pathExists(input.existingPaths, definition.from)) continue;

    const move = { from: definition.from, to: definition.to };
    if (pathExists(input.existingPaths, definition.to)) {
      skippedMoves.push(move);
    } else {
      moves.push(move);
    }
  }

  const settingsPatch: Partial<FitnessSettings> = {};
  if (
    moveWasPlanned(moves, "Fitness/Dashboard.md") &&
    input.settings.dashboardPath === "Fitness/Dashboard.md"
  ) {
    settingsPatch.dashboardPath = "atomics/Dashboard.md";
  }
  if (moveWasPlanned(moves, "Golf") && input.settings.golfCuesPath === "Golf/Cues.md") {
    settingsPatch.golfCuesPath = "atomics/exercise/Golf/Cues.md";
  }
  if (moveWasPlanned(moves, "Gym") && input.settings.gymCuesPath === "Gym/Cues.md") {
    settingsPatch.gymCuesPath = "atomics/exercise/Gym/Cues.md";
  }

  const series = patchSeriesFolders(input.settings, moves);
  if (series) settingsPatch.series = series;

  return { moves, skippedMoves, settingsPatch };
}

function parseInfoLanguage(info: string): string {
  return info.trim().split(/\s+/, 1)[0] || "";
}

/**
 * Rewrites top-level CommonMark code fences only. Nested fences in examples are
 * preserved so docs and quoted markdown samples do not change.
 */
export function rewriteFitnessFences(markdown: string): {
  markdown: string;
  replacements: number;
} {
  const lines = String(markdown).split(/\r?\n/);
  let open: OpenFence | null = null;
  let replacements = 0;

  const out = lines.map((line) => {
    if (open) {
      const close = line.match(CLOSE_RE);
      if (
        close &&
        close[2][0] === open.marker &&
        close[2].length >= open.length
      ) {
        open = null;
      }
      return line;
    }

    const match = line.match(OPEN_RE);
    if (!match) return line;

    const indent = match[1];
    const fence = match[2];
    const info = match[3] ?? "";
    const marker = fence[0] === "~" ? "~" : "`";
    const length = fence.length;
    const lang = parseInfoLanguage(info);
    const replacement = FENCE_REWRITES[lang];

    open = { marker, length };
    if (!replacement) return line;

    replacements += 1;
    const rest = info.replace(new RegExp(`^\\s*${lang}\\b`), replacement);
    return `${indent}${fence}${rest}`;
  });

  return {
    markdown: out.join(markdown.includes("\r\n") ? "\r\n" : "\n"),
    replacements,
  };
}
