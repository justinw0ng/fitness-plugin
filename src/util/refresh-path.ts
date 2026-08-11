/** Pure vault path checks for refresh gating (no Obsidian imports). */

import type { FitnessSettings } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isSafeVaultFolder } from "./vault-path.ts";

function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

function normalizeVaultPath(path: string): string {
  return normalizeSlashes(path.trim());
}

function parentFolder(filePath: string): string | null {
  const norm = normalizeVaultPath(filePath);
  const idx = norm.lastIndexOf("/");
  if (idx <= 0) return null;
  const parent = norm.slice(0, idx);
  return isSafeVaultFolder(parent) ? parent : null;
}

/**
 * Folder roots and exact file paths that can affect Atomic plugin data or views.
 */
export function collectAtomicDataRoots(settings: FitnessSettings): {
  folderRoots: string[];
  filePaths: string[];
} {
  const folderRoots = new Set<string>(["atomics"]);
  const filePaths = new Set<string>();

  for (const activity of settings.activityTypes) {
    if (isSafeVaultFolder(activity.folder)) {
      folderRoots.add(normalizeVaultPath(activity.folder).replace(/\/$/, ""));
    }
  }

  for (const configured of [
    settings.dashboardPath,
    settings.golfCuesPath,
    settings.gymCuesPath,
  ]) {
    const norm = normalizeVaultPath(configured);
    if (!norm) continue;
    filePaths.add(norm);
    const parent = parentFolder(norm);
    if (parent) folderRoots.add(parent);
  }

  return {
    folderRoots: [...folderRoots],
    filePaths: [...filePaths],
  };
}

function isUnderFolderRoot(path: string, root: string): boolean {
  const normPath = normalizeVaultPath(path);
  const normRoot = normalizeVaultPath(root).replace(/\/$/, "");
  return normPath === normRoot || normPath.startsWith(`${normRoot}/`);
}

/**
 * True when a vault path change could affect Atomic data or a live block host note.
 */
export function pathAffectsAtomicRefresh(
  path: string,
  roots: { folderRoots: string[]; filePaths: string[] },
  liveBlockSourcePaths: string[],
): boolean {
  const norm = normalizeVaultPath(path);
  if (!norm) return false;

  if (liveBlockSourcePaths.some((sourcePath) => normalizeVaultPath(sourcePath) === norm)) {
    return true;
  }

  if (roots.filePaths.some((filePath) => normalizeVaultPath(filePath) === norm)) {
    return true;
  }

  return roots.folderRoots.some((root) => isUnderFolderRoot(norm, root));
}
