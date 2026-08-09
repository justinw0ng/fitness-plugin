import type { TimeLogEntry } from "../core/hobby";

type CacheEntry = {
  mtime: number;
  entries: TimeLogEntry[];
};

/**
 * In-memory cache of parsed hobby Time log sections, keyed by vault path.
 * Entries are reused while the file mtime is unchanged.
 */
export class HobbyTimeLogCache {
  private readonly cache = new Map<string, CacheEntry>();

  get(path: string, mtime: number): TimeLogEntry[] | null {
    const hit = this.cache.get(path);
    if (!hit || hit.mtime !== mtime) return null;
    return hit.entries;
  }

  set(path: string, mtime: number, entries: TimeLogEntry[]): void {
    this.cache.set(path, { mtime, entries });
  }

  invalidate(path?: string): void {
    if (!path) {
      this.cache.clear();
      return;
    }
    this.cache.delete(path);
  }

  rename(oldPath: string, newPath: string): void {
    const hit = this.cache.get(oldPath);
    this.cache.delete(oldPath);
    if (!hit) {
      this.cache.delete(newPath);
      return;
    }
    this.cache.set(newPath, hit);
  }

  get size(): number {
    return this.cache.size;
  }
}
