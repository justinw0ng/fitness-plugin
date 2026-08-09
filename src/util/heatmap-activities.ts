import type { ActivityType } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { exerciseActivities, hobbyActivities } from "./activity-types.ts";

export type HeatmapActivityResolution = {
  activities: ActivityType[];
  invalidIds: string[];
};

function enabledActivities(activityTypes: ActivityType[]): ActivityType[] {
  return [...exerciseActivities(activityTypes), ...hobbyActivities(activityTypes)];
}

function parseActivityTokens(activityOption: string | undefined): string[] {
  if (activityOption == null) return ["all"];
  return activityOption
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

/**
 * Resolve which activities an atomic-heatmap block should render.
 * omit / `all` → all enabled; otherwise comma-separated ids in order.
 * If the list contains `all` (case-insensitive), treat as all enabled.
 */
export function resolveHeatmapActivities(
  activityTypes: ActivityType[],
  activityOption?: string,
): HeatmapActivityResolution {
  const enabled = enabledActivities(activityTypes);
  const tokens = parseActivityTokens(activityOption);
  if (tokens.length === 0 || tokens.some((token) => token.toLowerCase() === "all")) {
    return { activities: enabled, invalidIds: [] };
  }

  const byId = new Map(
    activityTypes.map((activity) => [activity.id.toLowerCase(), activity] as const),
  );
  const activities: ActivityType[] = [];
  const invalidIds: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const activity = byId.get(key);
    if (!activity || activity.enabled === false) {
      invalidIds.push(token);
      continue;
    }
    const isRenderable =
      (activity.domain === "exercise" && activity.noteModel === "dailySession") ||
      (activity.domain === "hobby" &&
        activity.noteModel === "item" &&
        activity.supportsTimer);
    if (!isRenderable) {
      invalidIds.push(token);
      continue;
    }
    activities.push(activity);
  }

  return { activities, invalidIds };
}
