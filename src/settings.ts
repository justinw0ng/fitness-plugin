import {
  App,
  Notice,
  normalizePath,
  PluginSettingTab,
  Setting,
  type TextComponent,
} from "obsidian";
import type FitnessPlugin from "./main";
import type { ActivityType } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import {
  planFitnessMigration,
  rewriteFitnessFences,
} from "./util/migrate-fitness";
import { createExerciseActivityType, exerciseActivities } from "./util/activity-types";
import { isSafeVaultFolder } from "./util/vault-path";

export { mergeSettings } from "./util/merge-settings";

export class FitnessSettingTab extends PluginSettingTab {
  plugin: FitnessPlugin;
  private pendingExerciseName = "";

  constructor(app: App, plugin: FitnessPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Atomic" });

    new Setting(containerEl)
      .setName("Timezone")
      .setDesc("IANA timezone for “today” and session dates (e.g. Asia/Hong_Kong).")
      .addText((text) =>
        text
          .setPlaceholder("Asia/Hong_Kong")
          .setValue(this.plugin.settings.timezone)
          .onChange(async (value) => {
            this.plugin.settings.timezone = value.trim() || "Asia/Hong_Kong";
            await this.plugin.saveSettings();
            this.plugin.refreshAll();
          }),
      );

    new Setting(containerEl)
      .setName("Dashboard path")
      .setDesc("Vault-relative path opened by “Open dashboard”.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.dashboardPath)
          .setValue(this.plugin.settings.dashboardPath)
          .onChange(async (value) => {
            this.plugin.settings.dashboardPath =
              value.trim() || DEFAULT_SETTINGS.dashboardPath;
            await this.plugin.saveSettings();
          }),
      );

    this.renderExerciseTypes(containerEl);

    new Setting(containerEl)
      .setName("Allow legacy `fitness-*` blocks")
      .setDesc(
        "Keep supporting old Fitness codeblock names. Turn off after migrating notes (or use Migrate).",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.deprecatedFitnessBlocksEnabled)
          .onChange(async (value) => {
            this.plugin.settings.deprecatedFitnessBlocksEnabled = value;
            await this.plugin.saveSettings();
            this.plugin.refreshAll();
            new Notice(
              "Legacy fitness-* setting saved. Reload the plugin (or Obsidian) to apply registration.",
            );
          }),
      );

    new Setting(containerEl)
      .setName("Migrate from Fitness → Atomic")
      .setDesc(
        "Move legacy Fitness dashboard/Gym/Golf paths, rewrite fitness-* fences to atomic-*, update settings, and disable legacy aliases.",
      )
      .addButton((button) =>
        button
          .setButtonText("Migrate from Fitness → Atomic")
          .setCta()
          .onClick(() => {
            void this.migrateFromFitnessToAtomic();
          }),
      );

  }

  private async saveAndRefresh(): Promise<void> {
    await this.plugin.saveSettings();
    await this.plugin.refreshAll();
  }

  private uniqueActivityId(baseId: string): string {
    const used = new Set(this.plugin.settings.activityTypes.map((activity) => activity.id));
    if (!used.has(baseId)) return baseId;
    let index = 2;
    while (used.has(`${baseId}-${index}`)) index += 1;
    return `${baseId}-${index}`;
  }

  private renderExerciseTypes(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "Exercise types" });
    containerEl.createEl("p", {
      text: "Exercise sessions live in each activity folder. New exercise types default under atomics/exercise/<Name>.",
      cls: "setting-item-description",
    });

    for (const activity of exerciseActivities(this.plugin.settings.activityTypes)) {
      this.renderExerciseType(containerEl, activity);
    }

    new Setting(containerEl)
      .setName("Add exercise type")
      .setDesc("Creates a daily-session exercise with cues enabled and no set table.")
      .addText((text) =>
        text
          .setPlaceholder("Running")
          .setValue(this.pendingExerciseName)
          .onChange((value) => {
            this.pendingExerciseName = value;
          }),
      )
      .addButton((button) =>
        button.setButtonText("Add").onClick(async () => {
          const name = this.pendingExerciseName.trim();
          if (!name) {
            new Notice("Enter an exercise type name first.");
            return;
          }
          const activity = createExerciseActivityType(name);
          activity.id = this.uniqueActivityId(activity.id);
          this.plugin.settings.activityTypes = [
            ...this.plugin.settings.activityTypes,
            activity,
          ];
          this.pendingExerciseName = "";
          await this.saveAndRefresh();
          this.display();
        }),
      );
  }

  private renderExerciseType(containerEl: HTMLElement, activity: ActivityType): void {
    new Setting(containerEl)
      .setName(activity.label)
      .setDesc(`Activity id: ${activity.id}`)
      .addText((text) =>
        text
          .setPlaceholder("Label")
          .setValue(activity.label)
          .onChange(async (value) => {
            const label = value.trim();
            if (!label) return;
            activity.label = label;
            await this.saveAndRefresh();
          }),
      )
      .addText((text) =>
        text
          .setPlaceholder("atomics/exercise/Name")
          .setValue(activity.folder)
          .onChange(async (value) => {
            const folder = value.trim();
            if (!isSafeVaultFolder(folder)) {
              new Notice("Folder must be a safe vault-relative path.");
              return;
            }
            activity.folder = folder;
            await this.saveAndRefresh();
          }),
      )
      .addToggle((toggle) =>
        toggle
          .setTooltip("Enable reminder/cue rollups for this exercise")
          .setValue(activity.supportsCues)
          .onChange(async (value) => {
            activity.supportsCues = value;
            await this.saveAndRefresh();
          }),
      );

    new Setting(containerEl)
      .setName(`${activity.label} colors`)
      .setDesc("Heatmap colors from low to high intensity.")
      .addText((text) => this.bindColorText(text, activity, 0))
      .addText((text) => this.bindColorText(text, activity, 1))
      .addText((text) => this.bindColorText(text, activity, 2))
      .addText((text) => this.bindColorText(text, activity, 3));
  }

  private bindColorText(
    text: TextComponent,
    activity: ActivityType,
    index: 0 | 1 | 2 | 3,
  ): void {
    text
      .setPlaceholder(`#${index + 1}`)
      .setValue(activity.colors[index])
      .onChange(async (value) => {
        const color = value.trim();
        if (!color) return;
        activity.colors[index] = color;
        await this.saveAndRefresh();
      });
  }

  private async ensureParentFolder(path: string): Promise<void> {
    const normalized = normalizePath(path);
    const slash = normalized.lastIndexOf("/");
    if (slash <= 0) return;
    await this.plugin.data.ensureFolder(normalized.slice(0, slash));
  }

  private async migrateFromFitnessToAtomic(): Promise<void> {
    const existingPaths = new Set(
      this.app.vault.getAllLoadedFiles().map((file) => file.path),
    );
    const plan = planFitnessMigration({
      existingPaths,
      settings: this.plugin.settings,
    });
    let movedPaths = 0;
    let skippedPaths = plan.skippedMoves.length;
    let changedFiles = 0;
    let replacements = 0;

    try {
      for (const move of plan.moves) {
        const from = normalizePath(move.from);
        const to = normalizePath(move.to);
        const source = this.app.vault.getAbstractFileByPath(from);
        const destination = this.app.vault.getAbstractFileByPath(to);
        if (!source || destination) {
          skippedPaths += 1;
          continue;
        }

        await this.ensureParentFolder(to);
        await this.app.vault.rename(source, to);
        movedPaths += 1;
      }

      for (const file of this.app.vault.getMarkdownFiles()) {
        const original = await this.app.vault.read(file);
        const result = rewriteFitnessFences(original);
        if (result.replacements === 0) continue;

        await this.app.vault.modify(file, result.markdown);
        changedFiles += 1;
        replacements += result.replacements;
      }

      Object.assign(this.plugin.settings, plan.settingsPatch);
      this.plugin.settings.deprecatedFitnessBlocksEnabled = false;
      await this.plugin.saveSettings();
      this.plugin.refreshAll();
      this.display();
      new Notice(
        `Migrated Fitness → Atomic: moved ${movedPaths} path${movedPaths === 1 ? "" : "s"}, skipped ${skippedPaths} existing destination${skippedPaths === 1 ? "" : "s"}, rewrote ${replacements} block${replacements === 1 ? "" : "s"} in ${changedFiles} file${changedFiles === 1 ? "" : "s"}. Legacy fitness-* aliases disabled; reload the plugin (or Obsidian) to drop registered legacy processors.`,
      );
    } catch (err) {
      console.error("Fitness to Atomic migration failed", err);
      const message = err instanceof Error ? err.message : String(err);
      new Notice(`Failed to migrate from Fitness to Atomic: ${message}`);
    }
  }
}
