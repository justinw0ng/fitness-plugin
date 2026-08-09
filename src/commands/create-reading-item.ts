import type { App } from "obsidian";
import type { VaultDataSource } from "../data/vault-source";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isSafeVaultFolder } from "../util/vault-path.ts";

const FALLBACK_BOOK_TITLE = "Untitled Book";

function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

function cleanBookTitle(title: string): string {
  const cleaned = String(title || "")
    .replace(/[\\/:*?"<>|#[\]\r\n\t]/g, " ")
    .replace(/\.+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || FALLBACK_BOOK_TITLE;
}

export function buildHobbyItemPath(activityFolder: string, title: string): string {
  if (!isSafeVaultFolder(activityFolder)) {
    throw new Error("Hobby folder must be a safe vault-relative folder");
  }
  const base = normalizeSlashes(activityFolder.trim()).replace(/\/$/, "");
  return `${base}/Items/${cleanBookTitle(title)}.md`;
}

export function buildReadingItemPath(activityFolder: string, title: string): string {
  return buildHobbyItemPath(activityFolder, title);
}

export function readingItemMarkdown(
  title: string,
  language: Language = "en",
  activityId = "reading",
): string {
  const cleanedTitle = cleanBookTitle(title);
  const activity = activityId.trim() || "reading";
  return `---
type: atomic-item
domain: hobby
activity: ${activity}
status: to-read
authors:
  - ""
description: ""
pages:
cover: ""
tags:
  - books
spine_color:
total_min: 0
timer_started_at:
related_canvas:
---

# ${cleanedTitle}

## ${t("template.readingRemarks", language)}

## ${t("template.readingTimeLog", language)}

\`\`\`atomic-timer
\`\`\`
`;
}

export async function createHobbyItem(
  app: App,
  data: VaultDataSource,
  hobbyActivity: ActivityType,
  language: Language,
): Promise<void> {
  // Dynamic import keeps pure helpers testable without loading the Obsidian runtime stub.
  const { promptText } = await import("../util/prompt-text");
  const title = await promptText(
    app,
    t("modal.hobbyItemTitle", language, { label: hobbyActivity.label }),
    "",
    language,
  );
  if (title === null) return;
  const path = buildHobbyItemPath(hobbyActivity.folder, title);
  const { Notice } = await import("obsidian");

  if (data.exists(path)) {
    await data.openPath(path);
    new Notice(
      t("notice.openedExistingHobbyItem", language, {
        label: hobbyActivity.label,
        path,
      }),
    );
    return;
  }

  await data.createNote(
    path,
    readingItemMarkdown(title, language, hobbyActivity.id),
  );
  await data.openPath(path);
  new Notice(
    t("notice.createdHobbyItem", language, {
      label: hobbyActivity.label,
      path,
    }),
  );
}

export async function createReadingItem(
  app: App,
  data: VaultDataSource,
  readingActivity: ActivityType,
  language: Language,
): Promise<void> {
  // Dynamic import keeps pure helpers testable without loading the Obsidian runtime stub.
  const { promptText } = await import("../util/prompt-text");
  const title = await promptText(
    app,
    t("modal.readingItemTitle", language),
    "",
    language,
  );
  if (title === null) return;
  const path = buildReadingItemPath(readingActivity.folder, title);
  const { Notice } = await import("obsidian");

  if (data.exists(path)) {
    await data.openPath(path);
    new Notice(
      t("notice.openedExistingReadingItem", language, {
        path,
      }),
    );
    return;
  }

  await data.createNote(
    path,
    readingItemMarkdown(title, language, readingActivity.id),
  );
  await data.openPath(path);
  new Notice(
    t("notice.createdReadingItem", language, {
      path,
    }),
  );
}
