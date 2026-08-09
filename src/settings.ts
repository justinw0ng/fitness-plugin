import { App, Notice, normalizePath, PluginSettingTab, Setting } from "obsidian";
import type FitnessPlugin from "./main";
import { DEFAULT_SETTINGS } from "./types";
import {
  planFitnessMigration,
  rewriteFitnessFences,
} from "./util/migrate-fitness";

export { mergeSettings } from "./util/merge-settings";

export class FitnessSettingTab extends PluginSettingTab {
  plugin: FitnessPlugin;

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

    new Setting(containerEl)
      .setName("Golf cues path")
      .setDesc("Vault-relative path for golf cue rollup note.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.golfCuesPath)
          .setValue(this.plugin.settings.golfCuesPath)
          .onChange(async (value) => {
            this.plugin.settings.golfCuesPath =
              value.trim() || DEFAULT_SETTINGS.golfCuesPath;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Gym cues path")
      .setDesc("Vault-relative path for gym cue rollup note.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.gymCuesPath)
          .setValue(this.plugin.settings.gymCuesPath)
          .onChange(async (value) => {
            this.plugin.settings.gymCuesPath =
              value.trim() || DEFAULT_SETTINGS.gymCuesPath;
            await this.plugin.saveSettings();
          }),
      );

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

    containerEl.createEl("p", {
      text: "Series (folders, labels, colors) use Atomic defaults under atomics/exercise/Gym and atomics/exercise/Golf. Edit plugin data.json advanced series later if needed.",
      cls: "setting-item-description",
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
