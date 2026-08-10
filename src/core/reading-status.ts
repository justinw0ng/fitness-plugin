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

export type BookShelfStatusResolution = {
  /** `null` means show every status (default). */
  statuses: string[] | null;
  invalidStatuses: string[];
};

const KNOWN_STATUSES = new Map(
  READING_STATUSES.map((status) => [status.toLowerCase(), status] as const),
);

function parseStatusTokens(statusOption: string | undefined): string[] {
  if (statusOption == null) return ["all"];
  return statusOption
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

/**
 * Resolve which Reading statuses an atomic-bookshelf block should show.
 * Omit / `all` → every status; otherwise comma-separated status ids.
 */
export function resolveBookShelfStatuses(
  statusOption?: string,
): BookShelfStatusResolution {
  const tokens = parseStatusTokens(statusOption);
  if (tokens.length === 0 || tokens.some((token) => token.toLowerCase() === "all")) {
    return { statuses: null, invalidStatuses: [] };
  }

  const statuses: string[] = [];
  const invalidStatuses: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const canonical = KNOWN_STATUSES.get(key);
    if (!canonical) {
      invalidStatuses.push(token);
      continue;
    }
    statuses.push(canonical);
  }

  return {
    statuses: statuses.length > 0 ? statuses : null,
    invalidStatuses,
  };
}

export function matchesBookShelfStatus(
  itemStatus: string,
  statuses: string[] | null,
): boolean {
  if (!statuses) return true;
  return statuses.includes(itemStatus);
}
