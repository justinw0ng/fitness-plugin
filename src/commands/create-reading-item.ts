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

export function buildReadingItemPath(activityFolder: string, title: string): string {
  if (!isSafeVaultFolder(activityFolder)) {
    throw new Error("Reading folder must be a safe vault-relative folder");
  }
  const base = normalizeSlashes(activityFolder.trim()).replace(/\/$/, "");
  return `${base}/Items/${cleanBookTitle(title)}.md`;
}

export function buildHobbyItemPath(activityFolder: string, title: string): string {
  return buildReadingItemPath(activityFolder, title);
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
  const title = window.prompt(
    t("modal.hobbyItemTitle", language, { label: hobbyActivity.label }),
    "",
  );
  if (title === null) return;
  const path = buildHobbyItemPath(hobbyActivity.folder, title);
  const { Notice } = await import("obsidian");

  if (data.exists(path)) {
    await data.openPath(path);
    new Notice(t("notice.openedExistingReadingItem", language, { path }));
    return;
  }

  await data.createNote(
    path,
    readingItemMarkdown(title, language, hobbyActivity.id),
  );
  await data.openPath(path);
  new Notice(t("notice.createdReadingItem", language, { path }));
  void app;
}

export async function createReadingItem(
  app: App,
  data: VaultDataSource,
  readingActivity: ActivityType,
  language: Language,
): Promise<void> {
  await createHobbyItem(app, data, readingActivity, language);
}
