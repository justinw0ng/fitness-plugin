import type { VaultDataSource } from "../data/vault-source";
import {
  extractYmdFromPath,
  parseYmd,
  ymdInZone,
} from "../dates";
import type { SeriesConfig } from "../types";

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
  seriesList: SeriesConfig[],
  dateStr: string,
): void {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });
  const box = root.createDiv();
  box.createEl("strong", { text: "🗂️ Today’s sessions / 今日訓練" });
  const ul = box.createEl("ul");
  const year = Number(dateStr.slice(0, 4));

  for (const s of seriesList) {
    const path = `${s.folder}/${year}/${dateStr}.md`;
    const li = ul.createEl("li");
    li.appendText(`${s.label}: `);
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
        text: "no session yet / 尚未記錄",
      });
    }
  }
}
