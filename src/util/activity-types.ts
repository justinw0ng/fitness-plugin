import type { ActivityType, Domain, NoteModel } from "../types";
import type { ColorTuple } from "./colors";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { GREEN, ORANGE } from "../types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { defaultBaseColorForDomain, isHexColor, shadesFromBaseColor } from "./colors.ts";
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

function colorTuple(
  value: unknown,
  fallback: ColorTuple,
): ColorTuple {
  if (!Array.isArray(value) || value.length !== 4) return fallback;
  const items: unknown[] = value;
  const [first, second, third, fourth] = items;
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

function resolveBaseColor(
  value: Record<string, unknown>,
  domain: Domain,
  fallbackColors: ColorTuple,
): string {
  if (typeof value.baseColor === "string" && isHexColor(value.baseColor)) {
    return value.baseColor.trim().toLowerCase().length === 4
      ? shadesFromBaseColor(value.baseColor)[2]
      : expandToSix(value.baseColor.trim());
  }
  const fromColors = colorTuple(value.colors, fallbackColors)[2];
  if (typeof fromColors === "string" && isHexColor(fromColors)) {
    return expandToSix(fromColors.trim());
  }
  return defaultBaseColorForDomain(domain);
}

function expandToSix(hex: string): string {
  const cleaned = hex.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(cleaned)) return cleaned;
  if (/^#[0-9a-f]{3}$/.test(cleaned)) {
    const [, r, g, b] = cleaned;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return defaultBaseColorForDomain("exercise");
}

function withDerivedColors(
  activity: Omit<ActivityType, "colors"> & { colors?: ColorTuple },
): ActivityType {
  const baseColor = expandToSix(activity.baseColor);
  return {
    ...activity,
    baseColor,
    colors: shadesFromBaseColor(baseColor),
  };
}

export function createExerciseActivityType(label: string): ActivityType {
  const cleanedLabel = cleanFolderSegment(label);
  return withDerivedColors({
    id: activityIdFromLabel(cleanedLabel),
    domain: "exercise",
    label: cleanedLabel,
    folder: defaultExerciseFolder(cleanedLabel),
    enabled: true,
    baseColor: GREEN[2],
    noteModel: "dailySession",
    supportsCues: true,
    supportsTimer: false,
    supportsSetTable: false,
  });
}

export function createHobbyActivityType(label: string): ActivityType {
  const cleanedLabel = cleanFolderSegment(label);
  const labelForHobby =
    cleanedLabel === FALLBACK_EXERCISE_NAME ? FALLBACK_HOBBY_NAME : cleanedLabel;
  return withDerivedColors({
    id: activityIdFromLabel(labelForHobby),
    domain: "hobby",
    label: labelForHobby,
    folder: defaultHobbyFolder(labelForHobby),
    enabled: true,
    baseColor: defaultBaseColorForDomain("hobby"),
    noteModel: "item",
    supportsCues: false,
    supportsTimer: true,
    supportsSetTable: false,
  });
}

function domainFrom(value: unknown): Domain | null {
  return value === "exercise" || value === "hobby" ? value : null;
}

function noteModelFrom(value: unknown): NoteModel | null {
  return value === "dailySession" || value === "item" ? value : null;
}

export function normalizeActivityType(
  value: unknown,
  fallbackColors: ColorTuple,
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
  const baseColor = resolveBaseColor(value, domain, fallbackColors);
  return withDerivedColors({
    id,
    domain,
    label,
    folder,
    enabled: value.enabled !== false,
    baseColor,
    noteModel,
    supportsCues: domain === "exercise" && value.supportsCues === true,
    supportsTimer: domain === "hobby" && value.supportsTimer === true,
    supportsSetTable:
      domain === "exercise" &&
      noteModel === "dailySession" &&
      value.supportsSetTable === true,
  });
}

export function activityTypeFromSeries(
  value: unknown,
  fallbackColors: ColorTuple,
): ActivityType | null {
  if (!isRecord(value)) return null;
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const folder = typeof value.folder === "string" ? value.folder.trim() : "";
  if (!label || !folder || !isSafeVaultFolder(folder)) return null;

  const idRaw = typeof value.id === "string" ? value.id.trim() : "";
  const kind = value.kind === "gym" || value.kind === "golf" ? value.kind : "generic";
  const id = activityIdFromLabel(idRaw || kind || label);
  const colors = colorTuple(
    value.colors,
    kind === "golf" ? ORANGE : fallbackColors,
  );
  const baseColor = resolveBaseColor(
    { ...value, colors },
    "exercise",
    colors,
  );
  return withDerivedColors({
    id,
    domain: "exercise",
    label,
    folder,
    enabled: value.enabled !== false,
    baseColor,
    noteModel: "dailySession",
    supportsCues: true,
    supportsTimer: false,
    supportsSetTable: kind === "gym",
  });
}

export function exerciseActivities(activityTypes: ActivityType[]): ActivityType[] {
  return activityTypes.filter(
    (activity) =>
      activity.enabled !== false &&
      activity.domain === "exercise" &&
      activity.noteModel === "dailySession",
  );
}

export function hobbyActivities(activityTypes: ActivityType[]): ActivityType[] {
  return activityTypes.filter(
    (activity) =>
      activity.enabled !== false &&
      activity.domain === "hobby" &&
      activity.noteModel === "item" &&
      activity.supportsTimer,
  );
}

/** All activities including disabled (for settings UI). */
export function allHobbyActivities(activityTypes: ActivityType[]): ActivityType[] {
  return activityTypes.filter(
    (activity) =>
      activity.domain === "hobby" &&
      activity.noteModel === "item" &&
      activity.supportsTimer,
  );
}

/** All exercises including disabled (for settings UI). */
export function allExerciseActivities(activityTypes: ActivityType[]): ActivityType[] {
  return activityTypes.filter(
    (activity) =>
      activity.domain === "exercise" && activity.noteModel === "dailySession",
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
