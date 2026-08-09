export const ATOMIC_CODEBLOCK_LANGUAGES: readonly string[] = [
  "atomic-heatmap",
  "atomic-today",
  "atomic-dashboard",
  "atomic-actions",
  "atomic-golf-cues",
  "atomic-gym-cues",
  "atomic-cues",
];

export const FITNESS_CODEBLOCK_ALIASES: readonly string[] = [
  "fitness-heatmap",
  "fitness-today",
  "fitness-dashboard",
  "fitness-actions",
  "fitness-golf-cues",
  "fitness-gym-cues",
  "fitness-cues",
];

const FITNESS_TO_ATOMIC: Record<string, string> = {
  "fitness-heatmap": "atomic-heatmap",
  "fitness-today": "atomic-today",
  "fitness-dashboard": "atomic-dashboard",
  "fitness-actions": "atomic-actions",
  "fitness-golf-cues": "atomic-golf-cues",
  "fitness-gym-cues": "atomic-gym-cues",
  "fitness-cues": "atomic-golf-cues",
};

export function codeblockLanguages(
  deprecatedFitnessBlocksEnabled: boolean,
): string[] {
  return deprecatedFitnessBlocksEnabled
    ? [...ATOMIC_CODEBLOCK_LANGUAGES, ...FITNESS_CODEBLOCK_ALIASES]
    : [...ATOMIC_CODEBLOCK_LANGUAGES];
}

export function resolveCodeblockKind(kind: string): string {
  return FITNESS_TO_ATOMIC[kind] ?? kind;
}

export function resolveCueActivity(
  kind: string,
  options: Record<string, string>,
): string | null {
  const resolvedKind = resolveCodeblockKind(kind);
  if (resolvedKind === "atomic-golf-cues") return "golf";
  if (resolvedKind === "atomic-gym-cues") return "gym";
  if (resolvedKind !== "atomic-cues") return null;

  const activity = options.activity?.trim();
  return activity || null;
}
