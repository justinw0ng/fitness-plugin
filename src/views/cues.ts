import type { VaultDataSource } from "../data/vault-source";
import {
  buildKeepers,
  cuesInCalendarMonth,
  parseReminders,
  type Cue,
} from "../core";
import {
  monthLongEn,
  monthLongZh,
  nowMonth,
  nowYear,
} from "../dates";
import type { SeriesConfig } from "../types";

export function resolveCuesYear(
  opts: Record<string, string>,
  frontmatterYear: unknown,
  timezone: string,
): number {
  if (opts.year && Number(opts.year)) return Number(opts.year);
  const n = Number(frontmatterYear);
  if (Number.isFinite(n) && n >= 1970) return n;
  return nowYear(timezone);
}

export async function renderGolfCues(
  el: HTMLElement,
  data: VaultDataSource,
  seriesList: SeriesConfig[],
  year: number,
  timezone: string,
): Promise<void> {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });

  const golf =
    seriesList.find((s) => s.kind === "golf") ||
    seriesList.find((s) => s.folder === "Golf");
  if (!golf) {
    root.createEl("p", {
      text: "No golf series configured.",
      cls: "fitness-muted",
    });
    return;
  }

  const currentYear = nowYear(timezone);
  const month = year === currentYear ? nowMonth(timezone) : 12;
  const monthLabel =
    year === currentYear
      ? `${monthLongEn(year, month)} / ${monthLongZh(year, month)}`
      : `December ${year} / ${year}年12月`;

  const cues: Cue[] = [];
  for (const p of data.listSessions(golf.folder, year)) {
    if (!p.date) continue;
    const md = await data.readBody(p.path);
    const focus = p.focus.join(", ");
    for (const text of parseReminders(md)) {
      if (!text) continue;
      cues.push({ text, date: p.date, focus });
    }
  }

  const thisMonth = cuesInCalendarMonth(cues, year, month);
  const keepers = buildKeepers(cues, year);

  root.createEl("h2", {
    text: `📅 This month / 本月 — ${monthLabel}`,
  });
  if (!thisMonth.length) {
    root.createEl("p", {
      text: "No reminders this month / 本月尚無提醒",
      cls: "fitness-muted",
    });
  } else {
    const ul = root.createEl("ul");
    for (const c of thisMonth) {
      const focusBit = c.focus ? ` · ${c.focus}` : "";
      ul.createEl("li", { text: `${c.date}${focusBit}: ${c.text}` });
    }
  }

  root.createEl("h2", {
    text: `⭐ Keepers / 常駐提醒 (≥2 in ${year})`,
  });
  if (!keepers.length) {
    root.createEl("p", {
      text: "No keepers yet / 尚無常駐提醒",
      cls: "fitness-muted",
    });
  } else {
    const ul = root.createEl("ul");
    for (const k of keepers) {
      const focusBit = k.focus ? ` · ${k.focus}` : "";
      const li = ul.createEl("li");
      li.createEl("strong", { text: k.text });
      li.appendText(
        ` (×${k.count}, last / 最近 ${k.lastSeen}${focusBit})`,
      );
    }
  }
}
