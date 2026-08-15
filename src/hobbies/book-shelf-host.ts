import type { VaultDataSource } from "../data/vault-source";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { defaultAtomicBlockFence } from "../util/codeblock-defaults.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { showNotice } from "../util/notice.ts";

export const BOOK_SHELF_HOST_REL = "atomics/hobbies/Reading/Book Shelf.md";

export function bookShelfHostMarkdown(language: Language = "en"): string {
  return defaultAtomicBlockFence("atomic-bookshelf", language);
}

export async function createBookShelfHostFile(
  data: VaultDataSource,
  language: Language = "en",
): Promise<{ path: string; created: boolean }> {
  if (data.exists(BOOK_SHELF_HOST_REL)) {
    return { path: BOOK_SHELF_HOST_REL, created: false };
  }

  await data.createNote(BOOK_SHELF_HOST_REL, bookShelfHostMarkdown(language));
  return { path: BOOK_SHELF_HOST_REL, created: true };
}

export async function createBookShelfHostCommand(
  data: VaultDataSource,
  language: Language,
): Promise<void> {
  try {
    const result = await createBookShelfHostFile(data, language);
    showNotice(
      result.created
        ? t("notice.createdBookShelf", language, { path: result.path })
        : t("notice.bookShelfExists", language, { path: result.path }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.bookShelfFailed", language, { message }));
  }
}

export async function openBookShelfHostCommand(
  data: VaultDataSource,
  language: Language,
): Promise<void> {
  try {
    const result = await createBookShelfHostFile(data, language);
    await data.openPath(result.path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.bookShelfFailed", language, { message }));
  }
}
