/** Pure vault-relative folder validation (no Obsidian imports). */

function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

/**
 * Returns true when `folder` is a non-empty vault-relative path with no
 * `.` / `..` segments and no absolute/drive prefix.
 */
export function isSafeVaultFolder(folder: string): boolean {
  if (typeof folder !== "string") return false;
  const trimmed = folder.trim();
  if (!trimmed) return false;

  const normalized = normalizeSlashes(trimmed);
  if (!normalized || normalized === "/") return false;
  if (normalized.startsWith("/")) return false;
  if (/^[a-zA-Z]:/.test(normalized)) return false;

  const segments = normalized.replace(/\/$/, "").split("/");
  if (segments.length === 0) return false;
  for (const seg of segments) {
    if (!seg || seg === "." || seg === "..") return false;
  }
  return true;
}

/**
 * Boundary-safe scan prefix `{folder}/{year}/`, or null if folder is unsafe.
 * Trailing slash prevents matching sibling path prefixes.
 */
export function sessionScanPrefix(
  folder: string,
  year: number,
): string | null {
  if (!isSafeVaultFolder(folder)) return null;
  const base = normalizeSlashes(folder.trim()).replace(/\/$/, "");
  return `${base}/${year}/`;
}
