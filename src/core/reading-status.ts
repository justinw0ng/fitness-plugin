/** Reading item status values stored in frontmatter `status`. */

export const READING_STATUSES = [
  "to-read",
  "reading",
  "to-read-again",
  "finished",
] as const;

export type ReadingStatus = (typeof READING_STATUSES)[number];

export const DEFAULT_READING_STATUS: ReadingStatus = "to-read";

const STATUS_ORDER = new Map<string, number>([
  ["reading", 0],
  ["to-read", 1],
  ["to-read-again", 2],
  ["finished", 3],
]);

export function statusRank(status: string): number {
  return STATUS_ORDER.get(status) ?? 99;
}

export function isReadingItemFrontmatter(
  frontmatter: Record<string, unknown> | null | undefined,
): boolean {
  if (!frontmatter) return false;
  const type = String(frontmatter.type ?? "").trim();
  const activity = String(frontmatter.activity ?? "").trim();
  return type === "atomic-item" && activity === "reading";
}

export function shouldUseReadingStatusDropdown(
  propertyKey: string,
  frontmatter: Record<string, unknown> | null | undefined,
): boolean {
  return propertyKey === "status" && isReadingItemFrontmatter(frontmatter);
}

export function readingStatusLabelKey(status: string): string {
  switch (status) {
    case "to-read":
      return "reading.status.toRead";
    case "reading":
      return "reading.status.reading";
    case "to-read-again":
      return "reading.status.toReadAgain";
    case "finished":
      return "reading.status.finished";
    default:
      return status;
  }
}
