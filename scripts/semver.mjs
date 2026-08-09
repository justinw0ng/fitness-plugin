/**
 * Shared semver helpers for plugin version scripts.
 * Only supports the x.y.z form used by this repo (no pre-release / build metadata).
 */

/**
 * @param {string} version
 * @returns {{ major: number, minor: number, patch: number }}
 */
export function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Expected x.y.z semver, got: ${version}`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {-1 | 0 | 1}
 */
export function compareSemver(a, b) {
  const left = parseSemver(a);
  const right = parseSemver(b);
  if (left.major !== right.major) return left.major < right.major ? -1 : 1;
  if (left.minor !== right.minor) return left.minor < right.minor ? -1 : 1;
  if (left.patch !== right.patch) return left.patch < right.patch ? -1 : 1;
  return 0;
}

/**
 * @param {string} version
 * @param {"major" | "minor" | "patch"} level
 * @returns {string}
 */
export function bumpSemver(version, level) {
  const current = parseSemver(version);
  let { major, minor, patch } = current;
  if (level === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (level === "minor") {
    minor += 1;
    patch = 0;
  } else if (level === "patch") {
    patch += 1;
  } else {
    throw new Error(`Unknown bump level: ${level}`);
  }
  return `${major}.${minor}.${patch}`;
}
