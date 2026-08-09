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
import { isLanguage, t } from "./i18n";
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
    const language = this.plugin.settings.language;
    containerEl.empty();
    containerEl.createEl("h2", { text: t("settings.title", language) });

    new Setting(containerEl)
      .setName(t("settings.language", language))
      .setDesc(t("settings.languageDesc", language))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("zh-Hant-en", t("settings.languageOption.zh-Hant-en", language))
          .addOption("en", t("settings.languageOption.en", language))
          .setValue(language)
          .onChange(async (value) => {
            if (!isLanguage(value)) return;
            this.plugin.settings.language = value;
            await this.plugin.saveSettings();
            this.display();
            await this.plugin.refreshAll();
            new Notice(t("notice.reloadForCommands", value));
          }),
      );

    new Setting(containerEl)
      .setName(t("settings.timezone", language))
      .setDesc(t("settings.timezoneDesc", language))
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
      .setName(t("settings.dashboardPath", language))
      .setDesc(t("settings.dashboardPathDesc", language))
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
      .setName(t("settings.legacyBlocks", language))
      .setDesc(t("settings.legacyBlocksDesc", language))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.deprecatedFitnessBlocksEnabled)
          .onChange(async (value) => {
            this.plugin.settings.deprecatedFitnessBlocksEnabled = value;
            await this.plugin.saveSettings();
            this.plugin.refreshAll();
            new Notice(t("notice.legacyBlocksSaved", this.plugin.settings.language));
          }),
      );

    new Setting(containerEl)
      .setName(t("settings.migrateFitness", language))
      .setDesc(t("settings.migrateFitnessDesc", language))
      .addButton((button) =>
        button
          .setButtonText(t("settings.migrateFitness", language))
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
    const language = this.plugin.settings.language;
    containerEl.createEl("h3", { text: t("settings.exerciseTypes", language) });
    containerEl.createEl("p", {
      text: t("settings.exerciseTypesDesc", language),
      cls: "setting-item-description",
    });

    for (const activity of exerciseActivities(this.plugin.settings.activityTypes)) {
      this.renderExerciseType(containerEl, activity);
    }

    new Setting(containerEl)
      .setName(t("settings.addExerciseType", language))
      .setDesc(t("settings.addExerciseTypeDesc", language))
      .addText((text) =>
        text
          .setPlaceholder(t("settings.exerciseNamePlaceholder", language))
          .setValue(this.pendingExerciseName)
          .onChange((value) => {
            this.pendingExerciseName = value;
          }),
      )
      .addButton((button) =>
        button.setButtonText(t("settings.add", language)).onClick(async () => {
          const name = this.pendingExerciseName.trim();
          if (!name) {
            new Notice(t("notice.enterExerciseType", this.plugin.settings.language));
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
    const language = this.plugin.settings.language;
    new Setting(containerEl)
      .setName(activity.label)
      .setDesc(t("settings.activityId", language, { id: activity.id }))
      .addText((text) =>
        text
          .setPlaceholder(t("settings.labelPlaceholder", language))
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
          .setPlaceholder(t("settings.exerciseFolderPlaceholder", language))
          .setValue(activity.folder)
          .onChange(async (value) => {
            const folder = value.trim();
            if (!isSafeVaultFolder(folder)) {
              new Notice(t("notice.folderUnsafe", this.plugin.settings.language));
              return;
            }
            activity.folder = folder;
            await this.saveAndRefresh();
          }),
      )
      .addToggle((toggle) =>
        toggle
          .setTooltip(t("settings.enableCuesTooltip", language))
          .setValue(activity.supportsCues)
          .onChange(async (value) => {
            activity.supportsCues = value;
            await this.saveAndRefresh();
          }),
      );

    new Setting(containerEl)
      .setName(t("settings.colors", language, { label: activity.label }))
      .setDesc(t("settings.colorsDesc", language))
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
    const language = this.plugin.settings.language;
    text
      .setPlaceholder(t("settings.colorPlaceholder", language, { number: index + 1 }))
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
        t("notice.migrationComplete", this.plugin.settings.language, {
          movedPaths,
          pathWord: movedPaths === 1 ? "path" : "paths",
          skippedPaths,
          destinationWord: skippedPaths === 1 ? "destination" : "destinations",
          replacements,
          blockWord: replacements === 1 ? "block" : "blocks",
          changedFiles,
          fileWord: changedFiles === 1 ? "file" : "files",
        }),
      );
    } catch (err) {
      console.error("Fitness to Atomic migration failed", err);
      const message = err instanceof Error ? err.message : String(err);
      new Notice(
        t("notice.migrationFailed", this.plugin.settings.language, { message }),
      );
    }
  }
}
