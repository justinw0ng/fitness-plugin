// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { FELT, GOLF_LOCATIONS, GYM_LOCATIONS } from "../core.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { READING_STATUSES, isReadingItemFrontmatter, readingStatusLabelKey } from "./reading-status.ts";

export type PropertyOptionContext = {
  frontmatter: Record<string, unknown> | null | undefined;
};

export type PropertyOptionSpec = {
  property: string;
  values: readonly string[];
  matches: (context: PropertyOptionContext) => boolean;
  labelKey?: (value: string) => string;
};

const WEIGHT_UNITS = ["kg", "lb"] as const;

function sessionActivity(
  frontmatter: Record<string, unknown> | null | undefined,
): string {
  return String(frontmatter?.activity ?? "").trim().toLowerCase();
}

function isSession(
  frontmatter: Record<string, unknown> | null | undefined,
): boolean {
  return String(frontmatter?.type ?? "").trim() === "session";
}

function isGolfSession(context: PropertyOptionContext): boolean {
  return isSession(context.frontmatter) && sessionActivity(context.frontmatter) === "golf";
}

function isGymSession(context: PropertyOptionContext): boolean {
  return isSession(context.frontmatter) && sessionActivity(context.frontmatter) === "gym";
}

function gymLocationLabelKey(value: string): string {
  switch (value) {
    case "Home":
      return "location.home";
    case "Commercial":
      return "location.commercial";
    case "Hotel/Travel":
      return "location.hotelTravel";
    case "Other":
      return "location.other";
    default:
      return value;
  }
}

function golfLocationLabelKey(value: string): string {
  switch (value) {
    case "Home net":
      return "property.golfLocation.homeNet";
    case "Driving range":
      return "property.golfLocation.drivingRange";
    case "Course":
      return "property.golfLocation.course";
    case "Other":
      return "property.golfLocation.other";
    default:
      return value;
  }
}

function feltLabelKey(value: string): string {
  switch (value) {
    case "good":
      return "property.felt.good";
    case "ok":
      return "property.felt.ok";
    case "bad":
      return "property.felt.bad";
    default:
      return value;
  }
}

function weightUnitLabelKey(value: string): string {
  switch (value) {
    case "kg":
      return "property.weightUnit.kg";
    case "lb":
      return "property.weightUnit.lb";
    default:
      return value;
  }
}

export const PROPERTY_OPTION_SPECS: readonly PropertyOptionSpec[] = [
  {
    property: "status",
    values: READING_STATUSES,
    matches: (context) => isReadingItemFrontmatter(context.frontmatter),
    labelKey: readingStatusLabelKey,
  },
  {
    property: "felt",
    values: FELT,
    matches: isGolfSession,
    labelKey: feltLabelKey,
  },
  {
    property: "location",
    values: GOLF_LOCATIONS,
    matches: isGolfSession,
    labelKey: golfLocationLabelKey,
  },
  {
    property: "location",
    values: GYM_LOCATIONS,
    matches: isGymSession,
    labelKey: gymLocationLabelKey,
  },
  {
    property: "weight_unit",
    values: WEIGHT_UNITS,
    matches: isGymSession,
    labelKey: weightUnitLabelKey,
  },
];

export const DROPDOWN_PROPERTY_NAMES = [
  ...new Set(PROPERTY_OPTION_SPECS.map((spec) => spec.property)),
];

export function resolvePropertyOptions(
  property: string,
  context: PropertyOptionContext,
): PropertyOptionSpec | null {
  return (
    PROPERTY_OPTION_SPECS.find(
      (spec) => spec.property === property && spec.matches(context),
    ) ?? null
  );
}
