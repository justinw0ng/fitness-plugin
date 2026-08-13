export const DEFAULT_HERO_BOOK_LIMIT = 12;

export function parseHeroBookLimit(argv, maxBooks) {
  let raw = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--book-limit") {
      raw = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg.startsWith("--book-limit=")) {
      raw = arg.slice("--book-limit=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (raw === null && argv.includes("--book-limit")) {
    throw new Error("--book-limit requires an integer");
  }
  if (raw === null) return Math.min(DEFAULT_HERO_BOOK_LIMIT, maxBooks);

  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error("--book-limit requires an integer");
  }
  if (value < 1 || value > maxBooks) {
    throw new Error(`--book-limit must be between 1 and ${maxBooks}`);
  }
  return value;
}
