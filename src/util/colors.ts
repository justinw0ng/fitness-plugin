// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { BLUE, GREEN, ORANGE } from "../types.ts";
import type { Domain } from "../types";

export type ColorTuple = [string, string, string, string];

const BUILTIN_SHADES: Record<string, ColorTuple> = {
  [GREEN[2].toLowerCase()]: GREEN,
  [ORANGE[2].toLowerCase()]: ORANGE,
  [BLUE[2].toLowerCase()]: BLUE,
};

export function isHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function expandHex(hex: string): string {
  const cleaned = hex.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(cleaned)) return cleaned;
  if (/^#[0-9a-f]{3}$/.test(cleaned)) {
    const [, r, g, b] = cleaned;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return GREEN[2];
}

function parseRgb(hex: string): { r: number; g: number; b: number } {
  const full = expandHex(hex);
  return {
    r: Number.parseInt(full.slice(1, 3), 16),
    g: Number.parseInt(full.slice(3, 5), 16),
    b: Number.parseInt(full.slice(5, 7), 16),
  };
}

function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}

function mix(
  from: { r: number; g: number; b: number },
  to: { r: number; g: number; b: number },
  amount: number,
): { r: number; g: number; b: number } {
  return {
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  };
}

/** Light → dark heatmap ramp; index 2 matches the base color when generated. */
export function shadesFromBaseColor(baseColor: string): ColorTuple {
  const normalized = expandHex(baseColor);
  const builtin = BUILTIN_SHADES[normalized];
  if (builtin) return [builtin[0], builtin[1], builtin[2], builtin[3]];

  const base = parseRgb(normalized);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  return [
    toHex(mix(base, white, 0.55)),
    toHex(mix(base, white, 0.25)),
    normalized,
    toHex(mix(base, black, 0.35)),
  ];
}

export function defaultBaseColorForDomain(domain: Domain): string {
  return domain === "hobby" ? BLUE[2] : GREEN[2];
}
