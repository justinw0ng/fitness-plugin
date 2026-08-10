import type { App, Plugin, WorkspaceLeaf } from "obsidian";
import { TFile } from "obsidian";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { READING_STATUSES, readingStatusLabelKey, shouldUseReadingStatusDropdown } from "../core/reading-status.ts";

const SELECT_CLASS = "atomic-reading-status-select";
const HIDDEN_CLASS = "atomic-reading-status-native-hidden";
const SYNC_GRACE_MS = 2000;

type RegisterOptions = {
  getLanguage: () => Language;
};

function frontmatterForFile(
  app: App,
  file: TFile | null,
): Record<string, unknown> | null {
  if (!file) return null;
  const cache = app.metadataCache.getFileCache(file);
  return (cache?.frontmatter as Record<string, unknown> | undefined) ?? null;
}

function getFileFromElement(app: App, el: HTMLElement): TFile | null {
  const leafEl = el.closest(".workspace-leaf");
  if (!leafEl) return app.workspace.getActiveFile();

  let targetFile: TFile | null = null;
  app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
    if (leaf.view.containerEl.parentElement === leafEl) {
      const view = leaf.view;
      if ("file" in view && view.file instanceof TFile) {
        targetFile = view.file;
      }
    }
  });
  return targetFile ?? app.workspace.getActiveFile();
}

function readNativeValue(valueContainer: HTMLElement): string {
  const nativeInput = valueContainer.querySelector("input");
  if (nativeInput) return nativeInput.value;
  const nativeEditable = valueContainer.querySelector("[contenteditable]");
  return (nativeEditable?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function createStatusSelect(
  getLanguage: () => Language,
  currentValue: string,
  onChange: (value: string) => void,
): HTMLSelectElement {
  const language = getLanguage();
  const selectEl = document.createElement("select");
  selectEl.classList.add(SELECT_CLASS, "dropdown");
  selectEl.setAttribute("aria-label", t("reading.status.selectLabel", language));

  for (const status of READING_STATUSES) {
    const optionEl = document.createElement("option");
    optionEl.value = status;
    const labelKey = readingStatusLabelKey(status);
    optionEl.text =
      labelKey === status ? status : t(labelKey, language);
    if (status === currentValue) optionEl.selected = true;
    selectEl.appendChild(optionEl);
  }

  if (
    currentValue &&
    !(READING_STATUSES as readonly string[]).includes(currentValue)
  ) {
    const legacy = document.createElement("option");
    legacy.value = currentValue;
    legacy.text = currentValue;
    legacy.selected = true;
    selectEl.appendChild(legacy);
  }

  selectEl.addEventListener("change", (event) => {
    const newValue = (event.target as HTMLSelectElement).value;
    selectEl.dataset.lastChanged = Date.now().toString();
    onChange(newValue);
  });

  return selectEl;
}

function writeStatus(
  app: App,
  file: TFile | null,
  key: string,
  value: string,
  valueContainer?: HTMLElement,
): void {
  if (valueContainer) {
    const nativeInput = valueContainer.querySelector("input");
    const nativeEditable = valueContainer.querySelector("[contenteditable]");
    if (nativeInput instanceof HTMLInputElement) {
      nativeInput.value = value;
      nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
      nativeInput.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (nativeEditable instanceof HTMLElement) {
      nativeEditable.textContent = value;
      nativeEditable.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }
  }

  if (!(file instanceof TFile)) return;
  void app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter[key] = value;
  });
}

function hideNativeEditors(valueContainer: HTMLElement): string {
  let currentValue = "";
  for (const child of Array.from(valueContainer.children)) {
    if (child.classList.contains(SELECT_CLASS)) continue;
    if (child instanceof HTMLElement) {
      const inputEl = child.querySelector("input");
      if (inputEl instanceof HTMLInputElement) currentValue = inputEl.value;
      else if (child.textContent) currentValue = child.textContent;
      child.addClass(HIDDEN_CLASS);
    }
  }
  return currentValue.replace(/\s+/g, " ").trim();
}

function syncExistingSelect(
  selectEl: HTMLSelectElement,
  currentValue: string,
): boolean {
  const lastChanged = Number.parseInt(selectEl.dataset.lastChanged || "0", 10);
  if (Date.now() - lastChanged < SYNC_GRACE_MS) return true;
  if (selectEl.value !== currentValue) selectEl.value = currentValue || READING_STATUSES[0];
  return true;
}

function stopBasesPointerCapture(selectEl: HTMLSelectElement): void {
  const stop = (event: Event) => {
    event.stopPropagation();
  };
  for (const type of [
    "mousedown",
    "mouseup",
    "click",
    "pointerdown",
    "pointerup",
    "focusin",
  ]) {
    selectEl.addEventListener(type, stop);
    selectEl.addEventListener(type, stop, { capture: true });
  }
}

export function registerReadingStatusSelect(
  plugin: Plugin,
  options: RegisterOptions,
): void {
  const app = plugin.app;
  const { getLanguage } = options;

  const inject = (container: ParentNode): void => {
    container.querySelectorAll(".metadata-property").forEach((propEl) => {
      const keyEl = propEl.querySelector(
        ".metadata-property-key-input",
      ) as HTMLInputElement | null;
      if (!keyEl) return;
      const key = (keyEl.value || keyEl.textContent || "").trim();
      if (key !== "status") return;

      const file = getFileFromElement(app, propEl as HTMLElement);
      const frontmatter = frontmatterForFile(app, file);
      if (!shouldUseReadingStatusDropdown(key, frontmatter)) return;

      const valueContainer = propEl.querySelector(".metadata-property-value");
      if (!(valueContainer instanceof HTMLElement)) return;

      const existing = valueContainer.querySelector(
        `.${SELECT_CLASS}`,
      ) as HTMLSelectElement | null;
      if (existing) {
        syncExistingSelect(existing, readNativeValue(valueContainer));
        return;
      }

      const currentValue = hideNativeEditors(valueContainer);
      const selectEl = createStatusSelect(
        getLanguage,
        currentValue,
        (newValue) => {
          writeStatus(app, file, key, newValue, valueContainer);
        },
      );
      valueContainer.appendChild(selectEl);
    });

    container
      .querySelectorAll('.bases-td[data-property="note.status"]')
      .forEach((cellEl) => {
        if (!(cellEl instanceof HTMLElement)) return;
        const row = cellEl.closest(".bases-tr");
        if (!(row instanceof HTMLElement)) return;

        const link = row.querySelector(".internal-link");
        const href = link?.getAttribute("data-href") ?? "";
        const file = href
          ? app.metadataCache.getFirstLinkpathDest(href, "")
          : null;
        const frontmatter = frontmatterForFile(
          app,
          file instanceof TFile ? file : null,
        );
        if (!shouldUseReadingStatusDropdown("status", frontmatter)) return;

        const existing = cellEl.querySelector(
          `.${SELECT_CLASS}`,
        ) as HTMLSelectElement | null;
        const contentEl = cellEl.querySelector(".metadata-input-longtext");
        const currentValue = (contentEl?.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim();
        if (existing) {
          syncExistingSelect(existing, currentValue);
          return;
        }

        const selectEl = createStatusSelect(
          getLanguage,
          currentValue,
          (newValue) => {
            if (file instanceof TFile) {
              writeStatus(app, file, "status", newValue);
            }
          },
        );
        selectEl.classList.add("mod-base");
        stopBasesPointerCapture(selectEl);
        cellEl.appendChild(selectEl);
      });
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        inject(document.body);
        return;
      }
    }
  });

  plugin.register(() => observer.disconnect());
  plugin.app.workspace.onLayoutReady(() => {
    observer.observe(document.body, { childList: true, subtree: true });
    inject(document.body);
  });
}
