/**
 * Short-lived in-memory cache for vault list scans (sessions, hobby items).
 * Entries miss after a full {@link VaultListCache.invalidate} bumps the generation stamp.
 * Path-scoped invalidation drops only entries whose scan folder touches that path.
 */
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { pathTouchesScope } from "./vault-path.ts";

type CacheEntry<T> = {
  stamp: number;
  value: T;
  scope: string;
};

export class VaultListCache<T> {
  private stamp = 0;
  private readonly entries = new Map<string, CacheEntry<T>>();

  get(key: string): T | undefined {
    const hit = this.entries.get(key);
    if (!hit || hit.stamp !== this.stamp) return undefined;
    return hit.value;
  }

  set(key: string, value: T, scope = ""): void {
    this.entries.set(key, { stamp: this.stamp, value, scope });
  }

  /**
   * Drop cached lists. With a path, only entries whose scope touches that path.
   * With no path, drop everything and bump the generation stamp.
   */
  invalidate(path?: string): void {
    if (path == null || path === "") {
      this.stamp++;
      this.entries.clear();
      return;
    }
    for (const [key, entry] of [...this.entries]) {
      if (!entry.scope || pathTouchesScope(path, entry.scope)) {
        this.entries.delete(key);
      }
    }
  }

  get generation(): number {
    return this.stamp;
  }

  get size(): number {
    return this.entries.size;
  }
}
