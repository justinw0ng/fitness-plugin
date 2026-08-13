import type { App, Plugin, WorkspaceLeaf } from "obsidian";
import { Notice, TFile } from "obsidian";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { promptText } from "../util/prompt-text.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { CUSTOM_LOCATION_SENTINEL, DROPDOWN_PROPERTY_NAMES, resolvePropertyOptions, type PropertyOptionSpec } from "../core/property-options.ts";

const SELECT_CLASS = "atomic-property-select";
const HIDDEN_CLASS = "atomic-property-native-hidden";
const SYNC_GRACE_MS = 2000;

type RegisterOptions = {
  getLanguage: () => Language;
};

function appendOption(
  selectEl: HTMLSelectElement,
  value: string,
  label: string,
  selected = false,
): HTMLOptionElement {
  const optionEl = selectEl.createEl("option", { text: label, value });
  optionEl.selected = selected;
  return optionEl;
}

function insertOption(
  selectEl: HTMLSelectElement,
  before: HTMLOptionElement | null,
  value: string,
  label: string,
): HTMLOptionElement {
  const optionEl = createEl("option", { text: label, value });
  selectEl.insertBefore(optionEl, before);
  return optionEl;
}

function frontmatterForFile(
  app: App,
  file: TFile | null,
): Record<string, unknown> | null {
  if (!file) return null;
  const cache = app.metadataCache.getFileCache(file);
  return cache?.frontmatter ?? null;
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
  if (nativeInput?.instanceOf(HTMLInputElement)) return nativeInput.value;
  const nativeEditable = valueContainer.querySelector("[contenteditable]");
  return (nativeEditable?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function optionLabel(
  spec: PropertyOptionSpec,
  value: string,
  language: Language,
): string {
  const labelKey = spec.labelKey?.(value) ?? value;
  if (labelKey === value) return value;
  const translated = t(labelKey, language);
  return translated === labelKey ? value : translated;
}

function createPropertySelect(
  app: App,
  spec: PropertyOptionSpec,
  property: string,
  getLanguage: () => Language,
  currentValue: string,
  onChange: (value: string) => void,
): HTMLSelectElement {
  const language = getLanguage();
  const selectEl = createEl("select", {
    cls: [SELECT_CLASS, "dropdown"],
    attr: {
      "data-testid": "atomic-property-select",
      "data-property": property,
      "aria-label": t("property.selectLabel", language, { property }),
    },
  });

  for (const value of spec.values) {
    appendOption(
      selectEl,
      value,
      optionLabel(spec, value, language),
      value === currentValue,
    );
  }

  if (currentValue && !spec.values.includes(currentValue)) {
    appendOption(selectEl, currentValue, currentValue, true);
  }

  if (spec.allowCustom) {
    appendOption(
      selectEl,
      CUSTOM_LOCATION_SENTINEL,
      t("property.location.custom", language),
    );
  }

  selectEl.dataset.committedValue = currentValue || spec.values[0] || "";

  selectEl.addEventListener("change", () => {
    const language = getLanguage();
    const newValue = selectEl.value;
    selectEl.dataset.lastChanged = Date.now().toString();

    if (spec.allowCustom && newValue === CUSTOM_LOCATION_SENTINEL) {
      const previous = selectEl.dataset.committedValue || "";
      selectEl.value = previous;
      void (async () => {
        const raw = await promptText(
          app,
          t("modal.customLocation", language),
          "",
          language,
        );
        if (raw === null) return;
        const trimmed = raw.trim();
        if (!trimmed) {
          new Notice(t("notice.emptyCustomLocation", language));
          return;
        }
        selectEl.dataset.committedValue = trimmed;
        if (!Array.from(selectEl.options).some((o) => o.value === trimmed)) {
          const customOption = Array.from(selectEl.options).find(
            (o) => o.value === CUSTOM_LOCATION_SENTINEL,
          );
          insertOption(selectEl, customOption ?? null, trimmed, trimmed);
        }
        selectEl.value = trimmed;
        onChange(trimmed);
      })();
      return;
    }

    selectEl.dataset.committedValue = newValue;
    onChange(newValue);
  });

  return selectEl;
}

function writePropertyValue(
  app: App,
  file: TFile | null,
  key: string,
  value: string,
  valueContainer?: HTMLElement,
): void {
  if (valueContainer) {
    const nativeInput = valueContainer.querySelector("input");
    const nativeEditable = valueContainer.querySelector("[contenteditable]");
    if (nativeInput?.instanceOf(HTMLInputElement)) {
      nativeInput.value = value;
      nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
      nativeInput.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (nativeEditable?.instanceOf(HTMLElement)) {
      nativeEditable.textContent = value;
      nativeEditable.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }
  }

  if (!(file instanceof TFile)) return;
  void app.fileManager.processFrontMatter(
    file,
    (frontmatter: Record<string, unknown>) => {
      frontmatter[key] = value;
    },
  );
}

function hideNativeEditors(valueContainer: HTMLElement): void {
  for (const child of Array.from(valueContainer.children)) {
    if (child.classList.contains(SELECT_CLASS)) continue;
    if (child.instanceOf(HTMLElement)) {
      child.addClass(HIDDEN_CLASS);
    }
  }
}

function syncExistingSelect(
  selectEl: HTMLSelectElement,
  spec: PropertyOptionSpec,
  currentValue: string,
  fallbackValue: string,
): void {
  const lastChanged = Number.parseInt(selectEl.dataset.lastChanged || "0", 10);
  if (Date.now() - lastChanged < SYNC_GRACE_MS) return;

  const valueToSet = currentValue || fallbackValue;
  if (valueToSet && !spec.values.includes(valueToSet)) {
    const hasOption = Array.from(selectEl.options).some(
      (option) => option.value === valueToSet,
    );
    if (!hasOption) {
      const customOption = Array.from(selectEl.options).find(
        (option) => option.value === CUSTOM_LOCATION_SENTINEL,
      );
      insertOption(selectEl, customOption ?? null, valueToSet, valueToSet);
    }
  }

  if (selectEl.value !== valueToSet) {
    selectEl.value = valueToSet;
  }
  selectEl.dataset.committedValue = valueToSet;
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

function injectPropertySelect(
  app: App,
  getLanguage: () => Language,
  property: string,
  spec: PropertyOptionSpec,
  valueContainer: HTMLElement,
  file: TFile | null,
  forBases: boolean,
): void {
  const existing = valueContainer.querySelector(`.${SELECT_CLASS}`);
  const currentValue = forBases
    ? (valueContainer.querySelector(".metadata-input-longtext")?.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim()
    : readNativeValue(valueContainer);

  if (existing?.instanceOf(HTMLSelectElement)) {
    syncExistingSelect(existing, spec, currentValue, spec.values[0] ?? "");
    return;
  }

  if (!forBases) hideNativeEditors(valueContainer);
  const editableValue = currentValue;
  const selectEl = createPropertySelect(
    app,
    spec,
    property,
    getLanguage,
    editableValue,
    (newValue) => {
      writePropertyValue(app, file, property, newValue, forBases ? undefined : valueContainer);
    },
  );
  if (forBases) {
    selectEl.classList.add("mod-base");
    stopBasesPointerCapture(selectEl);
  }
  valueContainer.appendChild(selectEl);
}

export function registerPropertySelects(
  plugin: Plugin,
  options: RegisterOptions,
): void {
  const app = plugin.app;
  const { getLanguage } = options;

  const inject = (container: ParentNode): void => {
    container.querySelectorAll(".metadata-property").forEach((propEl) => {
      const keyEl = propEl.querySelector(".metadata-property-key-input");
      if (!keyEl?.instanceOf(HTMLInputElement)) return;
      const property = (keyEl.value || keyEl.textContent || "").trim();
      if (!property) return;

      if (!propEl.instanceOf(HTMLElement)) return;
      const file = getFileFromElement(app, propEl);
      const frontmatter = frontmatterForFile(app, file);
      const spec = resolvePropertyOptions(property, { frontmatter });
      if (!spec) return;

      const valueContainer = propEl.querySelector(".metadata-property-value");
      if (!valueContainer?.instanceOf(HTMLElement)) return;
      injectPropertySelect(
        app,
        getLanguage,
        property,
        spec,
        valueContainer,
        file,
        false,
      );
    });

    for (const property of DROPDOWN_PROPERTY_NAMES) {
      container
        .querySelectorAll(`.bases-td[data-property="note.${property}"]`)
        .forEach((cellEl) => {
          if (!cellEl.instanceOf(HTMLElement)) return;
          const row = cellEl.closest(".bases-tr");
          if (!row?.instanceOf(HTMLElement)) return;

          const link = row.querySelector(".internal-link");
          const href = link?.getAttribute("data-href") ?? "";
          const file = href
            ? app.metadataCache.getFirstLinkpathDest(href, "")
            : null;
          const frontmatter = frontmatterForFile(
            app,
            file instanceof TFile ? file : null,
          );
          const spec = resolvePropertyOptions(property, { frontmatter });
          if (!spec) return;

          injectPropertySelect(
            app,
            getLanguage,
            property,
            spec,
            cellEl,
            file instanceof TFile ? file : null,
            true,
          );
        });
    }
  };

  let injectFrame: number | null = null;
  const scheduleInject = (): void => {
    if (injectFrame !== null) return;
    injectFrame = window.requestAnimationFrame(() => {
      injectFrame = null;
      inject(document.body);
    });
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        scheduleInject();
        return;
      }
    }
  });

  plugin.register(() => {
    observer.disconnect();
    if (injectFrame !== null) {
      window.cancelAnimationFrame(injectFrame);
      injectFrame = null;
    }
  });
  plugin.app.workspace.onLayoutReady(() => {
    observer.observe(document.body, { childList: true, subtree: true });
    inject(document.body);
  });
}
