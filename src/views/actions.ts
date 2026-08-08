import type FitnessPlugin from "../main";

export function renderActions(el: HTMLElement, plugin: FitnessPlugin): void {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });
  const wrap = root.createDiv({ cls: "fitness-actions" });

  const gymBtn = wrap.createEl("button", { text: "🏋️ Gym / 健身" });
  gymBtn.addEventListener("click", () => {
    void plugin.createGymSession();
  });

  const golfBtn = wrap.createEl("button", { text: "⛳ Golf / 高爾夫" });
  golfBtn.addEventListener("click", () => {
    void plugin.createGolfSession();
  });
}
