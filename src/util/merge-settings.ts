import type { ActivityType, FitnessSettings } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { DEFAULT_LANGUAGE, isLanguage } from "../i18n/index.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { DEFAULT_SETTINGS } from "../types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { activityTypeFromSeries, normalizeActivityType } from "./activity-types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isSafeVaultFolder } from "./vault-path.ts";

function safeVaultPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return isSafeVaultFolder(trimmed) ? trimmed : fallback;
}

type RawSettings = Partial<Omit<FitnessSettings, "activityTypes">> & {
  activityTypes?: unknown;
  series?: unknown;
  cuesPath?: string;
  deprecatedFitnessCuesEnabled?: boolean;
};

function cloneActivities(activityTypes: ActivityType[]): ActivityType[] {
  return activityTypes.map((activity) => ({
    ...activity,
    enabled: activity.enabled !== false,
    baseColor: activity.baseColor,
    colors: [
      activity.colors[0],
      activity.colors[1],
      activity.colors[2],
      activity.colors[3],
    ],
  }));
}

function normalizeActivities(
  values: unknown,
  fallback: ActivityType[],
): ActivityType[] | null {
  if (!Array.isArray(values) || values.length === 0) return null;
  const normalized = values
    .map((value) => normalizeActivityType(value, fallback[0].colors))
    .filter((activity): activity is ActivityType => activity !== null);
  return normalized.length > 0 ? normalized : cloneActivities(fallback);
}

function appendNewBuiltInActivities(
  activityTypes: ActivityType[],
  builtIns: ActivityType[],
): ActivityType[] {
  const existingIds = new Set(activityTypes.map((activity) => activity.id));
  const addedBuiltIns = builtIns.filter(
    (activity) => activity.domain === "hobby" && !existingIds.has(activity.id),
  );
  return [...activityTypes, ...cloneActivities(addedBuiltIns)];
}

function legacySeriesActivities(
  values: unknown,
  fallback: ActivityType[],
): ActivityType[] | null {
  if (!Array.isArray(values) || values.length === 0) return null;
  const normalized = values
    .map((value) => activityTypeFromSeries(value, fallback[0].colors))
    .filter((activity): activity is ActivityType => activity !== null);
  return normalized.length > 0 ? normalized : cloneActivities(fallback);
}

export function mergeSettings(
  raw: RawSettings | null | undefined,
): FitnessSettings {
  const base = {
    ...DEFAULT_SETTINGS,
    activityTypes: cloneActivities(DEFAULT_SETTINGS.activityTypes),
  };
  if (!raw) return base;
  const golfCuesPath = safeVaultPath(
    (raw.golfCuesPath && raw.golfCuesPath.trim()) ||
      (raw.cuesPath && raw.cuesPath.trim()) ||
      "",
    base.golfCuesPath,
  );
  const activityTypes =
    appendNewBuiltInActivities(
      normalizeActivities(raw.activityTypes, base.activityTypes) ||
        legacySeriesActivities(raw.series, base.activityTypes) ||
        cloneActivities(base.activityTypes),
      DEFAULT_SETTINGS.activityTypes,
    );

  return {
    language: isLanguage(raw.language) ? raw.language : DEFAULT_LANGUAGE,
    timezone: raw.timezone || base.timezone,
    dashboardPath: safeVaultPath(raw.dashboardPath, base.dashboardPath),
    golfCuesPath,
    gymCuesPath: safeVaultPath(raw.gymCuesPath, base.gymCuesPath),
    deprecatedFitnessBlocksEnabled:
      raw.deprecatedFitnessBlocksEnabled === false ||
      raw.deprecatedFitnessCuesEnabled === false
        ? false
        : true,
    activityTypes,
  };
}
