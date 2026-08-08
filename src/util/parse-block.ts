/** Minimal key: value parser for codeblock source. */

export function parseBlockOptions(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of String(source || "").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+?)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
