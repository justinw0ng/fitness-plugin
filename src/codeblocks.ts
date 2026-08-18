import { MarkdownRenderChild, type MarkdownPostProcessorContext } from "obsidian";
import type FitnessPlugin from "./main";
import { parseBlockOptions } from "./util/parse-block";
import {
  currentBlockGeneration,
  enqueueBlockRender,
  invalidateBlockRenderIfCurrent,
  isStaleBlockRender,
  mountAtomicBlockShell,
} from "./util/block-render";
import { renderActions } from "./views/actions";
import { renderCues, resolveCuesYear } from "./views/cues";
import {
  renderDashboard,
  resolveDashboardYear,
} from "./views/dashboard";
import { renderBookShelf } from "./views/book-shelf";
import { renderHeatmaps, resolveHeatmapYear } from "./views/heatmap";
import { renderAtomicGymLog } from "./views/gym-log";
import { renderAtomicTimer } from "./views/timer";
import { renderTodaySessions, resolveTodayDate } from "./views/today";
import {
  codeblockLanguages,
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

class AtomicBlockChild extends MarkdownRenderChild {
  private generation = 0;

  constructor(
    containerEl: HTMLElement,
    private readonly startRender: () => void,
  ) {
    super(containerEl);
  }

  onload(): void {
    this.startRender();
    this.generation = currentBlockGeneration(this.containerEl);
  }

  onunload(): void {
    invalidateBlockRenderIfCurrent(this.containerEl, this.generation);
  }
}

export function renderTrackedBlock(
  plugin: FitnessPlugin,
  block: LiveBlock,
): Promise<void> {
  return enqueueBlockRender(block.el, async (generation) => {
    if (isStaleBlockRender(block.el, generation) || !block.el.isConnected) {
      return;
    }
    await renderBlock(plugin, block.kind, block.source, block.el, {
      sourcePath: block.sourcePath,
    });
  });
}

export async function renderBlock(
  plugin: FitnessPlugin,
  kind: string,
  source: string,
  el: HTMLElement,
  ctx: Pick<MarkdownPostProcessorContext, "sourcePath">,
): Promise<void> {
  if (!el.isConnected) return;
  const opts = parseBlockOptions(source);
  const sourcePath = ctx.sourcePath || "";
  const data = plugin.data;
  const settings = plugin.settings;
  const activityTypes = settings.activityTypes;
  const tz = settings.timezone;
  const language = settings.language;

  try {
    switch (kind) {
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
        const activity = resolveCueActivity(kind, opts);
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
      case "atomic-gym-log": {
        await renderAtomicGymLog(plugin, el, sourcePath);
        break;
      }
      case "atomic-bookshelf": {
        renderBookShelf(el, data, activityTypes, opts, language);
        break;
      }
      default:
        el.empty();
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
  const kinds = codeblockLanguages();

  for (const kind of kinds) {
    plugin.registerMarkdownCodeBlockProcessor(kind, (source, el, ctx) => {
      const block = { kind, el, source, sourcePath: ctx.sourcePath };
      plugin.trackLiveBlock(block);
      mountAtomicBlockShell(el);
      ctx.addChild(
        new AtomicBlockChild(el, () => {
          void renderTrackedBlock(plugin, block);
        }),
      );
    });
  }
}
