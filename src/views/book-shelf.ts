import type { VaultDataSource } from "../data/vault-source";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType, HobbyItemMeta } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { DEFAULT_READING_STATUS, matchesBookShelfStatus, resolveBookShelfStatuses, statusRank } from "../core/reading-status.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { hobbyActivities } from "../util/activity-types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { BOOK_GAP_PX, DEFAULT_BOOK_WIDTH_PX, ROW_PADDING_PX, bookHeightForWidth, bookWidthForContainer, booksPerRow, chunkItems } from "../util/book-shelf-layout.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { measureElementWidth } from "../util/element-width.ts";

export { bookHeightForWidth, bookWidthForContainer, booksPerRow, chunkItems };

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

const resizeObservers = new WeakMap<HTMLElement, ResizeObserver>();
const windowListeners = new WeakMap<HTMLElement, () => void>();

type OverflowElement = {
  className?: string;
  style: { overflow: string };
  parentElement: OverflowElement | null;
  setCssStyles: (styles: { overflow: string }) => void;
};

function setOverflowVisible(el: OverflowElement | HTMLElement): void {
  el.setCssStyles({ overflow: "visible" });
}

/** Codeblock wrappers that clip the hover title bubble if overflow stays hidden. */
export function shouldUnclipBookShelfAncestor(className: string): boolean {
  return className.split(/\s+/).some((token) => {
    const t = token.toLowerCase();
    return (
      t.includes("code-block") ||
      t.includes("codeblock") ||
      t === "cm-embed-block" ||
      t.includes("internal-embed")
    );
  });
}

/** Note scrollers must keep overflow so the pane still scrolls. */
export function isBookShelfUnclipStop(className: string): boolean {
  const t = className.toLowerCase();
  return (
    t.includes("markdown-preview-view") ||
    t.includes("markdown-source-view") ||
    t.includes("cm-scroller") ||
    t.includes("workspace-leaf")
  );
}

export function unclipBookShelfAncestors(
  el: OverflowElement | HTMLElement,
  maxDepth = 8,
): void {
  let current: OverflowElement | HTMLElement | null = el;
  let depth = 0;
  let reachedKnownWrapper = false;
  while (current && depth < maxDepth) {
    const className = current.className ?? "";
    if (isBookShelfUnclipStop(className)) break;
    const knownWrapper = shouldUnclipBookShelfAncestor(className);
    if (depth === 0 || !reachedKnownWrapper || knownWrapper) {
      setOverflowVisible(current);
    }
    if (knownWrapper) reachedKnownWrapper = true;
    current = current.parentElement;
    depth += 1;
  }
}

/** Viewport coords for a title bubble centered above a book. */
export function bookDetailFixedPosition(args: {
  bookTop: number;
  bookLeft: number;
  bookWidth: number;
  gap?: number;
}): { left: number; top: number } {
  const gap = args.gap ?? 8;
  return {
    left: args.bookLeft + args.bookWidth / 2,
    top: args.bookTop - gap,
  };
}

const activeDetailHides = new Set<() => void>();

function hideAllPortedDetails(): void {
  for (const hide of [...activeDetailHides]) hide();
}

function bindBookDetailPortal(
  button: HTMLElement,
  detail: HTMLElement,
): { show: () => void; hide: () => void } {
  const doc = button.ownerDocument;
  let ported = false;

  const place = (): void => {
    if (!ported) return;
    if (!button.isConnected) {
      hide();
      return;
    }
    const rect = button.getBoundingClientRect();
    const pos = bookDetailFixedPosition({
      bookTop: rect.top,
      bookLeft: rect.left,
      bookWidth: rect.width,
    });
    detail.setCssStyles({
      left: `${pos.left}px`,
      top: `${pos.top}px`,
    });
  };

  const hide = (): void => {
    if (!ported) return;
    ported = false;
    activeDetailHides.delete(hide);
    doc.removeEventListener("scroll", place, true);
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", place);
    }
    detail.classList.remove("is-ported");
    detail.setCssStyles({ left: "", top: "" });
    if (button.isConnected) button.appendChild(detail);
    else detail.remove();
  };

  const show = (): void => {
    const body = doc.body;
    if (!body) return;
    if (ported) {
      place();
      return;
    }
    hideAllPortedDetails();
    ported = true;
    activeDetailHides.add(hide);
    detail.classList.add("is-ported");
    body.appendChild(detail);
    place();
    doc.addEventListener("scroll", place, true);
    if (typeof window !== "undefined") {
      window.addEventListener("resize", place);
    }
  };

  button.addEventListener("pointerenter", show);
  button.addEventListener("pointerleave", hide);
  button.addEventListener("focus", show);
  button.addEventListener("blur", hide);
  return { show, hide };
}

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

export function buildBookShelfItems(
  files: HobbyItemMeta[],
  activityId = "reading",
  statusFilter: string[] | null = null,
): BookShelfItem[] {
  return files
    .filter(
      (file) =>
        file.frontmatter.type === "atomic-item" &&
        file.frontmatter.activity === activityId,
    )
    .map((file) => {
      const title = asString(file.frontmatter.title) || file.basename;
      const status = asString(file.frontmatter.status) || DEFAULT_READING_STATUS;
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
    .filter((item) => matchesBookShelfStatus(item.status, statusFilter))
    .sort(
      (a, b) =>
        statusRank(a.status) - statusRank(b.status) ||
        a.title.localeCompare(b.title) ||
        a.path.localeCompare(b.path),
    );
}

const SAFE_REMOTE_COVER =
  /^(https?:\/\/|app:\/\/)/i;
const SAFE_RASTER_DATA_COVER =
  /^data:image\/(png|jpe?g|gif|webp|avif|bmp)(;|,)/i;

/** Normalize frontmatter cover values into URL or vault path refs. */
export function parseCoverRef(raw: string): CoverRef {
  const value = raw.trim();
  if (!value) return { kind: "none" };
  if (/^(javascript|vbscript|data):/i.test(value)) {
    if (SAFE_RASTER_DATA_COVER.test(value)) return { kind: "url", src: value };
    return { kind: "none" };
  }
  if (SAFE_REMOTE_COVER.test(value)) {
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

/**
 * Upright covers are ~2:3. Wider images usually include a left-edge spine
 * (Hardcover-style 3D renders, photos of physical books). Pin to the right
 * so object-fit:cover shows the front face, matching desktop shelves.
 */
const COVER_SPINE_WIDE_RATIO = 0.72;

export function coverObjectPosition(
  naturalWidth: number,
  naturalHeight: number,
): string {
  if (
    !Number.isFinite(naturalWidth) ||
    !Number.isFinite(naturalHeight) ||
    naturalWidth <= 0 ||
    naturalHeight <= 0
  ) {
    return "center";
  }
  return naturalWidth / naturalHeight > COVER_SPINE_WIDE_RATIO
    ? "right center"
    : "center";
}

function bindCoverObjectPosition(img: HTMLImageElement): void {
  const apply = (): void => {
    img.style.objectPosition = coverObjectPosition(
      img.naturalWidth,
      img.naturalHeight,
    );
  };
  if (img.complete) apply();
  else img.addEventListener("load", apply, { once: true });
}

const COVER_OPEN_CLASS = "is-cover-open";

export function hoverFinePointer(
  media: Pick<MediaQueryList, "matches"> | null | undefined,
): boolean {
  return Boolean(media?.matches);
}

/** Coarse pointers peek the cover first; a second tap opens the note. */
export function bookClickOpensNote(options: {
  hoverFine: boolean;
  coverOpen: boolean;
}): boolean {
  return options.hoverFine || options.coverOpen;
}

function hoverFineMedia(): Pick<MediaQueryList, "matches"> | null {
  if (typeof matchMedia !== "function") return null;
  return matchMedia("(hover: hover) and (pointer: fine)");
}

function closeOpenCovers(root: ParentNode): void {
  root.querySelectorAll(`.atomic-book.${COVER_OPEN_CLASS}`).forEach((el) => {
    el.classList.remove(COVER_OPEN_CLASS);
  });
}

/** Smaller cover/page type for long titles so they wrap inside the book face. */
export function titleLengthClass(title: string): string {
  const length = title.trim().length;
  if (length > 36) return "is-title-xs";
  if (length > 22) return "is-title-sm";
  return "";
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
      "data-testid": "atomic-book",
      "data-title": item.title,
      "data-status": item.status,
      "aria-label": t("view.bookShelf.open", language, { title: item.title }),
    },
  });
  button.style.setProperty("--atomic-book-color", item.spineColor);

  const titleClass = titleLengthClass(item.title);
  const volume = button.createDiv({ cls: "atomic-book-volume" });
  const pages = volume.createDiv({ cls: "atomic-book-pages" });
  pages.createDiv({
    cls: ["atomic-book-page-title", titleClass].filter(Boolean).join(" "),
    text: item.title,
  });
  pages.createDiv({
    cls: "atomic-book-page-author",
    text: item.authors[0] || item.status,
  });

  const cover = volume.createDiv({ cls: "atomic-book-cover" });
  const face = cover.createDiv({ cls: "atomic-book-cover-face" });
  const coverSrc = resolveCoverSrc(item.cover, data, item.path);
  if (coverSrc) {
    const img = face.createEl("img", {
      cls: "atomic-book-cover-image",
      attr: { src: coverSrc, alt: "" },
    });
    bindCoverObjectPosition(img);
  } else {
    face.createDiv({
      cls: ["atomic-book-cover-title", titleClass].filter(Boolean).join(" "),
      text: item.title,
    });
  }
  cover.createDiv({ cls: "atomic-book-cover-inside" });
  cover.createDiv({ cls: "atomic-book-cover-sleeve" });

  const spine = volume.createDiv({ cls: "atomic-book-spine" });
  spine.createDiv({
    cls: ["atomic-book-spine-title", titleClass].filter(Boolean).join(" "),
    text: item.title,
  });

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

  const portal = bindBookDetailPortal(button, detail);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    const hoverFine = hoverFinePointer(hoverFineMedia());
    const coverOpen = button.classList.contains(COVER_OPEN_CLASS);
    if (!bookClickOpensNote({ hoverFine, coverOpen })) {
      const shelf = parent.closest(".atomic-book-shelf") ?? parent;
      closeOpenCovers(shelf);
      button.classList.add(COVER_OPEN_CLASS);
      portal.show();
      return;
    }
    portal.hide();
    void data.openPath(item.path);
  });
}

function paintRows(
  frame: HTMLElement,
  items: BookShelfItem[],
  perRow: number,
  data: VaultDataSource,
  language: Language,
  emptyText: string,
): void {
  hideAllPortedDetails();
  frame.empty();
  const rows = items.length ? chunkItems(items, perRow) : [[]];
  for (const rowItems of rows) {
    const row = frame.createDiv({ cls: "atomic-book-shelf-row" });
    const books = row.createDiv({ cls: "atomic-book-row-books" });
    if (!rowItems.length) {
      books.createDiv({
        cls: "atomic-book-empty",
        text: emptyText,
      });
    } else {
      for (const item of rowItems) createBook(books, item, data, language);
    }
    row.createDiv({ cls: "atomic-book-shelf-plank" });
  }
}

function applyBookSize(frame: HTMLElement, bookWidth: number): void {
  const height = bookHeightForWidth(bookWidth);
  frame.style.setProperty("--atomic-book-width", `${bookWidth}px`);
  frame.style.setProperty("--atomic-book-height", `${height}px`);
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
  const previousWindowListener = windowListeners.get(el);
  if (previousWindowListener) {
    window.removeEventListener("resize", previousWindowListener);
    windowListeners.delete(el);
  }
  hideAllPortedDetails();
  el.empty();
  // Keep hover title bubbles visible above books (preview codeblocks often clip).
  unclipBookShelfAncestors(el);

  const root = el.createDiv({
    cls: "fitness-plugin atomic-book-shelf",
    attr: { "data-testid": "atomic-bookshelf" },
  });
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

  const { statuses, invalidStatuses } = resolveBookShelfStatuses(options.status);
  if (invalidStatuses.length > 0) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.bookShelf.invalidStatuses", language, {
        statuses: invalidStatuses.join(", "),
      }),
    });
  }

  const items = buildBookShelfItems(
    data.listHobbyItems(activity),
    activityId,
    statuses,
  );
  const emptyText =
    statuses && statuses.length > 0
      ? t("view.bookShelf.emptyFiltered", language, {
          statuses: statuses.join(", "),
        })
      : t("view.bookShelf.empty", language);
  const frame = root.createDiv({ cls: "atomic-book-shelf-frame" });
  let lastKey = "";

  const layout = (): void => {
    const fallback =
      typeof window !== "undefined" && Number.isFinite(window.innerWidth)
        ? window.innerWidth
        : DEFAULT_BOOK_WIDTH_PX * 3 + BOOK_GAP_PX * 2 + ROW_PADDING_PX;
    const width = measureElementWidth(frame, fallback);
    const bookWidth = bookWidthForContainer(width);
    const perRow = booksPerRow(width, bookWidth);
    const key = `${bookWidth}:${perRow}`;
    if (key === lastKey && frame.childElementCount > 0) return;
    lastKey = key;
    applyBookSize(frame, bookWidth);
    paintRows(frame, items, perRow, data, language, emptyText);
  };

  layout();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(layout);
  });

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => layout());
    observer.observe(frame);
    resizeObservers.set(el, observer);
    return;
  }

  // Fallback only: a window listener holds `el` until removed, so it would
  // leak across note unmounts until the next resize if registered alongside
  // ResizeObserver (which Obsidian's WebViews always provide).
  const onWindowResize = (): void => {
    if (!el.isConnected) {
      window.removeEventListener("resize", onWindowResize);
      windowListeners.delete(el);
      return;
    }
    layout();
  };
  window.addEventListener("resize", onWindowResize);
  windowListeners.set(el, onWindowResize);
}
