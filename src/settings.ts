import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type FitnessPlugin from "./main";
import { DEFAULT_SETTINGS } from "./types";
import { rewriteFitnessCuesFences } from "./util/migrate-cues";

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
    containerEl.createEl("h2", { text: "Fitness" });

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
          .setPlaceholder("Fitness/Dashboard.md")
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
          .setPlaceholder("Golf/Cues.md")
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
          .setPlaceholder("Gym/Cues.md")
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
      .setName("Migrate legacy cue blocks")
      .setDesc("Rewrite vault code fences from fitness-cues to fitness-golf-cues.")
      .addButton((button) =>
        button
          .setButtonText("Migrate `fitness-cues` → `fitness-golf-cues`")
          .setCta()
          .onClick(() => {
            void this.migrateFitnessCuesFences();
          }),
      );

    containerEl.createEl("p", {
      text: "Series (folders, labels, colors) use defaults: Gym + Golf. Edit plugin data.json advanced series later if needed.",
      cls: "setting-item-description",
    });
  }

  private async migrateFitnessCuesFences(): Promise<void> {
    let changedFiles = 0;
    let replacements = 0;

    try {
      for (const file of this.app.vault.getMarkdownFiles()) {
        const original = await this.app.vault.read(file);
        const result = rewriteFitnessCuesFences(original);
        if (result.replacements === 0) continue;

        await this.app.vault.modify(file, result.markdown);
        changedFiles += 1;
        replacements += result.replacements;
      }

      this.plugin.settings.deprecatedFitnessBlocksEnabled = false;
      await this.plugin.saveSettings();
      this.plugin.refreshAll();
      this.display();
      new Notice(
        `Migrated ${replacements} fitness-cues block${replacements === 1 ? "" : "s"} in ${changedFiles} file${changedFiles === 1 ? "" : "s"}. Legacy fitness-cues disabled. Reload the plugin (or Obsidian) to drop the legacy processor.`,
      );
    } catch (err) {
      console.error("Fitness cues migration failed", err);
      const message = err instanceof Error ? err.message : String(err);
      new Notice(`Failed to migrate fitness-cues blocks: ${message}`);
    }
  }
}
