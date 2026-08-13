import type { App } from "obsidian";
import type { VaultDataSource } from "../data/vault-source";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { showNotice } from "../util/notice.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isSafeVaultFolder } from "../util/vault-path.ts";

export const READING_BOOKSHELF_REL = "atomics/hobbies/Reading/Bookshelf.base";
export const READING_ITEMS_FOLDER = "atomics/hobbies/Reading/Items";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function callPluginIdLookup(method: unknown, self: object, id: string): unknown {
  if (typeof method !== "function") return undefined;
  return (method as (this: object, pluginId: string) => unknown).call(self, id);
}

export function readingBookshelfBaseYaml(
  itemsFolder = READING_ITEMS_FOLDER,
  language: Language = "en",
): string {
  if (!isSafeVaultFolder(itemsFolder)) {
    throw new Error("Reading items folder must be a safe vault-relative folder");
  }
  return `# ${t("template.readingBookshelfTitle", language)}
filters:
  and:
    - 'file.inFolder("${itemsFolder}")'
    - 'type == "atomic-item"'
    - 'activity == "reading"'
properties:
  file.name:
    displayName: ${t("template.base.title", language)}
  authors:
    displayName: ${t("template.base.authors", language)}
  description:
    displayName: ${t("template.base.description", language)}
  pages:
    displayName: ${t("template.base.pages", language)}
  status:
    displayName: ${t("template.base.status", language)}
  tags:
    displayName: ${t("template.base.tags", language)}
  total_min:
    displayName: ${t("template.base.totalMinutes", language)}
views:
  - type: cards
    name: ${t("template.base.cards", language)}
    image: cover
    order:
      - file.name
      - authors
      - description
      - pages
      - status
      - tags
      - total_min
  - type: table
    name: ${t("template.base.table", language)}
    order:
      - file.name
      - authors
      - description
      - pages
      - status
      - tags
      - total_min
`;
}

export function shouldCreateReadingBookshelf(existing: boolean): boolean {
  return !existing;
}

export function needsReadingBookshelfUpgrade(content: string): boolean {
  const legacyCards = /^\s+-\s+type:\s*cards[\s\S]*?\n\s+fields:\s*$/m.test(content);
  const legacyTable = /^\s+-\s+type:\s*table[\s\S]*?\n\s+columns:\s*$/m.test(content);
  return legacyCards || legacyTable;
}

export function isBasesCorePluginEnabled(app: App): boolean {
  const appRecord: unknown = app;
  if (!isRecord(appRecord)) return false;
  const internalPlugins = appRecord.internalPlugins;
  if (!isRecord(internalPlugins)) return false;

  try {
    if (callPluginIdLookup(internalPlugins.getEnabledPluginById, internalPlugins, "bases") != null) {
      return true;
    }
  } catch {
    // Fall through to other probes.
  }

  const plugins = internalPlugins.plugins;
  if (isRecord(plugins)) {
    const bases = plugins.bases;
    if (isRecord(bases) && bases.enabled === true) return true;
  }

  const config = internalPlugins.config;
  if (isRecord(config) && config.bases === true) return true;

  try {
    const plugin = callPluginIdLookup(
      internalPlugins.getPluginById,
      internalPlugins,
      "bases",
    );
    if (isRecord(plugin) && plugin.enabled === true) return true;
  } catch {
    return false;
  }

  return false;
}

export async function createReadingBookshelfFile(
  data: VaultDataSource,
  itemsFolder = READING_ITEMS_FOLDER,
  language: Language = "en",
): Promise<{ path: string; created: boolean; updated: boolean }> {
  const yaml = readingBookshelfBaseYaml(itemsFolder, language);

  if (!data.exists(READING_BOOKSHELF_REL)) {
    await data.createNote(READING_BOOKSHELF_REL, yaml);
    return { path: READING_BOOKSHELF_REL, created: true, updated: false };
  }

  const existing = await data.readBody(READING_BOOKSHELF_REL);
  if (needsReadingBookshelfUpgrade(existing)) {
    await data.writeNote(READING_BOOKSHELF_REL, yaml);
    return { path: READING_BOOKSHELF_REL, created: false, updated: true };
  }

  return { path: READING_BOOKSHELF_REL, created: false, updated: false };
}

export async function createReadingBookshelfCommand(
  app: App,
  data: VaultDataSource,
  language: Language,
): Promise<void> {
  if (!isBasesCorePluginEnabled(app)) {
    showNotice(t("notice.enableBases", language));
    return;
  }

  try {
    const result = await createReadingBookshelfFile(
      data,
      READING_ITEMS_FOLDER,
      language,
    );
    if (result.created) {
      showNotice(t("notice.createdReadingBookshelf", language, { path: result.path }));
      return;
    }
    if (result.updated) {
      showNotice(t("notice.updatedReadingBookshelf", language, { path: result.path }));
      return;
    }
    showNotice(t("notice.readingBookshelfExists", language, { path: result.path }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.readingBookshelfFailed", language, { message }));
  }
}

export async function openReadingBookshelfCommand(
  app: App,
  data: VaultDataSource,
  language: Language,
): Promise<void> {
  if (!isBasesCorePluginEnabled(app)) {
    showNotice(t("notice.enableBases", language));
    return;
  }

  try {
    const result = await createReadingBookshelfFile(
      data,
      READING_ITEMS_FOLDER,
      language,
    );
    await data.openPath(result.path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.readingBookshelfFailed", language, { message }));
  }
}
