import type { FitnessSettings, SeriesConfig } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { DEFAULT_SETTINGS } from "../types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isSafeVaultFolder } from "./vault-path.ts";

type RawSettings = Partial<FitnessSettings> & {
  cuesPath?: string;
  deprecatedFitnessCuesEnabled?: boolean;
};

function sanitizeSeries(
  series: SeriesConfig[] | undefined,
  fallback: SeriesConfig[],
): SeriesConfig[] {
  if (!Array.isArray(series) || series.length === 0) return fallback;
  const safe = series.filter(
    (s) =>
      s != null &&
      typeof s.folder === "string" &&
      isSafeVaultFolder(s.folder),
  );
  return safe.length > 0 ? safe : fallback;
}

export function mergeSettings(
  raw: RawSettings | null | undefined,
): FitnessSettings {
  const base = { ...DEFAULT_SETTINGS, series: DEFAULT_SETTINGS.series };
  if (!raw) return { ...base, series: [...base.series] };
  const golfCuesPath =
    (raw.golfCuesPath && raw.golfCuesPath.trim()) ||
    (raw.cuesPath && raw.cuesPath.trim()) ||
    base.golfCuesPath;
  return {
    timezone: raw.timezone || base.timezone,
    dashboardPath: raw.dashboardPath || base.dashboardPath,
    golfCuesPath,
    gymCuesPath:
      (raw.gymCuesPath && raw.gymCuesPath.trim()) || base.gymCuesPath,
    deprecatedFitnessBlocksEnabled:
      raw.deprecatedFitnessBlocksEnabled === false ||
      raw.deprecatedFitnessCuesEnabled === false
        ? false
        : true,
    series: [...sanitizeSeries(raw.series, base.series)],
  };
}
