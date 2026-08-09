import { App, TFile, TFolder, normalizePath } from "obsidian";
import {
  parseTimeLog,
  type TimeLogEntry,
} from "../core/hobby";
import type { ActivityType, HobbyItemMeta, SessionMeta } from "../types";
import { HobbyTimeLogCache } from "../util/hobby-time-log-cache";
import {
  hobbyItemsScanPrefix,
  isSafeVaultFolder,
  sessionScanPrefix,
} from "../util/vault-path";

function asList(value: unknown): string[] {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  const s = String(value).trim();
  return s ? [s] : [];
}

function resolveDate(
  frontmatter: Record<string, unknown> | undefined,
  basename: string,
): string | null {
  if (frontmatter?.date != null && frontmatter.date !== "") {
    const raw = String(frontmatter.date);
    // Obsidian may store dates as YYYY-MM-DD or full ISO
    const m = raw.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(basename)) return basename;
  return null;
}

export class VaultDataSource {
  private readonly hobbyTimeLogCache = new HobbyTimeLogCache();

  constructor(private app: App) {}

  /** Drop cached Time log parses (all paths, or one path after edit/delete). */
  invalidateHobbyTimeLogCache(path?: string): void {
    this.hobbyTimeLogCache.invalidate(
      path ? normalizePath(path) : undefined,
    );
  }

  /** Keep cache entries aligned when a note is renamed. */
  renameHobbyTimeLogCache(oldPath: string, newPath: string): void {
    this.hobbyTimeLogCache.rename(normalizePath(oldPath), normalizePath(newPath));
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
    // Re-normalize with Obsidian so vault path style matches file.path
    const scanPrefix = normalizePath(prefix.replace(/\/$/, "")) + "/";
    const out: SessionMeta[] = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!file.path.startsWith(scanPrefix)) continue;
      if (!file.path.endsWith(".md")) continue;
      const cache = this.app.metadataCache.getFileCache(file);
      const fm = (cache?.frontmatter ?? {}) as Record<string, unknown>;
      out.push({
        path: file.path,
        basename: file.basename,
        date: resolveDate(fm, file.basename),
        duration_min: Number(fm.duration_min) || 0,
        weight_unit: fm.weight_unit === "lb" ? "lb" : "kg",
        focus: asList(fm.focus),
        felt: String(fm.felt || ""),
      });
    }
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
    const scanPrefix = normalizePath(prefix.replace(/\/$/, "")) + "/";
    const out: HobbyItemMeta[] = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!file.path.startsWith(scanPrefix)) continue;
      if (!file.path.endsWith(".md")) continue;
      const cache = this.app.metadataCache.getFileCache(file);
      const fm = (cache?.frontmatter ?? {}) as Record<string, unknown>;
      if (fm.type !== "atomic-item" || fm.activity !== activity.id) continue;
      out.push({
        path: file.path,
        basename: file.basename,
        frontmatter: fm,
      });
    }
    return out;
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
      await this.app.vault.modify(existing, content);
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
    if (
      /^https?:\/\//i.test(trimmed) ||
      /^app:\/\//i.test(trimmed) ||
      /^data:image\//i.test(trimmed)
    ) {
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
}
