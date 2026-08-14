import { App, TFile, TFolder, normalizePath } from "obsidian";
import {
  parseTimeLog,
  type TimeLogEntry,
} from "../core/hobby";
import type { ActivityType, DayActivity, HobbyItemMeta, SessionMeta } from "../types";
import { durationMapFromHobbyLogs, durationMapFromSessions } from "../util/duration-map";
import { markdownFilesInFolder, type VaultFolderLike } from "../util/folder-files";
import { HobbyTimeLogCache } from "../util/hobby-time-log-cache";
import { hobbyItemFromFileCache } from "../util/hobby-item-scan";
import { sessionMetaFromFile } from "../util/session-meta";
import { VaultListCache } from "../util/vault-list-cache";
import {
  hobbyItemsScanPrefix,
  isSafeVaultFolder,
  sessionScanPrefix,
} from "../util/vault-path";

export class VaultDataSource {
  private readonly hobbyTimeLogCache = new HobbyTimeLogCache();
  private readonly sessionListCache = new VaultListCache<SessionMeta[]>();
  private readonly hobbyItemListCache = new VaultListCache<HobbyItemMeta[]>();
  private readonly durationMapCache = new VaultListCache<Map<string, DayActivity>>();
  private needsMetadataRefresh = false;

  constructor(private app: App) {}

  /** Drop cached Time log parses (all paths, or one path after edit/delete). */
  invalidateHobbyTimeLogCache(path?: string): void {
    this.hobbyTimeLogCache.invalidate(
      path ? normalizePath(path) : undefined,
    );
    this.durationMapCache.invalidate(path ? normalizePath(path) : undefined);
  }

  /** Keep cache entries aligned when a note is renamed. */
  renameHobbyTimeLogCache(oldPath: string, newPath: string): void {
    this.hobbyTimeLogCache.rename(normalizePath(oldPath), normalizePath(newPath));
  }

  /** Drop cached vault list scans (sessions / hobby items / duration maps). */
  invalidateListCache(path?: string): void {
    const scoped = path ? normalizePath(path) : undefined;
    this.sessionListCache.invalidate(scoped);
    this.hobbyItemListCache.invalidate(scoped);
    this.durationMapCache.invalidate(scoped);
  }

  /**
   * True when a list scan called `metadataCache.getFileCache()` and got null
   * (file metadata not indexed yet). Callers should refresh once after
   * `metadataCache.resolved`. Empty frontmatter on an existing cache does
   * not set this flag.
   */
  consumeNeedsMetadataRefresh(): boolean {
    const needed = this.needsMetadataRefresh;
    this.needsMetadataRefresh = false;
    return needed;
  }

  /**
   * Parsed Time log entries for a hobby item note.
   * Reuses an in-memory parse while the file mtime is unchanged.
   */
  async getHobbyTimeLogEntries(path: string): Promise<TimeLogEntry[]> {
    const file = this.getFileByPath(path);
    if (!file) return [];
    const mtime = file.stat.mtime;
    const cached = this.hobbyTimeLogCache.get(file.path, mtime);
    if (cached) return cached;

    const markdown = await this.app.vault.cachedRead(file);
    const entries = parseTimeLog(markdown);
    this.hobbyTimeLogCache.set(file.path, mtime, entries);
    return entries;
  }

  listSessions(folder: string, year: number): SessionMeta[] {
    const prefix = sessionScanPrefix(folder, year);
    if (!prefix) return [];
    const cached = this.sessionListCache.get(prefix);
    if (cached) return cached;

    const out: SessionMeta[] = [];
    for (const file of this.markdownNotesInFolder(prefix.replace(/\/$/, ""))) {
      const cache = this.fileCache(file);
      out.push(
        sessionMetaFromFile({
          path: file.path,
          basename: file.basename,
          frontmatter: cache == null ? undefined : (cache.frontmatter ?? {}),
        }),
      );
    }
    this.sessionListCache.set(prefix, out, prefix);
    return out;
  }

  listHobbyItems(activity: ActivityType): HobbyItemMeta[] {
    if (
      activity.domain !== "hobby" ||
      activity.noteModel !== "item" ||
      !activity.supportsTimer
    ) {
      return [];
    }
    const prefix = hobbyItemsScanPrefix(activity.folder);
    if (!prefix) return [];
    const cacheKey = `${activity.id}\0${prefix}`;
    const cached = this.hobbyItemListCache.get(cacheKey);
    if (cached) return cached;

    const out: HobbyItemMeta[] = [];
    for (const file of this.markdownNotesInFolder(prefix.replace(/\/$/, ""))) {
      const cache = this.fileCache(file);
      const item = hobbyItemFromFileCache({
        path: file.path,
        basename: file.basename,
        frontmatter: cache == null ? null : (cache.frontmatter ?? {}),
        activityId: activity.id,
      });
      if (item) out.push(item);
    }
    this.hobbyItemListCache.set(cacheKey, out, prefix);
    return out;
  }

  /**
   * Minutes-by-date for one activity/year. Shared by every heatmap that
   * asks for the same pair until a touching vault path invalidates it.
   */
  async getActivityDurationMap(
    activity: ActivityType,
    year: number,
  ): Promise<Map<string, DayActivity>> {
    const prefix =
      activity.domain === "hobby"
        ? hobbyItemsScanPrefix(activity.folder)
        : sessionScanPrefix(activity.folder, year);
    if (!prefix) return new Map();
    const cacheKey = `${activity.id}\0${prefix}\0${year}`;
    const cached = this.durationMapCache.get(cacheKey);
    if (cached) return cached;

    if (activity.domain === "hobby") {
      const items = this.listHobbyItems(activity);
      const perItem = await Promise.all(
        items.map(async (item) => ({
          path: item.path,
          entries: await this.getHobbyTimeLogEntries(item.path),
        })),
      );
      const map = durationMapFromHobbyLogs(perItem, year);
      this.durationMapCache.set(cacheKey, map, prefix);
      return map;
    }

    const map = durationMapFromSessions(this.listSessions(activity.folder, year));
    this.durationMapCache.set(cacheKey, map, prefix);
    return map;
  }

  async readBody(path: string): Promise<string> {
    const af = this.app.vault.getAbstractFileByPath(normalizePath(path));
    if (!(af instanceof TFile)) return "";
    return this.app.vault.read(af);
  }

  exists(path: string): boolean {
    return !!this.app.vault.getAbstractFileByPath(normalizePath(path));
  }

  async ensureFolder(folderPath: string): Promise<void> {
    const norm = normalizePath(folderPath);
    if (this.app.vault.getAbstractFileByPath(norm)) return;
    const parts = norm.split("/").filter(Boolean);
    let cur = "";
    for (const part of parts) {
      cur = cur ? `${cur}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(cur)) {
        await this.app.vault.createFolder(cur);
      }
    }
  }

  async createNote(path: string, content: string): Promise<TFile> {
    const norm = normalizePath(path);
    const parent = norm.includes("/")
      ? norm.slice(0, norm.lastIndexOf("/"))
      : "";
    if (parent) await this.ensureFolder(parent);
    return this.app.vault.create(norm, content);
  }

  async writeNote(path: string, content: string): Promise<TFile> {
    const norm = normalizePath(path);
    const existing = this.app.vault.getAbstractFileByPath(norm);
    if (existing instanceof TFile) {
      await this.app.vault.process(existing, () => content);
      return existing;
    }
    return this.createNote(norm, content);
  }

  async openPath(path: string): Promise<void> {
    const norm = normalizePath(path);
    const file = this.app.vault.getAbstractFileByPath(norm);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(file);
      return;
    }
    // Create-on-open not desired; open via link text for missing files
    await this.app.workspace.openLinkText(norm, "", false);
  }

  getFileByPath(path: string): TFile | null {
    const af = this.app.vault.getAbstractFileByPath(normalizePath(path));
    return af instanceof TFile ? af : null;
  }

  isUnderSeriesFolder(path: string, folders: string[]): boolean {
    const norm = normalizePath(path);
    return folders.some((f) => {
      if (!isSafeVaultFolder(f)) return false;
      const p = normalizePath(f);
      return norm === p || norm.startsWith(p + "/");
    });
  }

  getFolder(path: string): TFolder | null {
    const af = this.app.vault.getAbstractFileByPath(normalizePath(path));
    return af instanceof TFolder ? af : null;
  }

  /** Resolve a vault path/wikilink target (or absolute URL) into an img src. */
  resolveResourcePath(linkOrPath: string, sourcePath = ""): string | null {
    const trimmed = linkOrPath.trim();
    if (!trimmed) return null;
    if (/^(javascript|vbscript):/i.test(trimmed)) return null;
    if (/^data:/i.test(trimmed)) {
      if (!/^data:image\/(png|jpe?g|gif|webp|avif|bmp)(;|,)/i.test(trimmed)) {
        return null;
      }
      return trimmed;
    }
    if (/^https?:\/\//i.test(trimmed) || /^app:\/\//i.test(trimmed)) {
      return trimmed;
    }

    const fromLink = this.app.metadataCache.getFirstLinkpathDest(
      trimmed,
      sourcePath,
    );
    const fromPath = this.app.vault.getAbstractFileByPath(normalizePath(trimmed));
    const file =
      fromLink instanceof TFile
        ? fromLink
        : fromPath instanceof TFile
          ? fromPath
          : null;
    if (!file) return null;
    return this.app.vault.getResourcePath(file);
  }

  private markdownNotesInFolder(folderPath: string): TFile[] {
    const folder = this.app.vault.getAbstractFileByPath(normalizePath(folderPath));
    return markdownFilesInFolder(asFolderLike(folder)) as TFile[];
  }

  private fileCache(file: TFile): { frontmatter?: Record<string, unknown> } | null {
    const cache = this.app.metadataCache.getFileCache(file);
    if (cache == null) this.needsMetadataRefresh = true;
    return cache;
  }
}

function asFolderLike(node: unknown): VaultFolderLike | null {
  if (!node || typeof node !== "object") return null;
  if (!("children" in node) || !Array.isArray((node as VaultFolderLike).children)) {
    return null;
  }
  return node as VaultFolderLike;
}
