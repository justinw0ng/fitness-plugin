import { App, TFile, TFolder, normalizePath } from "obsidian";
import type { SessionMeta } from "../types";

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
  constructor(private app: App) {}

  listSessions(folder: string, year: number): SessionMeta[] {
    const prefix = normalizePath(`${folder}/${year}/`);
    const out: SessionMeta[] = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!file.path.startsWith(prefix)) continue;
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
      const p = normalizePath(f);
      return norm === p || norm.startsWith(p + "/");
    });
  }

  getFolder(path: string): TFolder | null {
    const af = this.app.vault.getAbstractFileByPath(normalizePath(path));
    return af instanceof TFolder ? af : null;
  }
}
