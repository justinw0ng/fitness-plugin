import type { ActivityType } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { exerciseActivities, hobbyActivities } from "./activity-types.ts";

/** Enabled habits shown in `atomic-actions` (exercise sessions + hobby items). */
export function actionActivities(activityTypes: ActivityType[]): ActivityType[] {
  return [
    ...exerciseActivities(activityTypes),
    ...hobbyActivities(activityTypes),
  ];
}
