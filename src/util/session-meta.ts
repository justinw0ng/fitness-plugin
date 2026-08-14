import type { SessionMeta } from "../types";

function asList(value: unknown): string[] {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  const s = String(value).trim();
  return s ? [s] : [];
}

export function resolveSessionDate(
  frontmatter: Record<string, unknown> | undefined,
  basename: string,
): string | null {
  if (frontmatter?.date != null && frontmatter.date !== "") {
    const raw = String(frontmatter.date);
    const m = raw.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(basename)) return basename;
  return null;
}

export function sessionMetaFromFile(params: {
  path: string;
  basename: string;
  frontmatter: Record<string, unknown> | undefined;
}): SessionMeta {
  const fm = params.frontmatter ?? {};
  return {
    path: params.path,
    basename: params.basename,
    date: resolveSessionDate(params.frontmatter, params.basename),
    duration_min: Number(fm.duration_min) || 0,
    weight_unit: fm.weight_unit === "lb" ? "lb" : "kg",
    focus: asList(fm.focus),
    felt: String(fm.felt || ""),
  };
}
