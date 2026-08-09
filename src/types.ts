export type SeriesKind = "gym" | "golf" | "generic";

export interface SeriesConfig {
  id: string;
  label: string;
  folder: string;
  colors: [string, string, string, string];
  kind: SeriesKind;
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
  series: SeriesConfig[];
  dashboardPath: string;
  golfCuesPath: string;
  gymCuesPath: string;
  deprecatedFitnessCuesEnabled: boolean;
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

export const DEFAULT_SETTINGS: FitnessSettings = {
  timezone: "Asia/Hong_Kong",
  dashboardPath: "Fitness/Dashboard.md",
  golfCuesPath: "Golf/Cues.md",
  gymCuesPath: "Gym/Cues.md",
  deprecatedFitnessCuesEnabled: true,
  series: [
    {
      id: "gym",
      label: "🏋️ Gym / 健身",
      folder: "Gym",
      colors: GREEN,
      kind: "gym",
    },
    {
      id: "golf",
      label: "⛳ Golf / 高爾夫",
      folder: "Golf",
      colors: ORANGE,
      kind: "golf",
    },
  ],
};
