import type FitnessPlugin from "../main";
import { actionActivities } from "../util/action-activities";

export function renderActions(el: HTMLElement, plugin: FitnessPlugin): void {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });
  const wrap = root.createDiv({ cls: "fitness-actions" });

  for (const activity of actionActivities(plugin.settings.activityTypes)) {
    const button = wrap.createEl("button", { text: activity.label });
    button.addEventListener("click", () => {
      if (activity.domain === "hobby" && activity.noteModel === "item") {
        void plugin.createHobbyItem(activity);
        return;
      }
      void plugin.createExerciseSession(activity);
    });
  }
}
