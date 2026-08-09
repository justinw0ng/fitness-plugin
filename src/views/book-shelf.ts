import type { VaultDataSource } from "../data/vault-source";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType, HobbyItemMeta } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { hobbyActivities } from "../util/activity-types.ts";

export type BookShelfItem = {
  path: string;
  title: string;
  authors: string[];
  status: string;
  spineColor: string;
  cover?: string;
  description?: string;
};

export type CoverRef =
  | { kind: "url"; src: string }
  | { kind: "vault"; path: string }
  | { kind: "none" };

const STATUS_ORDER = new Map([
  ["reading", 0],
  ["to-read", 1],
  ["to-read-again", 2],
  ["finished", 3],
]);

const BOOK_WIDTH_PX = 86;
const BOOK_GAP_PX = 8;
const ROW_PADDING_PX = 16;

const resizeObservers = new WeakMap<HTMLElement, ResizeObserver>();

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  const single = asString(value);
  return single ? [single] : [];
}

function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value) || /^#[0-9a-fA-F]{3}$/.test(value);
}

export function shelfColorFor(item: {
  spine_color?: string;
  title: string;
  path: string;
}): string {
  const explicit = asString(item.spine_color);
  if (isValidHexColor(explicit)) return explicit;

  const source = `${item.title}\n${item.path}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  const color = (hash & 0xffffff) | 0x303030;
  return `#${color.toString(16).padStart(6, "0").slice(-6)}`;
}

function statusRank(status: string): number {
  return STATUS_ORDER.get(status) ?? 99;
}

export function buildBookShelfItems(files: HobbyItemMeta[]): BookShelfItem[] {
  return files
    .filter(
      (file) =>
        file.frontmatter.type === "atomic-item" &&
        file.frontmatter.activity === "reading",
    )
    .map((file) => {
      const title = asString(file.frontmatter.title) || file.basename;
      const status = asString(file.frontmatter.status) || "to-read";
      const cover = asString(file.frontmatter.cover);
      const description = asString(file.frontmatter.description);
      return {
        path: file.path,
        title,
        authors: asStringList(file.frontmatter.authors),
        status,
        spineColor: shelfColorFor({
          title,
          path: file.path,
          spine_color: asString(file.frontmatter.spine_color),
        }),
        ...(cover ? { cover } : {}),
        ...(description ? { description } : {}),
      };
    })
    .sort(
      (a, b) =>
        statusRank(a.status) - statusRank(b.status) ||
        a.title.localeCompare(b.title) ||
        a.path.localeCompare(b.path),
    );
}

/** Normalize frontmatter cover values into URL or vault path refs. */
export function parseCoverRef(raw: string): CoverRef {
  const value = raw.trim();
  if (!value) return { kind: "none" };
  if (
    /^https?:\/\//i.test(value) ||
    /^app:\/\//i.test(value) ||
    /^data:image\//i.test(value)
  ) {
    return { kind: "url", src: value };
  }

  let path = value;
  const wiki = value.match(/^\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]$/);
  if (wiki) path = wiki[1].trim();
  path = path.replace(/^\.\//, "").trim();
  if (!path) return { kind: "none" };
  return { kind: "vault", path };
}

export function resolveCoverSrc(
  cover: string | undefined,
  data: Pick<VaultDataSource, "resolveResourcePath">,
  sourcePath: string,
): string | null {
  const ref = parseCoverRef(cover ?? "");
  if (ref.kind === "none") return null;
  if (ref.kind === "url") return ref.src;
  return data.resolveResourcePath(ref.path, sourcePath);
}

/** How many upright books fit on one plank for the current editor width. */
export function booksPerRow(
  containerWidth: number,
  bookWidth = BOOK_WIDTH_PX,
  gap = BOOK_GAP_PX,
  padding = ROW_PADDING_PX,
): number {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return 1;
  const available = Math.max(0, containerWidth - padding);
  const per = Math.floor((available + gap) / (bookWidth + gap));
  return Math.max(1, per);
}

export function chunkItems<T>(items: T[], size: number): T[][] {
  const rowSize = Math.max(1, Math.floor(size));
  if (!items.length) return [[]];
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += rowSize) {
    rows.push(items.slice(index, index + rowSize));
  }
  return rows;
}

function createBook(
  parent: HTMLElement,
  item: BookShelfItem,
  data: VaultDataSource,
  language: Language,
): void {
  const button = parent.createEl("button", {
    cls: "atomic-book",
    attr: {
      type: "button",
      "aria-label": t("view.bookShelf.open", language, { title: item.title }),
    },
  });
  button.style.setProperty("--atomic-book-color", item.spineColor);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    void data.openPath(item.path);
  });

  const volume = button.createDiv({ cls: "atomic-book-volume" });
  const pages = volume.createDiv({ cls: "atomic-book-pages" });
  pages.createDiv({ cls: "atomic-book-page-title", text: item.title });
  pages.createDiv({
    cls: "atomic-book-page-author",
    text: item.authors[0] || item.status,
  });

  const cover = volume.createDiv({ cls: "atomic-book-cover" });
  const face = cover.createDiv({ cls: "atomic-book-cover-face" });
  const coverSrc = resolveCoverSrc(item.cover, data, item.path);
  if (coverSrc) {
    face.createEl("img", {
      cls: "atomic-book-cover-image",
      attr: { src: coverSrc, alt: "" },
    });
  } else {
    face.createDiv({ cls: "atomic-book-cover-title", text: item.title });
  }
  cover.createDiv({ cls: "atomic-book-cover-inside" });
  cover.createDiv({ cls: "atomic-book-cover-sleeve" });
  face.createDiv({ cls: "atomic-book-cover-shine" });

  const spine = volume.createDiv({ cls: "atomic-book-spine" });
  spine.createDiv({ cls: "atomic-book-spine-title", text: item.title });

  const detail = button.createDiv({ cls: "atomic-book-detail" });
  detail.createDiv({ cls: "atomic-book-detail-title", text: item.title });
  detail.createDiv({
    cls: "atomic-book-detail-author",
    text: item.authors.join(", ") || item.status,
  });
  if (item.description) {
    detail.createDiv({
      cls: "atomic-book-detail-description",
      text: item.description,
    });
  }
}

function paintRows(
  frame: HTMLElement,
  items: BookShelfItem[],
  perRow: number,
  data: VaultDataSource,
  language: Language,
): void {
  frame.empty();
  const rows = items.length ? chunkItems(items, perRow) : [[]];
  for (const rowItems of rows) {
    const row = frame.createDiv({ cls: "atomic-book-shelf-row" });
    const books = row.createDiv({ cls: "atomic-book-row-books" });
    if (!rowItems.length) {
      books.createDiv({
        cls: "atomic-book-empty",
        text: t("view.bookShelf.empty", language),
      });
    } else {
      for (const item of rowItems) createBook(books, item, data, language);
    }
    row.createDiv({ cls: "atomic-book-shelf-plank" });
  }
}

export function renderBookShelf(
  el: HTMLElement,
  data: VaultDataSource,
  activityTypes: ActivityType[],
  options: Record<string, string>,
  language: Language,
): void {
  resizeObservers.get(el)?.disconnect();
  resizeObservers.delete(el);
  el.empty();

  const root = el.createDiv({ cls: "fitness-plugin atomic-book-shelf" });
  const activityId = options.activity?.trim() || "reading";
  const activity = hobbyActivities(activityTypes).find(
    (candidate) => candidate.id === activityId,
  );
  if (!activity) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.bookShelf.noActivity", language, { activity: activityId }),
    });
    return;
  }

  const items = buildBookShelfItems(data.listHobbyItems(activity));
  root.createEl("h3", { text: t("view.bookShelf.title", language) });
  const frame = root.createDiv({ cls: "atomic-book-shelf-frame" });

  let lastPerRow = -1;
  const layout = (): void => {
    const perRow = booksPerRow(frame.clientWidth || frame.getBoundingClientRect().width);
    if (perRow === lastPerRow && frame.childElementCount > 0) return;
    lastPerRow = perRow;
    paintRows(frame, items, perRow, data, language);
  };

  layout();

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => layout());
    observer.observe(frame);
    resizeObservers.set(el, observer);
  }
}
