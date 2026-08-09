import type { VaultDataSource } from "../data/vault-source";
import {
  buildKeepers,
  cuesInCalendarMonth,
  parseReminders,
  type Cue,
} from "../core";
import {
  formatMonthLabel,
  nowMonth,
  nowYear,
} from "../dates";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType } from "../types";
import { resolveCueActivityType } from "../util/activity-types";

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

export async function renderCues(
  el: HTMLElement,
  data: VaultDataSource,
  activityTypes: ActivityType[],
  year: number,
  timezone: string,
  activity: string,
  language: Language,
): Promise<void> {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });

  const activityType = resolveCueActivityType(activityTypes, activity);
  if (!activityType) {
    root.createEl("p", {
      text: t("view.cues.noCueActivity", language, { activity }),
      cls: "fitness-muted",
    });
    return;
  }

  const currentYear = nowYear(timezone);
  const month = year === currentYear ? nowMonth(timezone) : 12;
  const monthLabel = formatMonthLabel(year, month, language);

  const cues: Cue[] = [];
  for (const p of data.listSessions(activityType.folder, year)) {
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
    text: t("view.cues.thisMonth", language, { month: monthLabel }),
  });
  if (!thisMonth.length) {
    root.createEl("p", {
      text: t("view.cues.noReminders", language),
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
    text: t("view.cues.keepers", language, { year }),
  });
  if (!keepers.length) {
    root.createEl("p", {
      text: t("view.cues.noKeepers", language),
      cls: "fitness-muted",
    });
  } else {
    const ul = root.createEl("ul");
    for (const k of keepers) {
      const focusBit = k.focus ? ` · ${k.focus}` : "";
      const li = ul.createEl("li");
      li.createEl("strong", { text: k.text });
      li.appendText(
        t("view.cues.lastSeen", language, {
          count: k.count,
          lastSeen: k.lastSeen,
          focus: focusBit,
        }),
      );
    }
  }
}
