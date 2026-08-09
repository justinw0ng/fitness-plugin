import type { App } from "obsidian";
import type { VaultDataSource } from "../data/vault-source";
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

export function readingItemMarkdown(title: string): string {
  const cleanedTitle = cleanBookTitle(title);
  return `---
type: atomic-item
domain: hobby
activity: reading
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

## Remarks

## Time log

\`\`\`atomic-timer
\`\`\`
`;
}

export async function createReadingItem(
  app: App,
  data: VaultDataSource,
  readingActivity: ActivityType,
): Promise<void> {
  const title = window.prompt("Reading item title", "");
  if (title === null) return;
  const path = buildReadingItemPath(readingActivity.folder, title);
  const { Notice } = await import("obsidian");

  if (data.exists(path)) {
    await data.openPath(path);
    new Notice(`Opened existing Reading item: ${path}`);
    return;
  }

  await data.createNote(path, readingItemMarkdown(title));
  await data.openPath(path);
  new Notice(`Created Reading item: ${path}`);
  void app;
}
