import type { VaultDataSource } from "../data/vault-source";
import {
  extractYmdFromPath,
  parseYmd,
  ymdInZone,
} from "../dates";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType } from "../types";
import { exerciseActivities } from "../util/activity-types";

export function resolveTodayDate(
  opts: Record<string, string>,
  sourcePath: string,
  timezone: string,
): string {
  if (opts.date && parseYmd(opts.date)) return opts.date;
  const fromPath = extractYmdFromPath(sourcePath);
  if (fromPath) return fromPath;
  return ymdInZone(new Date(), timezone);
}

export function renderTodaySessions(
  el: HTMLElement,
  data: VaultDataSource,
  activityTypes: ActivityType[],
  dateStr: string,
  language: Language,
): void {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });
  const box = root.createDiv();
  box.createEl("strong", { text: t("view.today.title", language) });
  const ul = box.createEl("ul");
  const year = Number(dateStr.slice(0, 4));

  for (const activity of exerciseActivities(activityTypes)) {
    const path = `${activity.folder}/${year}/${dateStr}.md`;
    const li = ul.createEl("li");
    li.appendText(`${activity.label}: `);
    if (data.exists(path)) {
      const a = li.createEl("a", {
        cls: "fitness-link",
        text: dateStr,
      });
      a.addEventListener("click", (e) => {
        e.preventDefault();
        void data.openPath(path);
      });
    } else {
      li.createEl("em", {
        cls: "fitness-muted",
        text: t("view.today.noSession", language),
      });
    }
  }
}
