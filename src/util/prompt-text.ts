import { App, Modal, Setting } from "obsidian";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";

/** Obsidian Modal text prompt (window.prompt is blocked on Electron/macOS). */
export function promptText(
  app: App,
  title: string,
  defaultValue: string,
  language: Language,
): Promise<string | null> {
  return new Promise((resolve) => {
    const modal = new (class extends Modal {
      private value = defaultValue;
      private resolved = false;

      onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: title });
        new Setting(contentEl).addText((text) => {
          text.setValue(defaultValue);
          text.inputEl.style.width = "100%";
          text.onChange((v) => {
            this.value = v;
          });
          text.inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              this.finish(this.value);
            }
          });
          window.setTimeout(() => text.inputEl.focus(), 20);
        });
        new Setting(contentEl)
          .addButton((btn) =>
            btn
              .setButtonText(t("modal.cancel", language))
              .onClick(() => this.finish(null)),
          )
          .addButton((btn) =>
            btn
              .setButtonText(t("modal.ok", language))
              .setCta()
              .onClick(() => this.finish(this.value)),
          );
      }

      finish(v: string | null) {
        if (this.resolved) return;
        this.resolved = true;
        this.close();
        resolve(v);
      }

      onClose() {
        if (!this.resolved) {
          this.resolved = true;
          resolve(null);
        }
      }
    })(app);
    modal.open();
  });
}
