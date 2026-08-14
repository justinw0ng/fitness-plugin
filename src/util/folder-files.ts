/** Duck-typed vault folder walk. No Obsidian imports. */

export type VaultFileLike = {
  path: string;
  basename: string;
  extension?: string;
};

export type VaultFolderLike = {
  path?: string;
  children?: Array<VaultFolderLike | VaultFileLike>;
};

export function isVaultFolderLike(
  node: VaultFolderLike | VaultFileLike | null | undefined,
): node is VaultFolderLike {
  return !!node && Array.isArray((node as VaultFolderLike).children);
}

/**
 * Markdown notes under `folder`, recursively. Does not look at sibling folders.
 */
export function markdownFilesInFolder(
  folder: VaultFolderLike | null | undefined,
): VaultFileLike[] {
  if (!isVaultFolderLike(folder)) return [];
  const out: VaultFileLike[] = [];
  const stack: Array<VaultFolderLike | VaultFileLike> = [...(folder.children ?? [])];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (isVaultFolderLike(node)) {
      if (node.children) stack.push(...node.children);
      continue;
    }
    if (isMarkdownFile(node)) out.push(node);
  }
  return out;
}

function isMarkdownFile(node: VaultFileLike): boolean {
  if (node.extension) return node.extension === "md";
  return node.path.toLowerCase().endsWith(".md");
}
