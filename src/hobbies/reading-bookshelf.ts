import type { App } from "obsidian";
import type { VaultDataSource } from "../data/vault-source";
import { t, type Language } from "../i18n";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isSafeVaultFolder } from "../util/vault-path.ts";

export const READING_BOOKSHELF_REL = "atomics/hobbies/Reading/Bookshelf.base";
export const READING_ITEMS_FOLDER = "atomics/hobbies/Reading/Items";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    - file.inFolder("${itemsFolder}")
    - type == "atomic-item"
    - activity == "reading"
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
    fields:
      - file.name
      - authors
      - description
      - pages
      - status
      - tags
      - total_min
  - type: table
    name: ${t("template.base.table", language)}
    columns:
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

export function isBasesCorePluginEnabled(app: App): boolean {
  const appRecord: unknown = app;
  if (!isRecord(appRecord)) return false;
  const internalPlugins = appRecord.internalPlugins;
  if (!isRecord(internalPlugins)) return false;

  const getEnabledPluginById = internalPlugins.getEnabledPluginById;
  if (typeof getEnabledPluginById === "function") {
    return getEnabledPluginById.call(internalPlugins, "bases") != null;
  }

  const getPluginById = internalPlugins.getPluginById;
  if (typeof getPluginById !== "function") return false;
  const plugin = getPluginById.call(internalPlugins, "bases");
  return isRecord(plugin) && plugin.enabled === true;
}

export async function ensureReadingBookshelfFile(
  data: VaultDataSource,
  itemsFolder = READING_ITEMS_FOLDER,
  language: Language = "en",
): Promise<{ path: string; created: boolean }> {
  if (!shouldCreateReadingBookshelf(data.exists(READING_BOOKSHELF_REL))) {
    return { path: READING_BOOKSHELF_REL, created: false };
  }

  await data.createNote(
    READING_BOOKSHELF_REL,
    readingBookshelfBaseYaml(itemsFolder, language),
  );
  return { path: READING_BOOKSHELF_REL, created: true };
}

export async function ensureReadingBookshelfCommand(
  app: App,
  data: VaultDataSource,
  language: Language,
): Promise<void> {
  const { Notice } = await import("obsidian");
  if (!isBasesCorePluginEnabled(app)) {
    new Notice(t("notice.enableBases", language));
    return;
  }

  const result = await ensureReadingBookshelfFile(data, READING_ITEMS_FOLDER, language);
  new Notice(
    result.created
      ? t("notice.createdReadingBookshelf", language, { path: result.path })
      : t("notice.readingBookshelfExists", language, { path: result.path }),
  );
}

export async function openReadingBookshelfCommand(
  app: App,
  data: VaultDataSource,
  language: Language,
): Promise<void> {
  const { Notice } = await import("obsidian");
  if (!isBasesCorePluginEnabled(app)) {
    new Notice(t("notice.enableBases", language));
    return;
  }

  const result = await ensureReadingBookshelfFile(data, READING_ITEMS_FOLDER, language);
  await data.openPath(result.path);
}
