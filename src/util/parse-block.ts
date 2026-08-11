/** Minimal key: value parser for codeblock source. */

export function parseBlockOptions(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of String(source || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.+?)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/\s+#.*$/, "").trim();
    out[m[1]] = value.replace(/^["']|["']$/g, "");
  }
  return out;
}
