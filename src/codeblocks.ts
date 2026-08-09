import type { MarkdownPostProcessorContext } from "obsidian";
import type FitnessPlugin from "./main";
import { parseBlockOptions } from "./util/parse-block";
import { renderActions } from "./views/actions";
import { renderCues, resolveCuesYear } from "./views/cues";
import {
  renderDashboard,
  resolveDashboardYear,
} from "./views/dashboard";
import { renderHeatmaps, resolveHeatmapYear } from "./views/heatmap";
import { renderTodaySessions, resolveTodayDate } from "./views/today";

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
  const series = settings.series;
  const tz = settings.timezone;

  try {
    switch (kind) {
      case "fitness-heatmap": {
        const year = resolveHeatmapYear(opts, sourcePath, tz);
        renderHeatmaps(el, data, series, year, tz);
        break;
      }
      case "fitness-today": {
        const dateStr = resolveTodayDate(opts, sourcePath, tz);
        renderTodaySessions(el, data, series, dateStr);
        break;
      }
      case "fitness-dashboard": {
        const year = resolveDashboardYear(
          opts,
          frontmatterYear(plugin, sourcePath),
          tz,
        );
        await renderDashboard(
          el,
          data,
          series,
          year,
          settings.golfCuesPath,
          settings.gymCuesPath,
        );
        break;
      }
      case "fitness-golf-cues":
      case "fitness-gym-cues":
      case "fitness-cues": {
        if (kind === "fitness-cues" && !settings.deprecatedFitnessCuesEnabled) {
          el.empty();
          const root = el.createDiv({ cls: "fitness-plugin" });
          root.createEl("p", {
            text: "Legacy fitness-cues block is disabled. Use fitness-golf-cues.",
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
          series,
          year,
          tz,
          kind === "fitness-gym-cues" ? "gym" : "golf",
        );
        break;
      }
      case "fitness-actions": {
        renderActions(el, plugin);
        break;
      }
      default:
        el.createEl("p", { text: `Unknown fitness block: ${kind}` });
    }
  } catch (err) {
    console.error("Fitness block error", kind, err);
    el.empty();
    el.createEl("p", {
      text: `Fitness error: ${err instanceof Error ? err.message : String(err)}`,
      cls: "mod-warning",
    });
  }
}

export function registerCodeblocks(plugin: FitnessPlugin): void {
  const kinds = [
    "fitness-heatmap",
    "fitness-today",
    "fitness-dashboard",
    "fitness-golf-cues",
    "fitness-gym-cues",
    "fitness-cues",
    "fitness-actions",
  ];

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
