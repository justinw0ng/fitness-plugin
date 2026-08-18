import { Notice } from "obsidian";
import type FitnessPlugin from "../main";
import {
  appendSetRow,
  gymExercisePairLabel,
  gymExercisePairValue,
  mergeGymExercises,
  NEW_EXERCISE_SENTINEL,
  parseGymExercisePairValue,
} from "../core/gym-log";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t } from "../i18n/index.ts";
import {
  gymSetTableHeaders,
  promptNewGymExercise,
} from "../commands/gym-log-setup";

export async function renderAtomicGymLog(
  plugin: FitnessPlugin,
  el: HTMLElement,
  sourcePath: string,
): Promise<void> {
  el.empty();
  const language = plugin.settings.language;
  const root = el.createDiv({
    cls: "fitness-plugin atomic-gym-log",
    attr: { "data-testid": "atomic-gym-log" },
  });
  if (!sourcePath) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.gymLog.needsSession", language),
    });
    return;
  }

  const catalog = plugin.settings.gymExercises;
  if (!catalog.length) {
    root.createEl("p", {
      cls: "fitness-muted atomic-gym-log-empty",
      text: t("view.gymLog.emptyCatalog", language),
    });
  }

  const form = root.createDiv({ cls: "atomic-gym-log-row" });
  const select = addField(form, t("view.gymLog.exercise", language)).createEl("select", {
    cls: "dropdown",
    attr: {
      "data-testid": "atomic-gym-log-exercise",
      "aria-label": t("view.gymLog.exercise", language),
    },
  });
  select.createEl("option", {
    text: t("view.gymLog.exercise", language),
    value: "",
  });
  for (const pair of catalog) {
    select.createEl("option", {
      text: gymExercisePairLabel(pair),
      value: gymExercisePairValue(pair),
    });
  }
  select.createEl("option", {
    text: t("view.gymLog.newExercise", language),
    value: NEW_EXERCISE_SENTINEL,
  });
  if (catalog[0]) select.value = gymExercisePairValue(catalog[0]);

  const weightInput = addTextField(
    form,
    t("view.gymLog.weight", language),
    "atomic-gym-log-weight",
  );
  const repsInput = addTextField(
    form,
    t("view.gymLog.reps", language),
    "atomic-gym-log-reps",
  );
  const notesInput = addTextField(
    form,
    t("view.gymLog.notes", language),
    "atomic-gym-log-notes",
  );
  notesInput.setAttr("placeholder", t("view.gymLog.notes", language));

  const actions = form.createDiv({ cls: "atomic-gym-log-field" });
  actions.createEl("label", { text: "\u00a0" });
  const addButton = actions.createEl("button", {
    cls: "mod-cta",
    text: t("view.gymLog.add", language),
    attr: { "data-testid": "atomic-gym-log-add" },
  });

  select.addEventListener("change", () => {
    if (select.value !== NEW_EXERCISE_SENTINEL) return;
    void (async () => {
      const created = await promptNewGymExercise(plugin);
      if (!created) {
        select.value = catalog[0] ? gymExercisePairValue(catalog[0]) : "";
        return;
      }
      plugin.settings.gymExercises = mergeGymExercises(plugin.settings.gymExercises, [
        created,
      ]);
      await plugin.saveSettings();
      new Notice(
        t("notice.gymExerciseSaved", language, {
          exercise: created.exercise,
          muscle: created.muscle,
        }),
      );
      await renderAtomicGymLog(plugin, el, sourcePath);
      const next = el.querySelector('[data-testid="atomic-gym-log-exercise"]');
      if (next instanceof HTMLSelectElement) {
        next.value = gymExercisePairValue(created);
      }
    })();
  });

  addButton.addEventListener("click", () => {
    void (async () => {
      const pair = parseGymExercisePairValue(select.value);
      const weight = weightInput.value.trim();
      const reps = repsInput.value.trim();
      if (!pair || !weight || !reps) {
        new Notice(t("notice.gymLogMissingFields", language));
        return;
      }
      const file = plugin.data.getFileByPath(sourcePath);
      if (!file) {
        new Notice(t("notice.gymLogNeedsSavedNote", language));
        return;
      }
      const headers = gymSetTableHeaders(language);
      await plugin.app.vault.process(file, (latest) => {
        return appendSetRow(
          latest,
          {
            exercise: pair.exercise,
            muscle: pair.muscle,
            weight,
            reps,
            notes: notesInput.value.trim(),
          },
          headers,
        ).markdown;
      });
      plugin.settings.gymExercises = mergeGymExercises(plugin.settings.gymExercises, [
        pair,
      ]);
      await plugin.saveSettings();
      plugin.scheduleRefresh();
      weightInput.value = "";
      repsInput.value = "";
      notesInput.value = "";
      new Notice(
        t("notice.gymLogAdded", language, { exercise: pair.exercise }),
      );
    })();
  });
}

function addField(parent: HTMLElement, label: string): HTMLElement {
  const field = parent.createDiv({ cls: "atomic-gym-log-field" });
  field.createEl("label", { text: label });
  return field;
}

function addTextField(
  parent: HTMLElement,
  label: string,
  testId: string,
): HTMLInputElement {
  return addField(parent, label).createEl("input", {
    attr: {
      type: "text",
      "data-testid": testId,
      "aria-label": label,
    },
  });
}
