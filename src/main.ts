import { Notice, Plugin } from "obsidian";
import {
  createGolfSession,
  createGymSession,
} from "./commands/create-session";
import { registerCodeblocks, renderBlock, type LiveBlock } from "./codeblocks";
import { VaultDataSource } from "./data/vault-source";
import { FitnessSettingTab, mergeSettings } from "./settings";
import type { FitnessSettings, SeriesConfig } from "./types";
import { DEFAULT_SETTINGS } from "./types";

export default class FitnessPlugin extends Plugin {
  settings: FitnessSettings = DEFAULT_SETTINGS;
  data!: VaultDataSource;
  private liveBlocks: LiveBlock[] = [];
  private refreshTimer: number | null = null;

  async onload() {
    this.data = new VaultDataSource(this.app);
    await this.loadSettings();

    registerCodeblocks(this);
    this.addSettingTab(new FitnessSettingTab(this.app, this));

    this.addCommand({
      id: "fitness-new-gym-session",
      name: "New gym session",
      callback: () => {
        void this.createGymSession();
      },
    });

    this.addCommand({
      id: "fitness-new-golf-session",
      name: "New golf session",
      callback: () => {
        void this.createGolfSession();
      },
    });

    this.addCommand({
      id: "fitness-open-dashboard",
      name: "Open dashboard",
      callback: () => {
        void this.openDashboard();
      },
    });

    const schedule = () => this.scheduleRefresh();
    this.registerEvent(this.app.vault.on("create", schedule));
    this.registerEvent(this.app.vault.on("modify", schedule));
    this.registerEvent(this.app.vault.on("delete", schedule));
    this.registerEvent(this.app.vault.on("rename", schedule));
    this.registerEvent(this.app.metadataCache.on("resolved", schedule));
  }

  onunload() {
    this.liveBlocks = [];
    if (this.refreshTimer != null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  async loadSettings() {
    this.settings = mergeSettings(await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  trackLiveBlock(block: LiveBlock) {
    // Drop detached elements
    this.liveBlocks = this.liveBlocks.filter((b) => b.el.isConnected);
    // Replace if same el re-processed
    this.liveBlocks = this.liveBlocks.filter((b) => b.el !== block.el);
    this.liveBlocks.push(block);
  }

  scheduleRefresh() {
    if (this.refreshTimer != null) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refreshAll();
    }, 200);
  }

  async refreshAll() {
    this.liveBlocks = this.liveBlocks.filter((b) => b.el.isConnected);
    for (const block of this.liveBlocks) {
      const ctx = {
        sourcePath: block.sourcePath,
      } as Parameters<typeof renderBlock>[4];
      await renderBlock(this, block.kind, block.source, block.el, ctx);
    }
  }

  seriesByKind(kind: SeriesConfig["kind"]): SeriesConfig | undefined {
    return this.settings.series.find((s) => s.kind === kind);
  }

  async createGymSession() {
    const series = this.seriesByKind("gym");
    if (!series) {
      new Notice("No gym series configured");
      return;
    }
    await createGymSession(
      this.app,
      this.data,
      series,
      this.settings.timezone,
    );
  }

  async createGolfSession() {
    const series = this.seriesByKind("golf");
    if (!series) {
      new Notice("No golf series configured");
      return;
    }
    await createGolfSession(
      this.app,
      this.data,
      series,
      this.settings.timezone,
    );
  }

  async openDashboard() {
    const path = this.settings.dashboardPath;
    if (!this.data.exists(path)) {
      new Notice(`Dashboard not found: ${path}`);
      return;
    }
    await this.data.openPath(path);
  }
}

// re-export for type-only consumers
export type { FitnessSettings };
