# Custom location, themed selects, and README showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow custom gym/golf `location` values, theme-align property dropdowns, and revamp `README.md` with a real Obsidian hero screenshot of an English daily note (10-book shelf, actions, 2×2 heatmaps, today).

**Architecture:** Extend `PropertyOptionSpec` with `allowCustom` for `location` only. Properties/Bases `<select>` gains a sentinel **Custom…** option that opens existing `promptText` and writes the trimmed string to `location`. Gym session create adds the same Custom… path. CSS binds `.atomic-property-select` to Obsidian form tokens. README follows Approach A; the HTML mock stays layout-only; the hero image must be captured inside Obsidian.

**Tech Stack:** TypeScript Obsidian plugin, Node test runner (`tests/*.mjs`), esbuild, Obsidian `Modal` / `FuzzySuggestModal`, CSS variables.

## Global Constraints

- Custom free-text applies only to `location` (not `felt`, `weight_unit`, or Reading `status`).
- Custom values write to `location` itself; predefined **Other** may still use `location_detail` on gym create.
- README hero must be a real Obsidian screenshot (Light, English, Readable line length off, fullscreen). Do not embed `docs/mockups/atomic/08-readme-showcase-preview.html` as the hero.
- Hero daily note order: bookshelf (10 covers) → actions → 2×2 heatmaps (gym, golf, guitar, reading) → today.
- Validate with `npm test`, `npm run typecheck`, `npm run build`; Obsidian E2E when installable.
- `main.js` is a build artifact; restore with `git checkout -- main.js` unless intentionally committing the bundle.

## File map

| File | Responsibility |
|------|----------------|
| `src/core/property-options.ts` | `allowCustom` on location specs; `CUSTOM_LOCATION_SENTINEL` constant |
| `src/properties/property-select.ts` | Custom… select UX via `promptText` |
| `src/commands/create-session.ts` | Gym create Custom… → prompt → `location` |
| `src/util/prompt-text.ts` | Reuse (no API change expected) |
| `src/i18n/locales/en.ts` | English strings for Custom… / custom prompt |
| `src/i18n/locales/zh-Hant-en.ts` | Matching bilingual keys |
| `styles.css` | Theme-token dropdown styles |
| `tests/property-options.test.mjs` | `allowCustom` / sentinel tests |
| `docs/USER_GUIDE.md` | Document custom location |
| `README.md` | Approach A product page |
| `docs/images/*` | Real Obsidian hero capture |
| `docs/mockups/atomic/08-readme-showcase-preview.html` | Layout reference only (already present) |

---

### Task 1: Core `allowCustom` + sentinel

**Files:**
- Modify: `src/core/property-options.ts`
- Modify: `tests/property-options.test.mjs`

**Interfaces:**
- Consumes: existing `PropertyOptionSpec`, `GYM_LOCATIONS`, `GOLF_LOCATIONS`
- Produces:
  - `CUSTOM_LOCATION_SENTINEL: "__atomic_custom_location__"` (never written to frontmatter)
  - `PropertyOptionSpec.allowCustom?: boolean`
  - Location specs set `allowCustom: true`

- [ ] **Step 1: Write the failing tests**

Append to `tests/property-options.test.mjs`:

```js
import {
  CUSTOM_LOCATION_SENTINEL,
  DROPDOWN_PROPERTY_NAMES,
  resolvePropertyOptions,
} from "../src/core/property-options.ts";

test("location specs allow custom values; other dropdowns do not", () => {
  assert.equal(
    resolvePropertyOptions("location", { frontmatter: gymSession })?.allowCustom,
    true,
  );
  assert.equal(
    resolvePropertyOptions("location", { frontmatter: golfSession })?.allowCustom,
    true,
  );
  assert.equal(
    resolvePropertyOptions("status", { frontmatter: readingItem })?.allowCustom,
    undefined,
  );
  assert.equal(
    resolvePropertyOptions("felt", { frontmatter: golfSession })?.allowCustom,
    undefined,
  );
  assert.equal(
    resolvePropertyOptions("weight_unit", { frontmatter: gymSession })?.allowCustom,
    undefined,
  );
});

test("CUSTOM_LOCATION_SENTINEL is stable and not a real location label", () => {
  assert.equal(CUSTOM_LOCATION_SENTINEL, "__atomic_custom_location__");
  assert.equal(
    resolvePropertyOptions("location", { frontmatter: gymSession })?.values.includes(
      CUSTOM_LOCATION_SENTINEL,
    ),
    false,
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --test-name-pattern="location specs allow custom|CUSTOM_LOCATION_SENTINEL"`

Expected: FAIL (export / `allowCustom` missing)

- [ ] **Step 3: Minimal implementation**

In `src/core/property-options.ts`:

```ts
export const CUSTOM_LOCATION_SENTINEL = "__atomic_custom_location__";

export type PropertyOptionSpec = {
  property: string;
  values: readonly string[];
  matches: (context: PropertyOptionContext) => boolean;
  labelKey?: (value: string) => string;
  allowCustom?: boolean;
};
```

On both `location` entries in `PROPERTY_OPTION_SPECS`, add `allowCustom: true`. Do **not** put the sentinel in `values`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --test-name-pattern="location specs allow custom|CUSTOM_LOCATION_SENTINEL|resolvePropertyOptions"`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/property-options.ts tests/property-options.test.mjs
git commit -m "feat(properties): mark location dropdowns as allowCustom"
```

---

### Task 2: i18n strings for Custom…

**Files:**
- Modify: `src/i18n/locales/en.ts`
- Modify: `src/i18n/locales/zh-Hant-en.ts`

**Interfaces:**
- Consumes: existing `t(key, language)`
- Produces keys:
  - `property.location.custom` — select option label
  - `modal.customLocation` — prompt title
  - `notice.emptyCustomLocation` — optional empty rejection Notice

- [ ] **Step 1: Add English keys**

In `src/i18n/locales/en.ts`:

```ts
"property.location.custom": "Custom…",
"modal.customLocation": "Custom location",
"notice.emptyCustomLocation": "Location cannot be empty",
```

- [ ] **Step 2: Add zh-Hant-en keys (parity)**

In `src/i18n/locales/zh-Hant-en.ts`:

```ts
"property.location.custom": "Custom… / 自訂…",
"modal.customLocation": "Custom location / 自訂地點",
"notice.emptyCustomLocation": "Location cannot be empty / 地點不可為空白",
```

- [ ] **Step 3: Run locale parity test**

Run: `npm test -- --test-name-pattern="locale key parity"`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.ts src/i18n/locales/zh-Hant-en.ts
git commit -m "feat(i18n): add Custom location strings"
```

---

### Task 3: Properties/Bases Custom… select UX

**Files:**
- Modify: `src/properties/property-select.ts`

**Interfaces:**
- Consumes: `CUSTOM_LOCATION_SENTINEL`, `spec.allowCustom`, `promptText(app, title, defaultValue, language)`, `t(...)`, `Notice`
- Produces: selecting Custom… prompts, writes trimmed string to `location`, never persists the sentinel

- [ ] **Step 1: Import dependencies**

At top of `src/properties/property-select.ts`:

```ts
import { Notice } from "obsidian";
import { promptText } from "../util/prompt-text.ts";
import {
  CUSTOM_LOCATION_SENTINEL,
  DROPDOWN_PROPERTY_NAMES,
  resolvePropertyOptions,
  type PropertyOptionSpec,
} from "../core/property-options.ts";
```

(Adjust existing imports; keep `App` / `Plugin` / `TFile` as today.)

- [ ] **Step 2: Extend `createPropertySelect` to accept `app` and append Custom…**

Signature becomes:

```ts
function createPropertySelect(
  app: App,
  spec: PropertyOptionSpec,
  property: string,
  getLanguage: () => Language,
  currentValue: string,
  onChange: (value: string) => void,
): HTMLSelectElement
```

After predefined (+ legacy) options, when `spec.allowCustom`:

```ts
const customOpt = document.createElement("option");
customOpt.value = CUSTOM_LOCATION_SENTINEL;
customOpt.text = t("property.location.custom", language);
selectEl.appendChild(customOpt);
```

Never mark the sentinel as `selected` unless you are mid-prompt (prefer not to).

- [ ] **Step 3: Handle change with prompt**

Replace the sync `change` listener with:

```ts
selectEl.dataset.committedValue = currentValue || spec.values[0] || "";

selectEl.addEventListener("change", () => {
  const language = getLanguage();
  const newValue = selectEl.value;
  selectEl.dataset.lastChanged = Date.now().toString();

  if (spec.allowCustom && newValue === CUSTOM_LOCATION_SENTINEL) {
    const previous = selectEl.dataset.committedValue || "";
    selectEl.value = previous;
    void (async () => {
      const raw = await promptText(
        app,
        t("modal.customLocation", language),
        "",
        language,
      );
      if (raw === null) return;
      const trimmed = raw.trim();
      if (!trimmed) {
        new Notice(t("notice.emptyCustomLocation", language));
        return;
      }
      selectEl.dataset.committedValue = trimmed;
      // Ensure option exists for the custom value
      if (![...selectEl.options].some((o) => o.value === trimmed)) {
        const legacy = document.createElement("option");
        legacy.value = trimmed;
        legacy.text = trimmed;
        // Insert before Custom… option
        const customOption = [...selectEl.options].find(
          (o) => o.value === CUSTOM_LOCATION_SENTINEL,
        );
        selectEl.insertBefore(legacy, customOption ?? null);
      }
      selectEl.value = trimmed;
      onChange(trimmed);
    })();
    return;
  }

  selectEl.dataset.committedValue = newValue;
  onChange(newValue);
});
```

- [ ] **Step 4: Thread `app` through `injectPropertySelect` → `createPropertySelect`**

Every call site already has `app`. Pass it through. Keep Bases `mod-base` / pointer-capture behavior unchanged.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/properties/property-select.ts
git commit -m "feat(properties): Custom… prompt for location dropdown"
```

---

### Task 4: Gym session create Custom… path

**Files:**
- Modify: `src/commands/create-session.ts`

**Interfaces:**
- Consumes: `CUSTOM_LOCATION_SENTINEL`, `promptText`, `t`, `GYM_LOCATIONS`
- Produces: gym create can set a custom `location` string; predefined **Other** still prompts `location_detail`

- [ ] **Step 1: Import sentinel**

```ts
import { CUSTOM_LOCATION_SENTINEL } from "../core/property-options";
```

(Use the same import style as neighboring files; add `.ts` extension if this module already uses it for i18n.)

- [ ] **Step 2: Extend gym location suggest list**

In `gymSessionBody`:

```ts
const locationItems = [...GYM_LOCATIONS, CUSTOM_LOCATION_SENTINEL];
const locationLabels = [
  t("location.home", language),
  t("location.commercial", language),
  t("location.hotelTravel", language),
  t("location.other", language),
  t("property.location.custom", language),
];

let location =
  (await suggestOne(
    app,
    t("modal.locationPlaceholder", language),
    locationItems,
    locationLabels,
  )) || "";

if (location === CUSTOM_LOCATION_SENTINEL) {
  const raw = await promptText(
    app,
    t("modal.customLocation", language),
    "",
    language,
  );
  if (raw === null) {
    location = "";
  } else {
    const trimmed = raw.trim();
    if (!trimmed) {
      new Notice(t("notice.emptyCustomLocation", language));
      location = "";
    } else {
      location = trimmed;
    }
  }
}

let locationDetail = "";
if (location === "Other") {
  locationDetail =
    (await promptText(
      app,
      t("modal.otherLocationDetail", language),
      "",
      language,
    )) || "";
}
```

Do not treat a custom string as **Other**; skip `location_detail` unless `location === "Other"`.

- [ ] **Step 3: Typecheck + unit suite**

Run: `npm run typecheck && npm test`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/commands/create-session.ts
git commit -m "feat(session): allow custom gym location at create time"
```

---

### Task 5: Theme-align `.atomic-property-select`

**Files:**
- Modify: `styles.css` (property select section ~588+)

**Interfaces:**
- Consumes: Obsidian CSS variables
- Produces: light/dark selects matching Settings form controls

- [ ] **Step 1: Replace the minimal width-only rule**

```css
/* Property dropdowns: match Obsidian form controls (light/dark). */
.atomic-property-select {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  font: inherit;
  color: var(--text-normal);
  background-color: var(--background-modifier-form-field);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--input-radius, var(--radius-s, 4px));
  padding: var(--size-2-1, 4px) var(--size-2-2, 8px);
  line-height: var(--line-height-normal, 1.4);
}

.atomic-property-select:hover {
  background-color: var(--background-modifier-form-field-hover, var(--background-modifier-form-field));
}

.atomic-property-select:focus,
.atomic-property-select:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--background-modifier-border-focus, var(--interactive-accent));
}

.atomic-property-native-hidden {
  display: none !important;
}

.bases-td .atomic-property-select.mod-base,
.bases-td .atomic-property-select {
  position: absolute;
  inset: 2px 4px;
  width: auto;
  min-width: 0;
}
```

No plugin-accent fills, glows, or pill radii beyond `--input-radius`.

- [ ] **Step 2: Commit**

```bash
git add styles.css
git commit -m "style(properties): theme-token dropdowns for light/dark"
```

---

### Task 6: USER_GUIDE — custom location

**Files:**
- Modify: `docs/USER_GUIDE.md` (session frontmatter / property dropdowns section ~298+)

- [ ] **Step 1: Update the property dropdowns table/copy**

Clarify:

- `location` offers the fixed list **plus Custom…**
- Custom… opens a prompt; the string is stored in `location`
- Predefined **Other** on gym create may still fill `location_detail`
- Existing non-list values still appear as an extra option

Update the features table row that currently says “Fixed-value fields” so `location` is described as selectable or custom.

- [ ] **Step 2: Commit**

```bash
git add docs/USER_GUIDE.md
git commit -m "docs: describe custom location in Properties"
```

---

### Task 7: README Approach A + real Obsidian hero capture

**Files:**
- Modify: `README.md`
- Create/update: `docs/images/atomic-daily-hero.png` (or `.webp` if that matches existing assets)
- Optional demo vault seeds under the environment’s demo vault (not necessarily committed if covers are remote URLs)

**Interfaces:**
- Consumes: built plugin, demo vault, Open Library / vault cover URLs for 10 books
- Produces: README with brand → tagline → CTAs → **real** Obsidian screenshot → short feature blurb → compressed install/layout links

- [ ] **Step 1: Build and deploy plugin into the demo vault**

```bash
npm run build
# Deploy to demo vault plugin folder if not automatic, e.g.:
# cp main.js manifest.json styles.css /workspace/obsidian-demo/.obsidian/plugins/obsidian-atomic/
```

If `OBSIDIAN_PLUGIN_OUT` or `../obsidian-lab/...` exists, confirm the bundle landed there.

- [ ] **Step 2: Prepare English demo content**

In Obsidian (Language = English, Light mode):

1. Enable Gym, Golf, Guitar (add Guitar habit if missing), Reading.
2. Create 10 Reading items with covers (same set as the mock when possible):
   Theo of Golden; The Calamity Club; Yesteryear; Whistler; Dungeon Crawler Carl; Project Hail Mary; Regime Change; The Odyssey; The Wedding People; The Let Them Theory.
3. Daily note containing, in order:
   - `atomic-bookshelf` (shows those books)
   - `atomic-actions`
   - `atomic-heatmap` with `activity: gym, golf, guitar, reading` and `columns: 2` (and `rows: 2` if needed per USER_GUIDE)
   - `atomic-today`
4. Seed enough sessions/timer minutes so heatmaps and today look alive.

- [ ] **Step 3: Capture the hero screenshot**

Per AGENTS.md:

1. Disable Readable line length
2. Fullscreen Obsidian
3. Light mode
4. Capture the daily note composition
5. Save as `docs/images/atomic-daily-hero.png` (or matching extension)

If Obsidian cannot install/launch: stop this task’s image claim, note the failure in the PR body, leave README without a fake mock-as-hero.

- [ ] **Step 4: Rewrite `README.md` (Approach A)**

Structure:

```markdown
# Atomic

Habit tracking in Obsidian. Sessions, reading, heatmaps, one daily note.

**Install:** … release zip link …  
**Guide:** [docs/USER_GUIDE.md](docs/USER_GUIDE.md)

![Atomic daily note](docs/images/atomic-daily-hero.png)

## What it does

- Exercise sessions + custom habits (enable/disable, one color → four heatmap shades)
- Reading items, timers, book shelf, Bases bookshelf
- Heatmaps filterable with `activity: …` and optional 2×2 grid options
- Property dropdowns for status / felt / location (custom allowed) / weight_unit

## Default vault layout

… keep the tree, shortened …

## Upgrade from Fitness

… one short paragraph + guide link …
```

Keep install instructions accurate. Drop bilingual noise from the hero narrative (English product page). Do not use the HTML mock as the image.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/images/atomic-daily-hero.png
git commit -m "docs: revamp README with Obsidian daily-note hero"
```

---

### Task 8: Full verification

**Files:** none new (verification only)

- [ ] **Step 1: Automated checks**

```bash
npm test
npm run typecheck
npm run build
git checkout -- main.js   # unless intentionally shipping the bundle
```

Expected: all green.

- [ ] **Step 2: Obsidian manual checks (when available)**

1. Gym/golf session Properties: Custom… → prompt → value stored in `location`
2. Cancel / empty custom keeps previous value
3. Gym create: Custom… writes custom `location`; Other still asks `location_detail`
4. Dropdowns match theme in Light and Dark
5. README hero vault still looks correct after reload

- [ ] **Step 3: Final commit if docs/tests needed touch-ups; push branch; update PR**

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Custom location via Custom… → prompt → `location` | 1, 2, 3 |
| Gym create custom location; Other → `location_detail` | 4 |
| Other dropdowns stay fixed | 1 (allowCustom only on location) |
| Theme-token select styling | 5 |
| USER_GUIDE note | 6 |
| README Approach A, 10 books, real Obsidian capture | 7 |
| Tests / typecheck / build / E2E | 8 |
| HTML mock not used as hero | 7 |

## Placeholder / consistency review

- Sentinel name is consistently `CUSTOM_LOCATION_SENTINEL` / `__atomic_custom_location__`.
- i18n keys are named in Task 2 and reused in Tasks 3–4.
- No TBD steps; Obsidian-unavailable path is explicit in Task 7.
