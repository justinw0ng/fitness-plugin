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

const STATUS_ORDER = new Map([
  ["reading", 0],
  ["to-read", 1],
  ["to-read-again", 2],
  ["finished", 3],
]);

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

function isImageUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^app:\/\//i.test(value);
}

function chunkItems(items: BookShelfItem[], size: number): BookShelfItem[][] {
  const rows: BookShelfItem[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
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
  if (item.cover && isImageUrl(item.cover)) {
    cover.createEl("img", {
      cls: "atomic-book-cover-image",
      attr: { src: item.cover, alt: "" },
    });
  } else {
    cover.createDiv({ cls: "atomic-book-cover-title", text: item.title });
  }
  cover.createDiv({ cls: "atomic-book-cover-shine" });

  const spine = volume.createDiv({ cls: "atomic-book-spine" });
  spine.createDiv({ cls: "atomic-book-spine-title", text: item.title });

  const detail = button.createDiv({ cls: "atomic-book-detail" });
  detail.createDiv({ cls: "atomic-book-detail-title", text: item.title });
  detail.createDiv({
    cls: "atomic-book-detail-author",
    text: item.authors.join(", ") || item.status,
  });
  if (item.description) {
    detail.createDiv({ cls: "atomic-book-detail-description", text: item.description });
  }
}

export function renderBookShelf(
  el: HTMLElement,
  data: VaultDataSource,
  activityTypes: ActivityType[],
  options: Record<string, string>,
  language: Language,
): void {
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
  const rows = items.length ? chunkItems(items, 8) : [[]];
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
