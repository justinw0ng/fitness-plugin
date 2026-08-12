import { FuzzySuggestModal, Notice, Plugin, TFile } from "obsidian";
import {
  createActivitySession,
  createGolfSession,
  createGymSession,
} from "./commands/create-session";
import { createHobbyItem, createReadingItem } from "./commands/create-reading-item";
import { registerCodeblocks, renderBlock, type LiveBlock } from "./codeblocks";
import { VaultDataSource } from "./data/vault-source";
import {
  createBookShelfHostCommand,
  openBookShelfHostCommand,
} from "./hobbies/book-shelf-host";
import {
  createReadingBookshelfCommand,
  openReadingBookshelfCommand,
} from "./hobbies/reading-bookshelf";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { registerPropertySelects } from "./properties/property-select.ts";
import { FitnessSettingTab, mergeSettings } from "./settings";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t } from "./i18n/index.ts";
import type { ActivityType, FitnessSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { exerciseActivities, hobbyActivities } from "./util/activity-types";
import {
  collectAtomicDataRoots,
  pathAffectsAtomicRefresh,
} from "./util/refresh-path";

const REFRESH_DEBOUNCE_MS = 300;

export default class FitnessPlugin extends Plugin {
  settings: FitnessSettings = DEFAULT_SETTINGS;
  data!: VaultDataSource;
  private liveBlocks: LiveBlock[] = [];
  private refreshTimer: number | null = null;

  async onload() {
    this.data = new VaultDataSource(this.app);
    await this.loadSettings();

    registerCodeblocks(this);
    registerPropertySelects(this, {
      getLanguage: () => this.settings.language,
    });
    this.addSettingTab(new FitnessSettingTab(this.app, this));

    this.addCommand({
      id: "fitness-new-gym-session",
      name: t("command.newGymSession", this.settings.language),
      callback: () => {
        void this.createGymSession();
      },
    });

    this.addCommand({
      id: "fitness-new-golf-session",
      name: t("command.newGolfSession", this.settings.language),
      callback: () => {
        void this.createGolfSession();
      },
    });

    this.addCommand({
      id: "atomic-new-exercise-session",
      name: t("command.newExerciseSession", this.settings.language),
      callback: () => {
        void this.createExerciseSession();
      },
    });

    this.addCommand({
      id: "atomic-new-reading-item",
      name: t("command.newReadingItem", this.settings.language),
      callback: () => {
        void this.createReadingItem();
      },
    });

    this.addCommand({
      id: "atomic-new-hobby-item",
      name: t("command.newHobbyItem", this.settings.language),
      callback: () => {
        void this.createHobbyItem();
      },
    });

    this.addCommand({
      id: "atomic-create-reading-bookshelf",
      name: t("command.createReadingBookshelf", this.settings.language),
      callback: () => {
        if (!this.hobbyActivityById("reading")) {
          new Notice(t("notice.noReadingHobby", this.settings.language));
          return;
        }
        void createReadingBookshelfCommand(this.app, this.data, this.settings.language);
      },
    });

    this.addCommand({
      id: "atomic-open-reading-bookshelf",
      name: t("command.openReadingBookshelf", this.settings.language),
      callback: () => {
        if (!this.hobbyActivityById("reading")) {
          new Notice(t("notice.noReadingHobby", this.settings.language));
          return;
        }
        void openReadingBookshelfCommand(this.app, this.data, this.settings.language);
      },
    });

    this.addCommand({
      id: "atomic-create-book-shelf",
      name: t("command.createBookShelf", this.settings.language),
      callback: () => {
        void createBookShelfHostCommand(this.data, this.settings.language);
      },
    });

    this.addCommand({
      id: "atomic-open-book-shelf",
      name: t("command.openBookShelf", this.settings.language),
      callback: () => {
        void openBookShelfHostCommand(this.data, this.settings.language);
      },
    });

    this.addCommand({
      id: "fitness-open-dashboard",
      name: t("command.openDashboard", this.settings.language),
      callback: () => {
        void this.openDashboard();
      },
    });

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        this.handleVaultPathChange(file.path);
      }),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        this.handleVaultPathChange(file.path);
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.handleVaultPathChange(file.path, oldPath);
      }),
    );
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        this.handleVaultPathChange(file.path);
      }),
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (!(file instanceof TFile)) return;
        this.handleVaultPathChange(file.path);
      }),
    );
    this.registerEvent(
      this.app.metadataCache.on("resolved", () => {
        this.data.invalidateListCache();
        if (this.liveBlocks.some((block) => block.el.isConnected)) {
          this.scheduleRefresh();
        }
      }),
    );
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
    }, REFRESH_DEBOUNCE_MS);
  }

  async refreshAll() {
    this.liveBlocks = this.liveBlocks.filter((b) => b.el.isConnected);
    await Promise.all(
      this.liveBlocks.map((block) => {
        const ctx = {
          sourcePath: block.sourcePath,
        } as Parameters<typeof renderBlock>[4];
        return renderBlock(this, block.kind, block.source, block.el, ctx);
      }),
    );
  }

  private liveBlockSourcePaths(): string[] {
    return this.liveBlocks.map((block) => block.sourcePath);
  }

  private pathAffectsRefresh(path: string): boolean {
    return pathAffectsAtomicRefresh(
      path,
      collectAtomicDataRoots(this.settings),
      this.liveBlockSourcePaths(),
    );
  }

  private handleVaultPathChange(path: string, oldPath?: string) {
    const affectsCurrent =
      this.pathAffectsRefresh(path) ||
      (oldPath != null && this.pathAffectsRefresh(oldPath));
    if (!affectsCurrent) return;

    if (oldPath != null) {
      // Preserve parsed Time log across renames when mtime-aligned cache moves.
      this.data.renameHobbyTimeLogCache(oldPath, path);
    } else {
      this.data.invalidateHobbyTimeLogCache(path);
    }
    this.data.invalidateListCache();
    this.scheduleRefresh();
  }

  exerciseActivityById(id: string): ActivityType | undefined {
    return exerciseActivities(this.settings.activityTypes).find(
      (activity) => activity.id === id,
    );
  }

  hobbyActivityById(id: string): ActivityType | undefined {
    return hobbyActivities(this.settings.activityTypes).find(
      (activity) => activity.id === id,
    );
  }

  private chooseActivity(
    activities: ActivityType[],
    emptyNoticeKey: "notice.noExerciseActivities" | "notice.noHobbyActivities",
    placeholderKey: "modal.exerciseTypePlaceholder" | "modal.hobbyTypePlaceholder",
  ): Promise<ActivityType | null> {
    if (!activities.length) {
      new Notice(t(emptyNoticeKey, this.settings.language));
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      let settled = false;
      const modal = new (class extends FuzzySuggestModal<ActivityType> {
        getItems(): ActivityType[] {
          return activities;
        }

        getItemText(activity: ActivityType): string {
          return activity.label;
        }

        onChooseItem(activity: ActivityType) {
          if (settled) return;
          settled = true;
          resolve(activity);
        }

        onClose() {
          if (settled) return;
          settled = true;
          resolve(null);
        }
      })(this.app);
      modal.setPlaceholder(t(placeholderKey, this.settings.language));
      modal.open();
    });
  }

  private chooseExerciseActivity(): Promise<ActivityType | null> {
    return this.chooseActivity(
      exerciseActivities(this.settings.activityTypes),
      "notice.noExerciseActivities",
      "modal.exerciseTypePlaceholder",
    );
  }

  private chooseHobbyActivity(): Promise<ActivityType | null> {
    return this.chooseActivity(
      hobbyActivities(this.settings.activityTypes),
      "notice.noHobbyActivities",
      "modal.hobbyTypePlaceholder",
    );
  }

  async createExerciseSession(activity?: ActivityType) {
    const picked = activity ?? (await this.chooseExerciseActivity());
    if (!picked) return;
    await createActivitySession(
      this.app,
      this.data,
      picked,
      this.settings.timezone,
      this.settings.language,
    );
  }

  async createGymSession() {
    const activity = this.exerciseActivityById("gym");
    if (!activity) {
      new Notice(t("notice.noGymActivity", this.settings.language));
      return;
    }
    await createGymSession(
      this.app,
      this.data,
      activity,
      this.settings.timezone,
      this.settings.language,
    );
  }

  async createGolfSession() {
    const activity = this.exerciseActivityById("golf");
    if (!activity) {
      new Notice(t("notice.noGolfActivity", this.settings.language));
      return;
    }
    await createGolfSession(
      this.app,
      this.data,
      activity,
      this.settings.timezone,
      this.settings.language,
    );
  }

  async createReadingItem() {
    const activity = this.hobbyActivityById("reading");
    if (!activity) {
      new Notice(t("notice.noReadingHobby", this.settings.language));
      return;
    }
    await createReadingItem(this.app, this.data, activity, this.settings.language);
  }

  async createHobbyItem(activity?: ActivityType) {
    const picked = activity ?? (await this.chooseHobbyActivity());
    if (!picked) return;
    await createHobbyItem(this.app, this.data, picked, this.settings.language);
  }

  async openDashboard() {
    const path = this.settings.dashboardPath;
    if (!this.data.exists(path)) {
      new Notice(t("notice.dashboardNotFound", this.settings.language, { path }));
      return;
    }
    await this.data.openPath(path);
  }
}

// re-export for type-only consumers
export type { FitnessSettings };
