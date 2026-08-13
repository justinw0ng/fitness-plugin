export const DEFAULT_HERO_BOOK_LIMIT = 12;
export const DEFAULT_DEMO_VAULT = "/workspace/obsidian-demo";

export function parseSeedVault(argv, fallback = DEFAULT_DEMO_VAULT) {
  const rest = [];
  let vault = fallback;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--vault") {
      const value = argv[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("--vault requires a path");
      }
      vault = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--vault=")) {
      const value = arg.slice("--vault=".length);
      if (!value) {
        throw new Error("--vault requires a path");
      }
      vault = value;
      continue;
    }
    rest.push(arg);
  }

  return { vault, rest };
}

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
