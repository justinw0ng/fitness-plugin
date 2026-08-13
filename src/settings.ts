import {
  App,
  Modal,
  Notice,
  PluginSettingTab,
  Setting,
} from "obsidian";
import type FitnessPlugin from "./main";
import type { ActivityType } from "./types";
import { DEFAULT_SETTINGS } from "./types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isLanguage, t } from "./i18n/index.ts";
import {
  allExerciseActivities,
  allHobbyActivities,
  createExerciseActivityType,
  createHobbyActivityType,
} from "./util/activity-types";
import { shadesFromBaseColor } from "./util/colors";
import { isSafeVaultFolder } from "./util/vault-path";

export { mergeSettings } from "./util/merge-settings";

class ConfirmDeleteActivityModal extends Modal {
  private readonly message: string;
  private readonly confirmLabel: string;
  private readonly cancelLabel: string;
  private readonly onConfirm: () => void;

  constructor(
    app: App,
    options: {
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      onConfirm: () => void;
    },
  ) {
    super(app);
    this.message = options.message;
    this.confirmLabel = options.confirmLabel;
    this.cancelLabel = options.cancelLabel;
    this.onConfirm = options.onConfirm;
  }

  onOpen(): void {
    this.modalEl.setAttr("data-testid", "atomic-confirm-delete-modal");
    this.contentEl.empty();
    this.contentEl.createEl("p", { text: this.message });
    new Setting(this.contentEl)
      .addButton((button) =>
        button.setButtonText(this.cancelLabel).onClick(() => this.close()),
      )
      .addButton((button) =>
        button
          .setButtonText(this.confirmLabel)
          .setWarning()
          .onClick(() => {
            this.onConfirm();
            this.close();
          }),
      );
  }
}

export class FitnessSettingTab extends PluginSettingTab {
  plugin: FitnessPlugin;
  private pendingExerciseName = "";
  private pendingHobbyName = "";

  constructor(app: App, plugin: FitnessPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const language = this.plugin.settings.language;
    containerEl.empty();

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
            const next = value.trim() || DEFAULT_SETTINGS.dashboardPath;
            if (!isSafeVaultFolder(next)) {
              new Notice(t("notice.folderUnsafe", this.plugin.settings.language));
              return;
            }
            this.plugin.settings.dashboardPath = next;
            await this.plugin.saveSettings();
          }),
      );

    this.renderExerciseTypes(containerEl);
    this.renderHobbyTypes(containerEl);
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
    new Setting(containerEl)
      .setName(t("settings.exerciseTypes", language))
      .setDesc(t("settings.exerciseTypesDesc", language))
      .setHeading();

    for (const activity of allExerciseActivities(this.plugin.settings.activityTypes)) {
      this.renderActivityRows(containerEl, activity, { showCues: true });
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

  private renderHobbyTypes(containerEl: HTMLElement): void {
    const language = this.plugin.settings.language;
    new Setting(containerEl)
      .setName(t("settings.hobbyTypes", language))
      .setDesc(t("settings.hobbyTypesDesc", language))
      .setHeading();

    for (const activity of allHobbyActivities(this.plugin.settings.activityTypes)) {
      this.renderActivityRows(containerEl, activity, { showCues: false });
    }

    const addHobby = new Setting(containerEl)
      .setName(t("settings.addHobbyType", language))
      .setDesc(t("settings.addHobbyTypeDesc", language))
      .addText((text) =>
        text
          .setPlaceholder(t("settings.hobbyNamePlaceholder", language))
          .setValue(this.pendingHobbyName)
          .onChange((value) => {
            this.pendingHobbyName = value;
          }),
      )
      .addButton((button) =>
        button.setButtonText(t("settings.add", language)).onClick(async () => {
          const name = this.pendingHobbyName.trim();
          if (!name) {
            new Notice(t("notice.enterHobbyType", this.plugin.settings.language));
            return;
          }
          const activity = createHobbyActivityType(name);
          activity.id = this.uniqueActivityId(activity.id);
          this.plugin.settings.activityTypes = [
            ...this.plugin.settings.activityTypes,
            activity,
          ];
          this.pendingHobbyName = "";
          await this.saveAndRefresh();
          this.display();
        }),
      );
    addHobby.settingEl.setAttr("data-testid", "atomic-setting-add-hobby");
  }

  private renderActivityRows(
    containerEl: HTMLElement,
    activity: ActivityType,
    options: { showCues: boolean },
  ): void {
    const language = this.plugin.settings.language;
    const folderPlaceholder = options.showCues
      ? t("settings.exerciseFolderPlaceholder", language)
      : t("settings.hobbyFolderPlaceholder", language);

    const row = new Setting(containerEl)
      .setClass("atomic-setting-exercise-type")
      .setName(activity.label)
      .setDesc(t("settings.activityId", language, { id: activity.id }))
      .addToggle((toggle) =>
        toggle
          .setTooltip(t("settings.enabledTooltip", language))
          .setValue(activity.enabled !== false)
          .onChange(async (value) => {
            activity.enabled = value;
            await this.saveAndRefresh();
          }),
      )
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
          .setPlaceholder(folderPlaceholder)
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
      );
    row.settingEl.setAttr("data-testid", "atomic-setting-activity");
    row.settingEl.setAttr("data-activity-id", activity.id);

    if (options.showCues) {
      row.addToggle((toggle) =>
        toggle
          .setTooltip(t("settings.enableCuesTooltip", language))
          .setValue(activity.supportsCues)
          .onChange(async (value) => {
            activity.supportsCues = value;
            await this.saveAndRefresh();
          }),
      );
    }

    row.addButton((button) =>
      button
        .setButtonText(t("settings.delete", language))
        .setWarning()
        .onClick(() => {
          this.confirmDeleteActivity(activity);
        }),
    );

    const colorSetting = new Setting(containerEl)
      .setClass("atomic-setting-colors")
      .setName(t("settings.baseColor", language, { label: activity.label }))
      .setDesc(t("settings.baseColorDesc", language))
      .addColorPicker((picker) =>
        picker.setValue(activity.baseColor || activity.colors[2]).onChange(async (value) => {
          activity.baseColor = value;
          activity.colors = shadesFromBaseColor(value);
          await this.saveAndRefresh();
          this.renderColorSwatches(colorSetting.controlEl, activity);
        }),
      );
    colorSetting.settingEl.setAttr("data-testid", "atomic-setting-colors");
    colorSetting.settingEl.setAttr("data-activity-id", activity.id);

    this.renderColorSwatches(colorSetting.controlEl, activity);
  }

  private renderColorSwatches(controlEl: HTMLElement, activity: ActivityType): void {
    controlEl.querySelectorAll(".atomic-color-swatch-row").forEach((node) => node.remove());
    const row = controlEl.createDiv({
      cls: "atomic-color-swatch-row",
      attr: { "data-testid": "atomic-color-swatch-row" },
    });
    for (const color of activity.colors) {
      const swatch = row.createDiv({
        cls: "atomic-color-swatch",
        attr: { "data-testid": "atomic-color-swatch" },
      });
      swatch.style.backgroundColor = color;
      swatch.title = color;
    }
  }

  private confirmDeleteActivity(activity: ActivityType): void {
    const language = this.plugin.settings.language;
    new ConfirmDeleteActivityModal(this.app, {
      message: t("settings.deleteConfirm", language, { label: activity.label }),
      confirmLabel: t("settings.delete", language),
      cancelLabel: t("modal.cancel", language),
      onConfirm: () => {
        void this.deleteActivity(activity);
      },
    }).open();
  }

  private async deleteActivity(activity: ActivityType): Promise<void> {
    this.plugin.settings.activityTypes = this.plugin.settings.activityTypes.filter(
      (candidate) => candidate.id !== activity.id,
    );
    await this.saveAndRefresh();
    this.display();
    new Notice(
      t("notice.activityDeleted", this.plugin.settings.language, {
        label: activity.label,
      }),
    );
  }
}
