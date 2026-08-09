import type { App } from "obsidian";
import type { VaultDataSource } from "../data/vault-source";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType } from "../types";
import { showNotice } from "../util/notice";
import { promptText } from "../util/prompt-text";
import {
  buildHobbyItemPath,
  buildReadingItemPath,
  readingItemMarkdown,
} from "./hobby-item";

export async function createHobbyItem(
  app: App,
  data: VaultDataSource,
  hobbyActivity: ActivityType,
  language: Language,
): Promise<void> {
  const title = await promptText(
    app,
    t("modal.hobbyItemTitle", language, { label: hobbyActivity.label }),
    "",
    language,
  );
  if (title === null) return;
  const path = buildHobbyItemPath(hobbyActivity.folder, title);

  try {
    if (data.exists(path)) {
      await data.openPath(path);
      showNotice(
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
    showNotice(
      t("notice.createdHobbyItem", language, {
        label: hobbyActivity.label,
        path,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.hobbyItemFailed", language, { message }));
  }
}

export async function createReadingItem(
  app: App,
  data: VaultDataSource,
  readingActivity: ActivityType,
  language: Language,
): Promise<void> {
  const title = await promptText(
    app,
    t("modal.readingItemTitle", language),
    "",
    language,
  );
  if (title === null) return;
  const path = buildReadingItemPath(readingActivity.folder, title);

  try {
    if (data.exists(path)) {
      await data.openPath(path);
      showNotice(
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
    showNotice(
      t("notice.createdReadingItem", language, {
        path,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.readingItemFailed", language, { message }));
  }
}
