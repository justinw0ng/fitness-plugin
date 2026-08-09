# Language selection (i18n) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Settings language control with two modes (`zh-Hant-en`, `en`) backed by a testable string catalog, without Atomic rebrand or domain changes.

**Architecture:** Compile-time locale tables in `src/i18n/`, `t(key, language, vars?)` for lookup/interpolation, `language` on `FitnessSettings` merged via `mergeSettings`. Views/settings/commands/templates read strings through `t()`; dates pick zh-HK vs English formatters from language.

**Tech Stack:** TypeScript, Obsidian plugin APIs, Node test runner (`npm test` with `--experimental-strip-types`), esbuild bundle.

## Global Constraints

- Locales: exactly `zh-Hant-en` and `en`. No Simplified Chinese. No zh-only mode.
- Default language: `zh-Hant-en`.
- User note content is never rewritten or auto-translated.
- Standalone PR: do not rename plugin to Atomic; do not change `fitness-*` block languages or vault folder defaults.
- Command names: reload Notice is acceptable if live rename is impossible.
- Every task must leave `npm test`, `npm run typecheck`, and `npm run build` green (restore `main.js` with `git checkout -- main.js` if the bundle should not be committed).
- Prefer Obsidian-free logic in `src/i18n/` for unit tests.

---

## File map

| Path | Responsibility |
|------|----------------|
| `src/i18n/types.ts` | `Language` union, catalog value types |
| `src/i18n/locales/en.ts` | English strings |
| `src/i18n/locales/zh-Hant-en.ts` | Bilingual strings (seed from current UI) |
| `src/i18n/index.ts` | `LANGUAGES`, `t()`, `isLanguage()`, `DEFAULT_LANGUAGE` |
| `src/types.ts` | add `language` to settings + default |
| `src/util/merge-settings.ts` | sanitize `language` |
| `src/settings.ts` | Language dropdown at top of Settings |
| `src/dates.ts` | helpers that take language or expose picker |
| `src/main.ts`, `src/views/*`, `src/commands/create-session.ts`, `src/codeblocks.ts` | replace user-visible literals with `t()` |
| `tests/i18n.test.mjs` | parity, sanitize, interpolation, date switch |
| `docs/USER_GUIDE.md`, `README.md` | document Language setting |

---

### Task 1: i18n core + settings field

**Files:**
- Create: `src/i18n/types.ts`, `src/i18n/locales/en.ts`, `src/i18n/locales/zh-Hant-en.ts`, `src/i18n/index.ts`
- Modify: `src/types.ts`, `src/util/merge-settings.ts`
- Test: `tests/i18n.test.mjs`, `tests/settings-migrate.test.mjs`

**Interfaces:**
- Produces: `export type Language = "zh-Hant-en" | "en"`; `export const DEFAULT_LANGUAGE: Language = "zh-Hant-en"`; `export function isLanguage(v: unknown): v is Language`; `export function t(key: string, language: Language, vars?: Record<string, string | number>): string`
- Produces: `FitnessSettings.language: Language` defaulting to `DEFAULT_LANGUAGE`

- [ ] **Step 1: Write failing tests**

Create `tests/i18n.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { t, isLanguage, DEFAULT_LANGUAGE } from "../src/i18n/index.ts";
import { en } from "../src/i18n/locales/en.ts";
import { zhHantEn } from "../src/i18n/locales/zh-Hant-en.ts";
import { mergeSettings } from "../src/util/merge-settings.ts";

test("default language is zh-Hant-en", () => {
  assert.equal(DEFAULT_LANGUAGE, "zh-Hant-en");
  assert.equal(mergeSettings(null).language, "zh-Hant-en");
});

test("isLanguage accepts only en and zh-Hant-en", () => {
  assert.equal(isLanguage("en"), true);
  assert.equal(isLanguage("zh-Hant-en"), true);
  assert.equal(isLanguage("zh-Hans"), false);
  assert.equal(isLanguage("zh"), false);
});

test("mergeSettings rejects unknown language", () => {
  assert.equal(mergeSettings({ language: "zh-Hans" }).language, "zh-Hant-en");
  assert.equal(mergeSettings({ language: "en" }).language, "en");
});

test("locale key parity", () => {
  const enKeys = Object.keys(en).sort();
  const zhKeys = Object.keys(zhHantEn).sort();
  assert.deepEqual(enKeys, zhKeys);
});

test("t interpolates and falls back", () => {
  // seed catalogs must include settings.language and notice.created
  assert.match(t("settings.language", "en"), /Language/);
  assert.match(t("notice.created", "en", { path: "Gym/x.md" }), /Gym\/x\.md/);
  assert.equal(t("missing.key.for.test", "en"), "missing.key.for.test");
});
```

Add to `tests/settings-migrate.test.mjs`:

```js
test("mergeSettings keeps language en when set", () => {
  assert.equal(mergeSettings({ language: "en" }).language, "en");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`

Expected: FAIL resolving `../src/i18n/index.ts` or missing `language` on settings.

- [ ] **Step 3: Minimal implementation**

`src/i18n/types.ts`:

```ts
export type Language = "zh-Hant-en" | "en";
export type LocaleTable = Record<string, string>;
```

`src/i18n/locales/en.ts` and `zh-Hant-en.ts`: start with the keys used in tests plus Settings labels that Task 2 needs (`settings.language`, `settings.languageDesc`, `settings.timezone`, …). Export `en` / `zhHantEn`.

`src/i18n/index.ts`:

```ts
import type { Language, LocaleTable } from "./types.ts";
import { en } from "./locales/en.ts";
import { zhHantEn } from "./locales/zh-Hant-en.ts";

export type { Language } from "./types.ts";
export { en } from "./locales/en.ts";
export { zhHantEn } from "./locales/zh-Hant-en.ts";

export const DEFAULT_LANGUAGE: Language = "zh-Hant-en";

const TABLES: Record<Language, LocaleTable> = {
  en,
  "zh-Hant-en": zhHantEn,
};

export function isLanguage(v: unknown): v is Language {
  return v === "en" || v === "zh-Hant-en";
}

export function t(
  key: string,
  language: Language,
  vars?: Record<string, string | number>,
): string {
  const table = TABLES[language] ?? TABLES[DEFAULT_LANGUAGE];
  let out = table[key] ?? TABLES.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{${k}}`).join(String(v));
    }
  }
  return out;
}
```

Add `language: Language` to `FitnessSettings` / `DEFAULT_SETTINGS`. In `mergeSettings`, after spreading raw:

```ts
language: isLanguage(raw.language) ? raw.language : DEFAULT_LANGUAGE,
```

(Import `isLanguage` / `DEFAULT_LANGUAGE` from i18n; avoid circular imports — `types.ts` may import `Language` type only, or keep language default string literal `"zh-Hant-en"` in types and validate in merge.)

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS for new i18n + merge cases.

- [ ] **Step 5: Commit**

```bash
git add src/i18n src/types.ts src/util/merge-settings.ts tests/i18n.test.mjs tests/settings-migrate.test.mjs
git commit -m "feat(i18n): add language setting field and catalog core"
```

---

### Task 2: Settings dropdown + hot re-render hook

**Files:**
- Modify: `src/settings.ts`, `src/main.ts` (expose refresh if needed)
- Modify: `src/i18n/locales/*.ts` (settings keys)

**Interfaces:**
- Consumes: `t`, `isLanguage`, plugin settings
- Produces: Language dropdown as first Settings row; on change save + `display()` refresh + codeblock refresh

- [ ] **Step 1: Write failing test for dropdown labels via catalog**

Extend `tests/i18n.test.mjs`:

```js
test("language option labels exist", () => {
  assert.ok(en["settings.languageOption.zh-Hant-en"]);
  assert.ok(en["settings.languageOption.en"]);
  assert.ok(zhHantEn["settings.languageOption.zh-Hant-en"]);
});
```

- [ ] **Step 2: Run test — fail until keys exist**

- [ ] **Step 3: Implement Settings row**

At top of `FitnessSettingTab.display()`, before Timezone:

```ts
const lang = this.plugin.settings.language;
new Setting(containerEl)
  .setName(t("settings.language", lang))
  .setDesc(t("settings.languageDesc", lang))
  .addDropdown((dd) => {
    dd.addOption("zh-Hant-en", t("settings.languageOption.zh-Hant-en", lang));
    dd.addOption("en", t("settings.languageOption.en", lang));
    dd.setValue(lang);
    dd.onChange(async (value) => {
      if (!isLanguage(value)) return;
      this.plugin.settings.language = value;
      await this.plugin.saveSettings();
      this.display();
      this.plugin.refreshCodeblocks?.();
      // If command names cannot update live:
      // new Notice(t("notice.reloadForCommands", value));
    });
  });
```

Wire other Settings `setName`/`setDesc` strings through `t()` in the same pass for this tab.

Add `refreshCodeblocks()` on the plugin if a public method already exists for live refresh; otherwise call the existing debounce/refresh path used after vault events.

- [ ] **Step 4: `npm test` && `npm run typecheck`**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(i18n): add Language dropdown in settings"
```

---

### Task 3: Wire views, commands, notices, templates

**Files:**
- Modify: `src/views/today.ts`, `heatmap.ts`, `dashboard.ts`, `cues.ts`, `actions.ts`
- Modify: `src/commands/create-session.ts`, `src/main.ts`, `src/codeblocks.ts`
- Modify: `src/dates.ts` (optional `formatMonthLong(language, …)` helpers)
- Modify: locale tables (full key set)

**Interfaces:**
- Consumes: `plugin.settings.language` or pass `language` into render functions
- Rule: seed bilingual catalog values from today’s hardcoded `EN / 中文` strings; English catalog drops the Chinese half

- [ ] **Step 1: Add catalog keys for each user-visible string** (parity test must stay green)

- [ ] **Step 2: Replace literals with `t(key, language)`** in views/commands. Keep `core.ts` enum values in English (data tokens); only UI labels go through i18n.

- [ ] **Step 3: Date formatting**

When `language === "en"`, use English month helpers; when `zh-Hant-en`, keep current compound `en / zh-HK` presentation for month headings that are already bilingual.

- [ ] **Step 4: Command registration**

```ts
this.addCommand({
  id: "fitness-new-gym-session",
  name: t("command.newGymSession", this.settings.language),
  callback: () => { ... },
});
```

On language change, show `t("notice.reloadForCommands", language)` if names do not update live.

- [ ] **Step 5: Run `npm test` && `npm run typecheck` && `npm run build`**

- [ ] **Step 6: `git checkout -- main.js` if not shipping bundle; commit source**

```bash
git commit -am "feat(i18n): wire catalogs through UI, commands, templates"
```

---

### Task 4: Docs + verification

**Files:**
- Modify: `docs/USER_GUIDE.md`, `README.md`

- [ ] **Step 1: Document Language setting** (defaults, two modes, no Simplified Chinese, note content untouched)

- [ ] **Step 2: Run full verification**

```bash
npm test
npm run typecheck
npm run build
git checkout -- main.js   # unless intentionally committing bundle
```

- [ ] **Step 3: PR notes**

State Obsidian GUI E2E skipped on Cloud VM; manual check when Obsidian available: flip Language, confirm Settings + dashboard chrome + Notices.

- [ ] **Step 4: Commit**

```bash
git commit -am "docs: language selection in USER_GUIDE and README"
```

---

## Self-review

1. Spec coverage: catalog, settings, wiring, dates, commands reload Notice, docs, tests — covered.
2. No Simplified Chinese locale — enforced by `isLanguage` + tests.
3. Atomic rename out of scope — file map does not touch manifest id.
