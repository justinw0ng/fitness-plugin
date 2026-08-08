import { App, PluginSettingTab, Setting } from "obsidian";
import type FitnessPlugin from "./main";
import { DEFAULT_SETTINGS, type FitnessSettings, type SeriesConfig } from "./types";
import { isSafeVaultFolder } from "./util/vault-path";

function sanitizeSeries(
  series: SeriesConfig[] | undefined,
  fallback: SeriesConfig[],
): SeriesConfig[] {
  if (!Array.isArray(series) || series.length === 0) return fallback;
  const safe = series.filter(
    (s) =>
      s != null &&
      typeof s.folder === "string" &&
      isSafeVaultFolder(s.folder),
  );
  return safe.length > 0 ? safe : fallback;
}

export function mergeSettings(
  raw: Partial<FitnessSettings> | null | undefined,
): FitnessSettings {
  const base = { ...DEFAULT_SETTINGS };
  if (!raw) return base;
  return {
    timezone: raw.timezone || base.timezone,
    dashboardPath: raw.dashboardPath || base.dashboardPath,
    cuesPath: raw.cuesPath || base.cuesPath,
    series: sanitizeSeries(raw.series, base.series),
  };
}

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
      .setName("Cues path")
      .setDesc("Vault-relative path for golf cue rollup note.")
      .addText((text) =>
        text
          .setPlaceholder("Golf/Cues.md")
          .setValue(this.plugin.settings.cuesPath)
          .onChange(async (value) => {
            this.plugin.settings.cuesPath =
              value.trim() || DEFAULT_SETTINGS.cuesPath;
            await this.plugin.saveSettings();
          }),
      );

    containerEl.createEl("p", {
      text: "Series (folders, labels, colors) use defaults: Gym + Golf. Edit plugin data.json advanced series later if needed.",
      cls: "setting-item-description",
    });
  }
}
