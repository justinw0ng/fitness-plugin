/**
 * Short-lived in-memory cache for vault list scans (sessions, hobby items).
 * Entries miss after {@link VaultListCache.invalidate} bumps the generation stamp.
 */
export class VaultListCache<T> {
  private stamp = 0;
  private readonly entries = new Map<string, { stamp: number; value: T }>();

  get(key: string): T | undefined {
    const hit = this.entries.get(key);
    if (!hit || hit.stamp !== this.stamp) return undefined;
    return hit.value;
  }

  set(key: string, value: T): void {
    this.entries.set(key, { stamp: this.stamp, value });
  }

  /** Drop all cached lists; the next get misses until set. */
  invalidate(): void {
    this.stamp++;
    this.entries.clear();
  }

  get generation(): number {
    return this.stamp;
  }

  get size(): number {
    return this.entries.size;
  }
}
