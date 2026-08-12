import type { HobbyItemMeta } from "../types";

/**
 * Build a hobby item from vault metadata.
 * When frontmatter is missing (iOS/mobile cache not ready), include the file
 * provisionally so the book shelf is not empty until `resolved` refreshes.
 */
export function hobbyItemFromFileCache(params: {
  path: string;
  basename: string;
  frontmatter: Record<string, unknown> | null | undefined;
  activityId: string;
}): HobbyItemMeta | null {
  const { path, basename, activityId } = params;
  const fm = params.frontmatter;
  if (fm == null) {
    return {
      path,
      basename,
      frontmatter: {
        type: "atomic-item",
        activity: activityId,
        title: basename,
      },
    };
  }

  if (fm.type !== "atomic-item" || fm.activity !== activityId) return null;
  return { path, basename, frontmatter: fm };
}
