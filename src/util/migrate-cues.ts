/** Rewrite fenced codeblock language `fitness-cues` → `fitness-golf-cues` only. */
export function rewriteFitnessCuesFences(markdown: string): {
  markdown: string;
  replacements: number;
} {
  let replacements = 0;
  const markdownOut = String(markdown).replace(
    /(^|\n)(```|~~~)(fitness-cues)(\b[^\n]*)/g,
    (_m, pre, fence, _lang, rest) => {
      replacements += 1;
      return `${pre}${fence}fitness-golf-cues${rest}`;
    },
  );
  return { markdown: markdownOut, replacements };
}
