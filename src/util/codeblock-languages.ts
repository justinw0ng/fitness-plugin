export const ATOMIC_CODEBLOCK_LANGUAGES: readonly string[] = [
  "atomic-heatmap",
  "atomic-today",
  "atomic-dashboard",
  "atomic-actions",
  "atomic-golf-cues",
  "atomic-gym-cues",
  "atomic-cues",
  "atomic-timer",
  "atomic-bookshelf",
];

export function codeblockLanguages(): string[] {
  return [...ATOMIC_CODEBLOCK_LANGUAGES];
}

export function resolveCueActivity(
  kind: string,
  options: Record<string, string>,
): string | null {
  if (kind === "atomic-golf-cues") return "golf";
  if (kind === "atomic-gym-cues") return "gym";
  if (kind !== "atomic-cues") return null;

  const activity = options.activity?.trim();
  return activity || null;
}
