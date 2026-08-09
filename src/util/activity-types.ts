import type { ActivityType, Domain, NoteModel } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { BLUE, GREEN } from "../types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isSafeVaultFolder } from "./vault-path.ts";

const FALLBACK_EXERCISE_NAME = "Exercise";
const FALLBACK_HOBBY_NAME = "Hobby";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanFolderSegment(label: string): string {
  const cleaned = label
    .replace(/[\\/:*?"<>|#[\]\r\n\t]/g, " ")
    .replace(/\.+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || FALLBACK_EXERCISE_NAME;
}

export function activityIdFromLabel(label: string): string {
  const id = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id || "activity";
}

export function defaultExerciseFolder(label: string): string {
  const folder = `atomics/exercise/${cleanFolderSegment(label)}`;
  return isSafeVaultFolder(folder)
    ? folder
    : `atomics/exercise/${FALLBACK_EXERCISE_NAME}`;
}

export function defaultHobbyFolder(label: string): string {
  const cleaned = cleanFolderSegment(label);
  const folder = `atomics/hobbies/${cleaned === FALLBACK_EXERCISE_NAME ? FALLBACK_HOBBY_NAME : cleaned}`;
  return isSafeVaultFolder(folder)
    ? folder
    : `atomics/hobbies/${FALLBACK_HOBBY_NAME}`;
}

export function createExerciseActivityType(label: string): ActivityType {
  const cleanedLabel = cleanFolderSegment(label);
  return {
    id: activityIdFromLabel(cleanedLabel),
    domain: "exercise",
    label: cleanedLabel,
    folder: defaultExerciseFolder(cleanedLabel),
    colors: GREEN,
    noteModel: "dailySession",
    supportsCues: true,
    supportsTimer: false,
    supportsSetTable: false,
  };
}

export function createHobbyActivityType(label: string): ActivityType {
  const cleanedLabel = cleanFolderSegment(label);
  const labelForHobby =
    cleanedLabel === FALLBACK_EXERCISE_NAME ? FALLBACK_HOBBY_NAME : cleanedLabel;
  return {
    id: activityIdFromLabel(labelForHobby),
    domain: "hobby",
    label: labelForHobby,
    folder: defaultHobbyFolder(labelForHobby),
    colors: BLUE,
    noteModel: "item",
    supportsCues: false,
    supportsTimer: true,
    supportsSetTable: false,
  };
}

function colorTuple(
  value: unknown,
  fallback: [string, string, string, string],
): [string, string, string, string] {
  if (!Array.isArray(value) || value.length !== 4) return fallback;
  const [first, second, third, fourth] = value;
  if (
    typeof first === "string" &&
    first.trim() !== "" &&
    typeof second === "string" &&
    second.trim() !== "" &&
    typeof third === "string" &&
    third.trim() !== "" &&
    typeof fourth === "string" &&
    fourth.trim() !== ""
  ) {
    return [first, second, third, fourth];
  }
  return fallback;
}

function domainFrom(value: unknown): Domain | null {
  return value === "exercise" || value === "hobby" ? value : null;
}

function noteModelFrom(value: unknown): NoteModel | null {
  return value === "dailySession" || value === "item" ? value : null;
}

export function normalizeActivityType(
  value: unknown,
  fallbackColors: [string, string, string, string],
): ActivityType | null {
  if (!isRecord(value)) return null;
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const folder = typeof value.folder === "string" ? value.folder.trim() : "";
  const domain = domainFrom(value.domain);
  const noteModel = noteModelFrom(value.noteModel);
  if (!label || !folder || !domain || !noteModel || !isSafeVaultFolder(folder)) {
    return null;
  }

  const idRaw = typeof value.id === "string" ? value.id.trim() : "";
  const id = activityIdFromLabel(idRaw || label);
  return {
    id,
    domain,
    label,
    folder,
    colors: colorTuple(value.colors, fallbackColors),
    noteModel,
    supportsCues: domain === "exercise" && value.supportsCues === true,
    supportsTimer: domain === "hobby" && value.supportsTimer === true,
    supportsSetTable:
      domain === "exercise" &&
      noteModel === "dailySession" &&
      value.supportsSetTable === true,
  };
}

export function activityTypeFromSeries(
  value: unknown,
  fallbackColors: [string, string, string, string],
): ActivityType | null {
  if (!isRecord(value)) return null;
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const folder = typeof value.folder === "string" ? value.folder.trim() : "";
  if (!label || !folder || !isSafeVaultFolder(folder)) return null;

  const idRaw = typeof value.id === "string" ? value.id.trim() : "";
  const kind = value.kind === "gym" || value.kind === "golf" ? value.kind : "generic";
  const id = activityIdFromLabel(idRaw || kind || label);
  return {
    id,
    domain: "exercise",
    label,
    folder,
    colors: colorTuple(value.colors, fallbackColors),
    noteModel: "dailySession",
    supportsCues: true,
    supportsTimer: false,
    supportsSetTable: kind === "gym",
  };
}

export function exerciseActivities(activityTypes: ActivityType[]): ActivityType[] {
  return activityTypes.filter(
    (activity) =>
      activity.domain === "exercise" && activity.noteModel === "dailySession",
  );
}

export function hobbyActivities(activityTypes: ActivityType[]): ActivityType[] {
  return activityTypes.filter(
    (activity) =>
      activity.domain === "hobby" &&
      activity.noteModel === "item" &&
      activity.supportsTimer,
  );
}

export function resolveCueActivityType(
  activityTypes: ActivityType[],
  activityId: string,
): ActivityType | undefined {
  const normalizedId = activityId.trim().toLowerCase();
  return exerciseActivities(activityTypes).find(
    (activity) =>
      activity.supportsCues && activity.id.toLowerCase() === normalizedId,
  );
}

export function cuePathForActivity(activity: ActivityType): string {
  return `${activity.folder.replace(/\/$/, "")}/Cues.md`;
}
