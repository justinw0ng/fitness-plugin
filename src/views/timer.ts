import { Notice } from "obsidian";
import type FitnessPlugin from "../main";
import { t } from "../i18n";
import {
  readTimerFrontmatter,
  stopTimer,
  updateTimerFrontmatter,
} from "../core/hobby";

async function modifyCurrentNote(
  plugin: FitnessPlugin,
  sourcePath: string,
  updater: (markdown: string) => string,
): Promise<void> {
  const file = plugin.data.getFileByPath(sourcePath);
  if (!file) {
    new Notice(t("notice.timerNeedsSavedNote", plugin.settings.language));
    return;
  }
  const original = await plugin.app.vault.read(file);
  await plugin.app.vault.modify(file, updater(original));
  plugin.scheduleRefresh();
}

export async function renderAtomicTimer(
  plugin: FitnessPlugin,
  el: HTMLElement,
  sourcePath: string,
): Promise<void> {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin atomic-timer" });
  if (!sourcePath) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.timer.needsReadingItem", plugin.settings.language),
    });
    return;
  }

  const markdown = await plugin.data.readBody(sourcePath);
  const frontmatter = readTimerFrontmatter(markdown);
  root.createEl("p", {
    text: t("view.timer.total", plugin.settings.language, {
      minutes: frontmatter.totalMin,
    }),
    cls: "atomic-timer-total",
  });

  const actions = root.createDiv({ cls: "fitness-actions atomic-timer-actions" });
  if (frontmatter.timerStartedAt) {
    root.createEl("p", {
      cls: "atomic-timer-running",
      text: t("view.timer.runningSince", plugin.settings.language, {
        time: frontmatter.timerStartedAt,
      }),
    });
    actions
      .createEl("button", { text: t("view.timer.stop", plugin.settings.language) })
      .addEventListener("click", () => {
        void modifyCurrentNote(plugin, sourcePath, (latest) => {
          const latestFrontmatter = readTimerFrontmatter(latest);
          if (!latestFrontmatter.timerStartedAt) {
            new Notice(t("notice.timerNotRunning", plugin.settings.language));
            return latest;
          }
          const note = window.prompt(t("modal.timeLogNote", plugin.settings.language), "") ?? "";
          const result = stopTimer({
            markdown: latest,
            startedAtIso: latestFrontmatter.timerStartedAt,
            stoppedAtIso: new Date().toISOString(),
            note,
          });
          new Notice(
            t("notice.timerLogged", plugin.settings.language, {
              minutes: result.minutes,
            }),
          );
          return result.markdown;
        });
      });
    actions
      .createEl("button", { text: t("view.timer.resume", plugin.settings.language) })
      .addEventListener("click", () => {
        new Notice(t("notice.timerAlreadyRunning", plugin.settings.language));
      });
    actions
      .createEl("button", { text: t("view.timer.discard", plugin.settings.language) })
      .addEventListener("click", () => {
        void modifyCurrentNote(plugin, sourcePath, (latest) =>
          updateTimerFrontmatter(latest, { timerStartedAtIso: null }),
        );
      });
    return;
  }

  actions
    .createEl("button", { text: t("view.timer.start", plugin.settings.language) })
    .addEventListener("click", () => {
      void modifyCurrentNote(plugin, sourcePath, (latest) =>
        updateTimerFrontmatter(latest, {
          timerStartedAtIso: new Date().toISOString(),
        }),
      );
    });
}
