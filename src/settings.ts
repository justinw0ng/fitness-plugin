import {
  App,
  Modal,
  Notice,
  PluginSettingTab,
  Setting,
  type ButtonComponent,
  type SettingDefinitionItem,
} from "obsidian";
import type FitnessPlugin from "./main";
import type { ActivityType } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import type { Language } from "./i18n/types";
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

function styleDestructiveButton(button: ButtonComponent): void {
  if (typeof button.setDestructive === "function") {
    button.setDestructive();
    return;
  }
  button.buttonEl.addClass("mod-warning");
}

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
      .addButton((button) => {
        button.setButtonText(this.confirmLabel);
        styleDestructiveButton(button);
        button.onClick(() => {
          this.onConfirm();
          this.close();
        });
      });
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

  /** Fallback for Obsidian < 1.13.0. 1.13+ renders `getSettingDefinitions()`. */
  display(): void {
    this.paintSettings(this.containerEl);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    const language = this.plugin.settings.language;
    const items: SettingDefinitionItem[] = [
      {
        name: t("settings.language", language),
        desc: t("settings.languageDesc", language),
        control: {
          type: "dropdown",
          key: "language",
          options: {
            "zh-Hant-en": t("settings.languageOption.zh-Hant-en", language),
            en: t("settings.languageOption.en", language),
          },
        },
      },
      {
        name: t("settings.timezone", language),
        desc: t("settings.timezoneDesc", language),
        control: {
          type: "text",
          key: "timezone",
          placeholder: "Asia/Hong_Kong",
        },
      },
      {
        name: t("settings.dashboardPath", language),
        desc: t("settings.dashboardPathDesc", language),
        control: {
          type: "text",
          key: "dashboardPath",
          placeholder: DEFAULT_SETTINGS.dashboardPath,
          validate: (value) => {
            const next = value.trim() || DEFAULT_SETTINGS.dashboardPath;
            if (!isSafeVaultFolder(next)) {
              return t("notice.folderUnsafe", this.plugin.settings.language);
            }
          },
        },
      },
      {
        name: t("settings.exerciseTypes", language),
        desc: t("settings.exerciseTypesDesc", language),
        render: (setting) => {
          setting.setHeading();
        },
      },
    ];

    for (const activity of allExerciseActivities(this.plugin.settings.activityTypes)) {
      items.push(...this.activityDefinitionItems(activity, { showCues: true }));
    }

    items.push({
      name: t("settings.addExerciseType", language),
      desc: t("settings.addExerciseTypeDesc", language),
      render: (setting) => {
        this.paintAddActivity(setting, "exercise");
      },
    });

    items.push({
      name: t("settings.hobbyTypes", language),
      desc: t("settings.hobbyTypesDesc", language),
      render: (setting) => {
        setting.setHeading();
      },
    });

    for (const activity of allHobbyActivities(this.plugin.settings.activityTypes)) {
      items.push(...this.activityDefinitionItems(activity, { showCues: false }));
    }

    items.push({
      name: t("settings.addHobbyType", language),
      desc: t("settings.addHobbyTypeDesc", language),
      render: (setting) => {
        this.paintAddActivity(setting, "hobby");
      },
    });

    return items;
  }

  getControlValue(key: string): unknown {
    if (key === "language") return this.plugin.settings.language;
    if (key === "timezone") return this.plugin.settings.timezone;
    if (key === "dashboardPath") return this.plugin.settings.dashboardPath;
    return undefined;
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (key === "language") {
      if (typeof value !== "string" || !isLanguage(value)) return;
      this.plugin.settings.language = value;
      await this.plugin.saveSettings();
      this.redrawSettings();
      await this.plugin.refreshAll();
      new Notice(t("notice.reloadForCommands", value));
      return;
    }
    if (key === "timezone") {
      if (typeof value !== "string") return;
      this.plugin.settings.timezone = value.trim() || "Asia/Hong_Kong";
      await this.plugin.saveSettings();
      void this.plugin.refreshAll();
      return;
    }
    if (key === "dashboardPath") {
      if (typeof value !== "string") return;
      const next = value.trim() || DEFAULT_SETTINGS.dashboardPath;
      if (!isSafeVaultFolder(next)) {
        new Notice(t("notice.folderUnsafe", this.plugin.settings.language));
        return;
      }
      this.plugin.settings.dashboardPath = next;
      await this.plugin.saveSettings();
    }
  }

  private redrawSettings(): void {
    const tab = this as FitnessSettingTab & { update?: () => void };
    if (typeof tab.update === "function") {
      tab.update();
      return;
    }
    this.paintSettings(this.containerEl);
  }

  private paintSettings(containerEl: HTMLElement): void {
    const language = this.plugin.settings.language;
    containerEl.empty();

    this.paintLanguage(new Setting(containerEl), language);
    this.paintTimezone(new Setting(containerEl), language);
    this.paintDashboardPath(new Setting(containerEl), language);

    new Setting(containerEl)
      .setName(t("settings.exerciseTypes", language))
      .setDesc(t("settings.exerciseTypesDesc", language))
      .setHeading();
    for (const activity of allExerciseActivities(this.plugin.settings.activityTypes)) {
      this.paintActivityRows(containerEl, activity, { showCues: true });
    }
    this.paintAddActivity(
      new Setting(containerEl)
        .setName(t("settings.addExerciseType", language))
        .setDesc(t("settings.addExerciseTypeDesc", language)),
      "exercise",
    );

    new Setting(containerEl)
      .setName(t("settings.hobbyTypes", language))
      .setDesc(t("settings.hobbyTypesDesc", language))
      .setHeading();
    for (const activity of allHobbyActivities(this.plugin.settings.activityTypes)) {
      this.paintActivityRows(containerEl, activity, { showCues: false });
    }
    this.paintAddActivity(
      new Setting(containerEl)
        .setName(t("settings.addHobbyType", language))
        .setDesc(t("settings.addHobbyTypeDesc", language)),
      "hobby",
    );
  }

  private paintLanguage(setting: Setting, language: Language): void {
    setting
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
            this.redrawSettings();
            await this.plugin.refreshAll();
            new Notice(t("notice.reloadForCommands", value));
          }),
      );
  }

  private paintTimezone(setting: Setting, language: Language): void {
    setting
      .setName(t("settings.timezone", language))
      .setDesc(t("settings.timezoneDesc", language))
      .addText((text) =>
        text
          .setPlaceholder("Asia/Hong_Kong")
          .setValue(this.plugin.settings.timezone)
          .onChange(async (value) => {
            this.plugin.settings.timezone = value.trim() || "Asia/Hong_Kong";
            await this.plugin.saveSettings();
            void this.plugin.refreshAll();
          }),
      );
  }

  private paintDashboardPath(setting: Setting, language: Language): void {
    setting
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
  }

  private activityDefinitionItems(
    activity: ActivityType,
    options: { showCues: boolean },
  ): SettingDefinitionItem[] {
    const language = this.plugin.settings.language;
    return [
      {
        name: activity.label,
        desc: t("settings.activityId", language, { id: activity.id }),
        aliases: [activity.id],
        render: (setting) => {
          this.paintActivityControls(setting, activity, options);
        },
      },
      {
        name: t("settings.baseColor", language, { label: activity.label }),
        desc: t("settings.baseColorDesc", language),
        aliases: [activity.id, "color"],
        render: (setting) => {
          this.paintColorControls(setting, activity);
        },
      },
    ];
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

  private paintActivityRows(
    containerEl: HTMLElement,
    activity: ActivityType,
    options: { showCues: boolean },
  ): void {
    const language = this.plugin.settings.language;
    this.paintActivityControls(
      new Setting(containerEl)
        .setName(activity.label)
        .setDesc(t("settings.activityId", language, { id: activity.id })),
      activity,
      options,
    );
    this.paintColorControls(
      new Setting(containerEl)
        .setName(t("settings.baseColor", language, { label: activity.label }))
        .setDesc(t("settings.baseColorDesc", language)),
      activity,
    );
  }

  private paintActivityControls(
    setting: Setting,
    activity: ActivityType,
    options: { showCues: boolean },
  ): void {
    const language = this.plugin.settings.language;
    const folderPlaceholder = options.showCues
      ? t("settings.exerciseFolderPlaceholder", language)
      : t("settings.hobbyFolderPlaceholder", language);

    setting
      .setClass("atomic-setting-exercise-type")
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
    setting.settingEl.setAttr("data-testid", "atomic-setting-activity");
    setting.settingEl.setAttr("data-activity-id", activity.id);

    if (options.showCues) {
      setting.addToggle((toggle) =>
        toggle
          .setTooltip(t("settings.enableCuesTooltip", language))
          .setValue(activity.supportsCues)
          .onChange(async (value) => {
            activity.supportsCues = value;
            await this.saveAndRefresh();
          }),
      );
    }

    setting.addButton((button) => {
      button.setButtonText(t("settings.delete", language));
      styleDestructiveButton(button);
      button.onClick(() => {
        this.confirmDeleteActivity(activity);
      });
    });
  }

  private paintColorControls(setting: Setting, activity: ActivityType): void {
    setting
      .setClass("atomic-setting-colors")
      .addColorPicker((picker) =>
        picker.setValue(activity.baseColor || activity.colors[2]).onChange(async (value) => {
          activity.baseColor = value;
          activity.colors = shadesFromBaseColor(value);
          await this.saveAndRefresh();
          this.renderColorSwatches(setting.controlEl, activity);
        }),
      );
    setting.settingEl.setAttr("data-testid", "atomic-setting-colors");
    setting.settingEl.setAttr("data-activity-id", activity.id);
    this.renderColorSwatches(setting.controlEl, activity);
  }

  private paintAddActivity(setting: Setting, kind: "exercise" | "hobby"): void {
    const language = this.plugin.settings.language;
    const isHobby = kind === "hobby";
    setting
      .addText((text) =>
        text
          .setPlaceholder(
            t(
              isHobby
                ? "settings.hobbyNamePlaceholder"
                : "settings.exerciseNamePlaceholder",
              language,
            ),
          )
          .setValue(isHobby ? this.pendingHobbyName : this.pendingExerciseName)
          .onChange((value) => {
            if (isHobby) this.pendingHobbyName = value;
            else this.pendingExerciseName = value;
          }),
      )
      .addButton((button) =>
        button.setButtonText(t("settings.add", language)).onClick(async () => {
          const name = (isHobby ? this.pendingHobbyName : this.pendingExerciseName).trim();
          if (!name) {
            new Notice(
              t(
                isHobby ? "notice.enterHobbyType" : "notice.enterExerciseType",
                this.plugin.settings.language,
              ),
            );
            return;
          }
          const activity = isHobby
            ? createHobbyActivityType(name)
            : createExerciseActivityType(name);
          activity.id = this.uniqueActivityId(activity.id);
          this.plugin.settings.activityTypes = [
            ...this.plugin.settings.activityTypes,
            activity,
          ];
          if (isHobby) this.pendingHobbyName = "";
          else this.pendingExerciseName = "";
          await this.saveAndRefresh();
          this.redrawSettings();
        }),
      );
    if (isHobby) {
      setting.settingEl.setAttr("data-testid", "atomic-setting-add-hobby");
    }
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
    this.redrawSettings();
    new Notice(
      t("notice.activityDeleted", this.plugin.settings.language, {
        label: activity.label,
      }),
    );
  }
}
