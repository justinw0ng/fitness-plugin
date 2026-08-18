import { App, Modal, Notice, Setting } from "obsidian";
import type FitnessPlugin from "../main";
import {
  CUSTOM_MUSCLE_SENTINEL,
  insertGymLogFence,
  isGymLogMigrationTarget,
  mergeGymExercises,
  planGymLogSetup,
  type GymExercisePair,
  type SetTableHeaders,
} from "../core/gym-log";
import { MUSCLES } from "../core";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import { defaultAtomicBlockFence } from "../util/codeblock-defaults";

export function gymSetTableHeaders(language: Language): SetTableHeaders {
  return {
    exercise: t("template.gymTable.exercise", language),
    muscle: t("template.gymTable.muscle", language),
    weight: t("template.gymTable.weight", language),
    reps: t("template.gymTable.reps", language),
    notes: t("template.gymTable.notes", language),
  };
}

export function muscleLabel(muscle: string, language: Language): string {
  const key = `muscle.${muscle}`;
  const translated = t(key, language);
  return translated === key ? muscle : translated;
}

export async function applyGymLogSetup(
  plugin: FitnessPlugin,
): Promise<{ pairs: number; notes: number }> {
  const language = plugin.settings.language;
  const fence = defaultAtomicBlockFence("atomic-gym-log", language);
  const headers = gymSetTableHeaders(language);
  const paths: string[] = [];
  for (const activity of plugin.settings.activityTypes) {
    if (!activity.supportsSetTable) continue;
    for (const file of plugin.data.listMarkdownInFolder(activity.folder)) {
      if (!isGymLogMigrationTarget(file.path)) continue;
      paths.push(file.path);
    }
  }
  const files = await Promise.all(
    paths.map(async (path) => ({
      path,
      markdown: await plugin.data.readBody(path),
    })),
  );
  const plan = planGymLogSetup(files, fence, headers);
  await Promise.all(
    plan.notes.map((note) =>
      plugin.data.processNote(note.path, (current) => {
        const latest = insertGymLogFence(current, fence, headers);
        return latest.changed ? latest.markdown : current;
      }),
    ),
  );
  plugin.settings.gymExercises = mergeGymExercises(
    plugin.settings.gymExercises,
    plan.pairs,
  );
  plugin.settings.gymLogSetup = "complete";
  await plugin.saveSettings();
  plugin.scheduleRefresh();
  return {
    pairs: plugin.settings.gymExercises.length,
    notes: plan.notes.length,
  };
}

export async function runGymLogSetup(
  plugin: FitnessPlugin,
): Promise<boolean> {
  const language = plugin.settings.language;
  try {
    const result = await applyGymLogSetup(plugin);
    new Notice(
      t("notice.gymLogSetupComplete", language, {
        pairs: result.pairs,
        notes: result.notes,
      }),
    );
    return true;
  } catch (error) {
    console.error("Gym set log setup failed", error);
    new Notice(
      t("notice.gymLogSetupFailed", language, {
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return false;
  }
}

export function promptGymLogSetup(plugin: FitnessPlugin): void {
  if (plugin.settings.gymLogSetup !== "pending") return;
  new GymLogSetupModal(plugin).open();
}

export function promptNewGymExercise(
  plugin: FitnessPlugin,
): Promise<GymExercisePair | null> {
  return new Promise((resolve) => {
    const modal = new NewGymExerciseModal(plugin.app, plugin.settings.language, (pair) => {
      resolve(pair);
    });
    modal.open();
  });
}

class GymLogSetupModal extends Modal {
  constructor(private readonly plugin: FitnessPlugin) {
    super(plugin.app);
  }

  onOpen(): void {
    const language = this.plugin.settings.language;
    this.modalEl.setAttr("data-testid", "atomic-gym-log-setup-modal");
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: t("modal.gymSetupTitle", language) });
    contentEl.createEl("p", { text: t("modal.gymSetupBody", language) });
    new Setting(contentEl)
      .addButton((button) => {
        button.setButtonText(t("modal.gymSetupLater", language));
        button.buttonEl.setAttr("data-testid", "atomic-gym-log-setup-later");
        button.onClick(() => {
          void this.skip();
        });
      })
      .addButton((button) => {
        button.setButtonText(t("modal.gymSetupConfirm", language));
        button.setCta();
        button.buttonEl.setAttr("data-testid", "atomic-gym-log-setup-confirm");
        button.onClick(() => {
          void this.confirm();
        });
      });
  }

  private async skip(): Promise<void> {
    this.plugin.settings.gymLogSetup = "skipped";
    await this.plugin.saveSettings();
    new Notice(t("notice.gymLogSetupLater", this.plugin.settings.language));
    this.close();
  }

  private async confirm(): Promise<void> {
    this.close();
    await runGymLogSetup(this.plugin);
  }
}

class NewGymExerciseModal extends Modal {
  private exercise = "";
  private muscle = MUSCLES[0] ?? "Chest";
  private customMuscle = "";
  private customMuscleRow: HTMLElement | null = null;
  private resolved = false;

  constructor(
    app: App,
    private readonly language: Language,
    private readonly onFinish: (pair: GymExercisePair | null) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.setAttr("data-testid", "atomic-gym-new-exercise-modal");
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: t("modal.gymNewExerciseTitle", this.language) });

    new Setting(contentEl)
      .setName(t("modal.gymExerciseName", this.language))
      .addText((text) => {
        text.inputEl.setAttr("data-testid", "atomic-gym-new-exercise-name");
        text.inputEl.setCssStyles({ width: "100%" });
        text.onChange((value) => {
          this.exercise = value;
        });
        window.setTimeout(() => text.inputEl.focus(), 20);
      });

    new Setting(contentEl)
      .setName(t("modal.gymMuscle", this.language))
      .addDropdown((dropdown) => {
        dropdown.selectEl.setAttr("data-testid", "atomic-gym-new-exercise-muscle");
        for (const muscle of MUSCLES) {
          dropdown.addOption(muscle, muscleLabel(muscle, this.language));
        }
        dropdown.addOption(
          CUSTOM_MUSCLE_SENTINEL,
          t("view.gymLog.customMuscle", this.language),
        );
        dropdown.setValue(this.muscle);
        dropdown.onChange((value) => {
          this.muscle = value;
          this.syncCustomMuscleVisibility();
        });
      });

    const customSetting = new Setting(contentEl)
      .setName(t("modal.gymCustomMuscle", this.language))
      .addText((text) => {
        text.inputEl.setAttr("data-testid", "atomic-gym-new-exercise-muscle-custom");
        text.setValue(this.customMuscle);
        text.onChange((value) => {
          this.customMuscle = value;
        });
      });
    customSetting.settingEl.setAttr(
      "data-testid",
      "atomic-gym-new-exercise-muscle-custom-row",
    );
    this.customMuscleRow = customSetting.settingEl;
    this.syncCustomMuscleVisibility();

    new Setting(contentEl)
      .addButton((button) =>
        button
          .setButtonText(t("modal.cancel", this.language))
          .onClick(() => this.finish(null)),
      )
      .addButton((button) =>
        button
          .setButtonText(t("modal.ok", this.language))
          .setCta()
          .onClick(() => this.submit()),
      );
  }

  private syncCustomMuscleVisibility(): void {
    if (!this.customMuscleRow) return;
    this.customMuscleRow.toggleClass(
      "atomic-gym-custom-muscle-hidden",
      this.muscle !== CUSTOM_MUSCLE_SENTINEL,
    );
  }

  private submit(): void {
    const exercise = this.exercise.trim();
    if (!exercise) {
      new Notice(t("notice.gymLogEmptyExercise", this.language));
      return;
    }
    const muscle =
      this.muscle === CUSTOM_MUSCLE_SENTINEL
        ? this.customMuscle.trim()
        : this.muscle.trim();
    if (!muscle) {
      new Notice(t("notice.gymLogEmptyMuscle", this.language));
      return;
    }
    this.finish({ exercise, muscle });
  }

  private finish(pair: GymExercisePair | null): void {
    if (this.resolved) return;
    this.resolved = true;
    this.close();
    this.onFinish(pair);
  }

  onClose(): void {
    if (this.resolved) return;
    this.resolved = true;
    this.onFinish(null);
  }
}
