import type { App } from "obsidian";
import type { VaultDataSource } from "../data/vault-source";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isSafeVaultFolder } from "../util/vault-path.ts";

export const READING_BOOKSHELF_REL = "atomics/hobbies/Reading/Bookshelf.base";
export const READING_ITEMS_FOLDER = "atomics/hobbies/Reading/Items";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readingBookshelfBaseYaml(
  itemsFolder = READING_ITEMS_FOLDER,
): string {
  if (!isSafeVaultFolder(itemsFolder)) {
    throw new Error("Reading items folder must be a safe vault-relative folder");
  }
  return `# Atomic reading bookshelf v1
filters:
  and:
    - file.inFolder("${itemsFolder}")
    - type == "atomic-item"
    - activity == "reading"
properties:
  file.name:
    displayName: Title
  authors:
    displayName: Authors
  description:
    displayName: Description
  pages:
    displayName: Pages
  status:
    displayName: Status
  tags:
    displayName: Tags
  total_min:
    displayName: Total minutes
views:
  - type: cards
    name: Cards
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
    name: Table
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
): Promise<{ path: string; created: boolean }> {
  if (!shouldCreateReadingBookshelf(data.exists(READING_BOOKSHELF_REL))) {
    return { path: READING_BOOKSHELF_REL, created: false };
  }

  await data.createNote(
    READING_BOOKSHELF_REL,
    readingBookshelfBaseYaml(itemsFolder),
  );
  return { path: READING_BOOKSHELF_REL, created: true };
}

export async function ensureReadingBookshelfCommand(
  app: App,
  data: VaultDataSource,
): Promise<void> {
  const { Notice } = await import("obsidian");
  if (!isBasesCorePluginEnabled(app)) {
    new Notice("Enable the Bases core plugin to use the Reading bookshelf.");
    return;
  }

  const result = await ensureReadingBookshelfFile(data);
  new Notice(
    result.created
      ? `Created Reading bookshelf: ${result.path}`
      : `Reading bookshelf already exists: ${result.path}`,
  );
}

export async function openReadingBookshelfCommand(
  app: App,
  data: VaultDataSource,
): Promise<void> {
  const { Notice } = await import("obsidian");
  if (!isBasesCorePluginEnabled(app)) {
    new Notice("Enable the Bases core plugin to use the Reading bookshelf.");
    return;
  }

  const result = await ensureReadingBookshelfFile(data);
  await data.openPath(result.path);
}
