export type SeriesKind = "gym" | "golf" | "generic";

export interface SeriesConfig {
  id: string;
  label: string;
  folder: string;
  colors: [string, string, string, string];
  kind: SeriesKind;
}

export type Domain = "exercise" | "hobby";

export type NoteModel = "dailySession" | "item";

export interface ActivityType {
  id: string;
  domain: Domain;
  label: string;
  folder: string;
  colors: [string, string, string, string];
  noteModel: NoteModel;
  supportsCues: boolean;
  supportsTimer: boolean;
  supportsSetTable: boolean;
}

export interface SessionMeta {
  path: string;
  date: string | null;
  duration_min: number;
  weight_unit: "kg" | "lb";
  focus: string[];
  felt: string;
  basename: string;
}

export interface DayActivity {
  minutes: number;
  path: string | null;
}

export interface FitnessSettings {
  timezone: string;
  activityTypes: ActivityType[];
  dashboardPath: string;
  golfCuesPath: string;
  gymCuesPath: string;
  deprecatedFitnessBlocksEnabled: boolean;
}

export const GREEN: [string, string, string, string] = [
  "#9be9a8",
  "#40c463",
  "#30a14e",
  "#216e39",
];

export const ORANGE: [string, string, string, string] = [
  "#ffd8a8",
  "#ffa94d",
  "#f76707",
  "#d9480f",
];

export const EMPTY_CELL = "#ebedf0";

export const DEFAULT_ACTIVITY_TYPES: ActivityType[] = [
  {
    id: "gym",
    domain: "exercise",
    label: "🏋️ Gym / 健身",
    folder: "atomics/exercise/Gym",
    colors: GREEN,
    noteModel: "dailySession",
    supportsCues: true,
    supportsTimer: false,
    supportsSetTable: true,
  },
  {
    id: "golf",
    domain: "exercise",
    label: "⛳ Golf / 高爾夫",
    folder: "atomics/exercise/Golf",
    colors: ORANGE,
    noteModel: "dailySession",
    supportsCues: true,
    supportsTimer: false,
    supportsSetTable: false,
  },
];

export const DEFAULT_SETTINGS: FitnessSettings = {
  timezone: "Asia/Hong_Kong",
  dashboardPath: "atomics/Dashboard.md",
  golfCuesPath: "atomics/exercise/Golf/Cues.md",
  gymCuesPath: "atomics/exercise/Gym/Cues.md",
  deprecatedFitnessBlocksEnabled: true,
  activityTypes: DEFAULT_ACTIVITY_TYPES,
};
