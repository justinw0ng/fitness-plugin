import { App, FuzzySuggestModal, Notice } from "obsidian";
import { GYM_LOCATIONS } from "../core";
import {
  CUSTOM_LOCATION_SENTINEL,
  gymCreateLocationNeedsDetail,
  resolveGymCreateLocation,
} from "../core/property-options";
import type { VaultDataSource } from "../data/vault-source";
import { ymdInZone } from "../dates";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { promptText } from "../util/prompt-text.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { defaultAtomicBlockFence } from "../util/codeblock-defaults.ts";
import { yamlScalar } from "../util/yaml";

function suggestOne(
  app: App,
  placeholder: string,
  items: string[],
  labels?: string[],
): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const modal = new (class extends FuzzySuggestModal<string> {
      getItems(): string[] {
        return items;
      }
      getItemText(item: string): string {
        const i = items.indexOf(item);
        return labels && labels[i] ? labels[i] : item;
      }
      onChooseItem(item: string) {
        if (settled) return;
        settled = true;
        resolve(item);
      }
      onClose() {
        if (settled) return;
        settled = true;
        resolve(null);
      }
    })(app);
    modal.setPlaceholder(placeholder);
    modal.open();
  });
}

function gymBody(
  activity: ActivityType,
  date: string,
  location: string,
  locationDetail: string,
  weightUnit: string,
  language: Language,
): string {
  const muscleHints =
    language === "en"
      ? ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core"]
      : [
          "Chest / 胸",
          "Back / 背",
          "Shoulders / 肩",
          "Biceps / 二頭",
          "Triceps / 三頭",
          "Quads / 股四頭",
          "Hamstrings / 腿後腱",
          "Glutes / 臀",
          "Calves / 小腿",
          "Core / 核心",
        ];
  return `---
type: session
date: ${date}
activity: ${yamlScalar(activity.id)}
duration_min:
location: ${yamlScalar(location)}
location_detail: ${yamlScalar(locationDetail)}
weight_unit: ${weightUnit}
---

# ${activity.label} — ${date}

<!-- 💪 ${t("template.gymMuscles", language)}: ${muscleHints.join(", ")} -->

${defaultAtomicBlockFence("atomic-gym-log", language)}
| ${t("template.gymTable.exercise", language)} | ${t("template.gymTable.muscle", language)} | ${t("template.gymTable.weight", language)} | ${t("template.gymTable.reps", language)} | ${t("template.gymTable.notes", language)} |
| --- | --- | --- | --- | --- |
${activity.supportsCues ? `
## ${t("template.reminders", language)}

- 
` : ""}
`;
}

function golfBody(activity: ActivityType, date: string, language: Language): string {
  return `---
type: session
date: ${date}
activity: ${yamlScalar(activity.id)}
duration_min:
location:
focus: []
club: []
felt:
---

# ${activity.label} — ${date}

<!-- ${t("template.golfLocationHint", language)} -->
<!-- ${t("template.golfFocusHint", language)} -->
<!-- ${t("template.golfClubHint", language)} -->
<!-- ${t("template.golfFeltHint", language)} -->
${activity.supportsCues ? `
## ${t("template.reminders", language)}

- 
` : ""}
`;
}

function genericExerciseBody(
  activity: ActivityType,
  date: string,
  language: Language,
): string {
  return `---
type: session
date: ${date}
activity: ${yamlScalar(activity.id)}
duration_min:
location:
---

# ${activity.label} — ${date}
${activity.supportsCues ? `
## ${t("template.reminders", language)}

- 
` : ""}
`;
}

async function promptSessionDate(
  app: App,
  timezone: string,
  language: Language,
): Promise<string | null> {
  const today = ymdInZone(new Date(), timezone);
  const dateRaw = await promptText(app, t("modal.dateTitle", language), today, language);
  if (dateRaw === null) return null;
  const date = dateRaw.trim() || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    new Notice(t("notice.invalidDate", language));
    return null;
  }
  return date;
}

async function gymSessionBody(
  app: App,
  activity: ActivityType,
  date: string,
  language: Language,
): Promise<string> {
  const locationItems = [...GYM_LOCATIONS, CUSTOM_LOCATION_SENTINEL];
  const locationLabels = [
    t("location.home", language),
    t("location.commercial", language),
    t("location.hotelTravel", language),
    t("location.other", language),
    t("property.location.custom", language),
  ];

  const selected =
    (await suggestOne(
      app,
      t("modal.locationPlaceholder", language),
      locationItems,
      locationLabels,
    )) || "";

  let customPromptRaw: string | null | undefined;
  if (selected === CUSTOM_LOCATION_SENTINEL) {
    customPromptRaw = await promptText(
      app,
      t("modal.customLocation", language),
      "",
      language,
    );
  }

  const { location, wasCustom, emptyCustomNotice } = resolveGymCreateLocation(
    selected,
    customPromptRaw,
  );
  if (emptyCustomNotice) {
    new Notice(t("notice.emptyCustomLocation", language));
  }

  let locationDetail = "";
  if (gymCreateLocationNeedsDetail(location, wasCustom)) {
    locationDetail =
      (await promptText(
        app,
        t("modal.otherLocationDetail", language),
        "",
        language,
      )) || "";
  }

  let weightUnit =
    (await suggestOne(app, t("modal.weightUnitPlaceholder", language), [
      "kg",
      "lb",
    ])) || "kg";
  if (weightUnit !== "lb") weightUnit = "kg";

  return gymBody(activity, date, location, locationDetail, weightUnit, language);
}

export async function createActivitySession(
  app: App,
  data: VaultDataSource,
  activity: ActivityType,
  timezone: string,
  language: Language,
): Promise<void> {
  const date = await promptSessionDate(app, timezone, language);
  if (!date) return;
  const year = date.slice(0, 4);
  const folder = `${activity.folder}/${year}`;
  const target = `${folder}/${date}.md`;

  if (data.exists(target)) {
    await data.openPath(target);
    new Notice(
      t("notice.openedExistingSession", language, {
        activity: activity.label,
        path: target,
      }),
    );
    return;
  }

  const body = activity.supportsSetTable
    ? await gymSessionBody(app, activity, date, language)
    : activity.id === "golf"
      ? golfBody(activity, date, language)
      : genericExerciseBody(activity, date, language);
  await data.createNote(target, body);
  await data.openPath(target);
  new Notice(
    t("notice.createdSession", language, {
      activity: activity.label,
      path: target,
    }),
  );
}

export async function createGymSession(
  app: App,
  data: VaultDataSource,
  activity: ActivityType,
  timezone: string,
  language: Language,
): Promise<void> {
  await createActivitySession(app, data, activity, timezone, language);
}

export async function createGolfSession(
  app: App,
  data: VaultDataSource,
  activity: ActivityType,
  timezone: string,
  language: Language,
): Promise<void> {
  await createActivitySession(app, data, activity, timezone, language);
}
