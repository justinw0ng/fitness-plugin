import { Notice } from "obsidian";
import type FitnessPlugin from "../main";
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
    new Notice("Atomic timer can only update a saved note.");
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
      text: "Atomic timer can only run from a saved Reading item note.",
    });
    return;
  }

  const markdown = await plugin.data.readBody(sourcePath);
  const frontmatter = readTimerFrontmatter(markdown);
  root.createEl("p", {
    text: `Total: ${frontmatter.totalMin} min`,
    cls: "atomic-timer-total",
  });

  const actions = root.createDiv({ cls: "fitness-actions atomic-timer-actions" });
  if (frontmatter.timerStartedAt) {
    root.createEl("p", {
      cls: "atomic-timer-running",
      text: `Timer running since ${frontmatter.timerStartedAt}`,
    });
    actions
      .createEl("button", { text: "Stop" })
      .addEventListener("click", () => {
        void modifyCurrentNote(plugin, sourcePath, (latest) => {
          const latestFrontmatter = readTimerFrontmatter(latest);
          if (!latestFrontmatter.timerStartedAt) {
            new Notice("Timer is not running.");
            return latest;
          }
          const note = window.prompt("Time log note", "") ?? "";
          const result = stopTimer({
            markdown: latest,
            startedAtIso: latestFrontmatter.timerStartedAt,
            stoppedAtIso: new Date().toISOString(),
            note,
          });
          new Notice(`Logged ${result.minutes} min.`);
          return result.markdown;
        });
      });
    actions
      .createEl("button", { text: "Resume" })
      .addEventListener("click", () => {
        new Notice("Timer is already running.");
      });
    actions
      .createEl("button", { text: "Discard" })
      .addEventListener("click", () => {
        void modifyCurrentNote(plugin, sourcePath, (latest) =>
          updateTimerFrontmatter(latest, { timerStartedAtIso: null }),
        );
      });
    return;
  }

  actions
    .createEl("button", { text: "Start" })
    .addEventListener("click", () => {
      void modifyCurrentNote(plugin, sourcePath, (latest) =>
        updateTimerFrontmatter(latest, {
          timerStartedAtIso: new Date().toISOString(),
        }),
      );
    });
}
