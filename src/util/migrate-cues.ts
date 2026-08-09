/** Rewrite top-level fenced codeblock language `fitness-cues` → `fitness-golf-cues`. */

type OpenFence = {
  marker: "`" | "~";
  length: number;
};

const OPEN_RE = /^( {0,3})(```+|~~~+)([^\n]*)$/;
const CLOSE_RE = /^( {0,3})(```+|~~~+)[ \t]*$/;

function parseInfoLanguage(info: string): string {
  return info.trim().split(/\s+/, 1)[0] || "";
}

/**
 * Only rewrites opening fences that are not nested inside another fence.
 * Supports CommonMark indentation (0–3 spaces) and ``` / ~~~ markers.
 */
export function rewriteFitnessCuesFences(markdown: string): {
  markdown: string;
  replacements: number;
} {
  const lines = String(markdown).split(/\r?\n/);
  let open: OpenFence | null = null;
  let replacements = 0;

  const out = lines.map((line) => {
    if (open) {
      const close = line.match(CLOSE_RE);
      if (
        close &&
        close[2][0] === open.marker &&
        close[2].length >= open.length
      ) {
        open = null;
      }
      return line;
    }

    const m = line.match(OPEN_RE);
    if (!m) return line;

    const indent = m[1];
    const fence = m[2];
    const info = m[3] ?? "";
    const marker = fence[0] as "`" | "~";
    const length = fence.length;
    const lang = parseInfoLanguage(info);

    if (lang === "fitness-cues") {
      replacements += 1;
      const rest = info.replace(/^\s*fitness-cues\b/, "fitness-golf-cues");
      open = { marker, length };
      return `${indent}${fence}${rest}`;
    }

    open = { marker, length };
    return line;
  });

  return {
    markdown: out.join(markdown.includes("\r\n") ? "\r\n" : "\n"),
    replacements,
  };
}
