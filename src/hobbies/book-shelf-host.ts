import type { VaultDataSource } from "../data/vault-source";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";

export const BOOK_SHELF_HOST_REL = "atomics/hobbies/Reading/Book Shelf.md";

export function bookShelfHostMarkdown(_language: Language = "en"): string {
  return `\`\`\`atomic-bookshelf
activity: reading
\`\`\`
`;
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
  const { Notice } = await import("obsidian");
  const result = await createBookShelfHostFile(data, language);
  new Notice(
    result.created
      ? t("notice.createdBookShelf", language, { path: result.path })
      : t("notice.bookShelfExists", language, { path: result.path }),
  );
}

export async function openBookShelfHostCommand(
  data: VaultDataSource,
  language: Language,
): Promise<void> {
  const result = await createBookShelfHostFile(data, language);
  await data.openPath(result.path);
}
