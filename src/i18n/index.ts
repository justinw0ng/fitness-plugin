import type { Language, LocaleTable } from "./types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { en } from "./locales/en.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { zhHantEn } from "./locales/zh-Hant-en.ts";

export type { Language } from "./types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
export { en } from "./locales/en.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
export { zhHantEn } from "./locales/zh-Hant-en.ts";

export const DEFAULT_LANGUAGE: Language = "zh-Hant-en";
export const LANGUAGES: readonly Language[] = ["zh-Hant-en", "en"];

const TABLES: Record<Language, LocaleTable> = {
  en,
  "zh-Hant-en": zhHantEn,
};

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "zh-Hant-en";
}

export function t(
  key: string,
  language: Language,
  vars?: Record<string, string | number>,
): string {
  const table = TABLES[language] ?? TABLES[DEFAULT_LANGUAGE];
  let out = table[key] ?? TABLES.en[key] ?? key;
  if (!vars) return out;

  for (const [name, value] of Object.entries(vars)) {
    out = out.split(`{${name}}`).join(String(value));
  }
  return out;
}
