import type { VaultDataSource } from "../data/vault-source";

export const BOOK_SHELF_HOST_REL = "atomics/hobbies/Reading/Book Shelf.md";

export function bookShelfHostMarkdown(): string {
  return `# Atomic book shelf

\`\`\`atomic-bookshelf
activity: reading
\`\`\`
`;
}

export async function ensureBookShelfHostFile(
  data: VaultDataSource,
): Promise<{ path: string; created: boolean }> {
  if (data.exists(BOOK_SHELF_HOST_REL)) {
    return { path: BOOK_SHELF_HOST_REL, created: false };
  }

  await data.createNote(BOOK_SHELF_HOST_REL, bookShelfHostMarkdown());
  return { path: BOOK_SHELF_HOST_REL, created: true };
}

export async function ensureBookShelfHostCommand(
  data: VaultDataSource,
): Promise<void> {
  const { Notice } = await import("obsidian");
  const result = await ensureBookShelfHostFile(data);
  new Notice(
    result.created
      ? `Created Atomic book shelf: ${result.path}`
      : `Atomic book shelf already exists: ${result.path}`,
  );
}

export async function openBookShelfHostCommand(
  data: VaultDataSource,
): Promise<void> {
  const result = await ensureBookShelfHostFile(data);
  await data.openPath(result.path);
}
