import type FitnessPlugin from "../main";
import { exerciseActivities } from "../util/activity-types";

export function renderActions(el: HTMLElement, plugin: FitnessPlugin): void {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });
  const wrap = root.createDiv({ cls: "fitness-actions" });

  for (const activity of exerciseActivities(plugin.settings.activityTypes)) {
    const button = wrap.createEl("button", { text: activity.label });
    button.addEventListener("click", () => {
      void plugin.createExerciseSession(activity);
    });
  }
}
