import type { MarkdownPostProcessorContext } from "obsidian";
import type FitnessPlugin from "./main";
import { parseBlockOptions } from "./util/parse-block";
import { renderActions } from "./views/actions";
import { renderCues, resolveCuesYear } from "./views/cues";
import {
  renderDashboard,
  resolveDashboardYear,
} from "./views/dashboard";
import { renderBookShelf } from "./views/book-shelf";
import { renderHeatmaps, resolveHeatmapYear } from "./views/heatmap";
import { renderAtomicTimer } from "./views/timer";
import { renderTodaySessions, resolveTodayDate } from "./views/today";
import {
  codeblockLanguages,
  resolveCodeblockKind,
  resolveCueActivity,
} from "./util/codeblock-languages";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t } from "./i18n/index.ts";

export type LiveBlock = {
  kind: string;
  el: HTMLElement;
  source: string;
  sourcePath: string;
};

function frontmatterYear(
  plugin: FitnessPlugin,
  sourcePath: string,
): unknown {
  const cache = plugin.app.metadataCache.getCache(sourcePath);
  return cache?.frontmatter?.year;
}

export async function renderBlock(
  plugin: FitnessPlugin,
  kind: string,
  source: string,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
): Promise<void> {
  const opts = parseBlockOptions(source);
  const sourcePath = ctx.sourcePath || "";
  const data = plugin.data;
  const settings = plugin.settings;
  const activityTypes = settings.activityTypes;
  const tz = settings.timezone;
  const language = settings.language;
  const resolvedKind = resolveCodeblockKind(kind);

  try {
    if (kind.startsWith("fitness-") && !settings.deprecatedFitnessBlocksEnabled) {
      el.empty();
      const root = el.createDiv({ cls: "fitness-plugin" });
      root.createEl("p", {
        text: t("view.legacyDisabled", language),
        cls: "fitness-muted",
      });
      return;
    }

    switch (resolvedKind) {
      case "atomic-heatmap": {
        const year = resolveHeatmapYear(opts, sourcePath, tz);
        await renderHeatmaps(
          el,
          data,
          activityTypes,
          year,
          tz,
          language,
          opts.activity,
          opts,
        );
        break;
      }
      case "atomic-today": {
        const dateStr = resolveTodayDate(opts, sourcePath, tz);
        renderTodaySessions(el, data, activityTypes, dateStr, language);
        break;
      }
      case "atomic-dashboard": {
        const year = resolveDashboardYear(
          opts,
          frontmatterYear(plugin, sourcePath),
          tz,
        );
        await renderDashboard(
          el,
          data,
          activityTypes,
          year,
          language,
        );
        break;
      }
      case "atomic-golf-cues":
      case "atomic-gym-cues":
      case "atomic-cues": {
        const activity = resolveCueActivity(resolvedKind, opts);
        if (!activity) {
          el.empty();
          const root = el.createDiv({ cls: "fitness-plugin" });
          root.createEl("p", {
            text: t("view.atomicCuesRequiresActivity", language),
            cls: "fitness-muted",
          });
          break;
        }
        const year = resolveCuesYear(
          opts,
          frontmatterYear(plugin, sourcePath),
          tz,
        );
        await renderCues(
          el,
          data,
          activityTypes,
          year,
          tz,
          activity,
          language,
        );
        break;
      }
      case "atomic-actions": {
        renderActions(el, plugin);
        break;
      }
      case "atomic-timer": {
        await renderAtomicTimer(plugin, el, sourcePath);
        break;
      }
      case "atomic-bookshelf": {
        renderBookShelf(el, data, activityTypes, opts, language);
        break;
      }
      default:
        el.createEl("p", {
          text: t("view.unknownAtomicBlock", language, { kind }),
        });
    }
  } catch (err) {
    console.error("Atomic block error", kind, err);
    el.empty();
    el.createEl("p", {
      text: t("view.atomicError", language, {
        message: err instanceof Error ? err.message : String(err),
      }),
      cls: "mod-warning",
    });
  }
}

export function registerCodeblocks(plugin: FitnessPlugin): void {
  const kinds = codeblockLanguages(plugin.settings.deprecatedFitnessBlocksEnabled);

  for (const kind of kinds) {
    plugin.registerMarkdownCodeBlockProcessor(
      kind,
      async (source, el, ctx) => {
        plugin.trackLiveBlock({ kind, el, source, sourcePath: ctx.sourcePath });
        await renderBlock(plugin, kind, source, el, ctx);
      },
    );
  }
}
