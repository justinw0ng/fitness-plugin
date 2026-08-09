import { FuzzySuggestModal, Notice, Plugin } from "obsidian";
import {
  createActivitySession,
  createGolfSession,
  createGymSession,
} from "./commands/create-session";
import { createReadingItem } from "./commands/create-reading-item";
import { registerCodeblocks, renderBlock, type LiveBlock } from "./codeblocks";
import { VaultDataSource } from "./data/vault-source";
import {
  ensureBookShelfHostCommand,
  openBookShelfHostCommand,
} from "./hobbies/book-shelf-host";
import {
  ensureReadingBookshelfCommand,
  openReadingBookshelfCommand,
} from "./hobbies/reading-bookshelf";
import { FitnessSettingTab, mergeSettings } from "./settings";
import type { ActivityType, FitnessSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { exerciseActivities, hobbyActivities } from "./util/activity-types";

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
      id: "atomic-new-exercise-session",
      name: "New exercise session",
      callback: () => {
        void this.createExerciseSession();
      },
    });

    this.addCommand({
      id: "atomic-new-reading-item",
      name: "New reading item",
      callback: () => {
        void this.createReadingItem();
      },
    });

    this.addCommand({
      id: "atomic-ensure-reading-bookshelf",
      name: "Ensure reading bookshelf",
      callback: () => {
        void ensureReadingBookshelfCommand(this.app, this.data);
      },
    });

    this.addCommand({
      id: "atomic-open-reading-bookshelf",
      name: "Open reading bookshelf",
      callback: () => {
        void openReadingBookshelfCommand(this.app, this.data);
      },
    });

    this.addCommand({
      id: "atomic-ensure-book-shelf",
      name: "Ensure book shelf",
      callback: () => {
        void ensureBookShelfHostCommand(this.data);
      },
    });

    this.addCommand({
      id: "atomic-open-book-shelf",
      name: "Open book shelf",
      callback: () => {
        void openBookShelfHostCommand(this.data);
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

  private chooseExerciseActivity(): Promise<ActivityType | null> {
    const activities = exerciseActivities(this.settings.activityTypes);
    if (!activities.length) {
      new Notice("No exercise activities configured");
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
      modal.setPlaceholder("Exercise type / 運動類型");
      modal.open();
    });
  }

  async createExerciseSession(activity?: ActivityType) {
    const picked = activity ?? (await this.chooseExerciseActivity());
    if (!picked) return;
    await createActivitySession(
      this.app,
      this.data,
      picked,
      this.settings.timezone,
    );
  }

  async createGymSession() {
    const activity = this.exerciseActivityById("gym");
    if (!activity) {
      new Notice("No gym activity configured");
      return;
    }
    await createGymSession(
      this.app,
      this.data,
      activity,
      this.settings.timezone,
    );
  }

  async createGolfSession() {
    const activity = this.exerciseActivityById("golf");
    if (!activity) {
      new Notice("No golf activity configured");
      return;
    }
    await createGolfSession(
      this.app,
      this.data,
      activity,
      this.settings.timezone,
    );
  }

  async createReadingItem() {
    const activity = this.hobbyActivityById("reading");
    if (!activity) {
      new Notice("No Reading hobby configured");
      return;
    }
    await createReadingItem(this.app, this.data, activity);
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
