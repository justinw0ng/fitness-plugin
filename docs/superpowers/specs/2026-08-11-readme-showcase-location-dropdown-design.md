# Custom location dropdown, theme-aligned selects, and README showcase

Date: 2026-08-11  
Status: written; waiting for user review before implementation plan

## Goal

1. Let gym/golf session `location` accept values beyond the fixed lists.
2. Make property dropdowns match Obsidian’s current theme (light/dark).
3. Revamp `README.md` as a minimal product page whose hero is a **real Obsidian screenshot** of an English daily note (not the HTML mock).

## Non-goals

- Custom free-text for `felt`, `weight_unit`, or Reading `status` (those stay fixed lists).
- Changing vault layout, heatmap math, or bookshelf rendering behavior beyond demo content used for the screenshot.
- Shipping the HTML mock as the README image.

## 1. Custom location

### Current behavior

Properties/Bases replace `location` with a `<select>` of fixed values:

- Gym: Home, Commercial, Hotel/Travel, Other
- Golf: Home net, Driving range, Course, Other

Out-of-list values already appear as a temporary extra `<option>` so existing notes are not wiped. Session create flow for gym uses **Other** plus free-text `location_detail`.

### Desired behavior

- User can pick a predefined location **or** enter a custom string stored in `location`.
- Custom strings remain selectable after save (same path as today’s legacy option).
- Labels for predefined values stay i18n-aware; custom values display as typed.
- `location_detail` stays available for gym notes that already use it; new custom locations write to `location` itself (not forced through `location_detail`).

### UX

In the Properties (and Bases) `location` select:

1. Keep the predefined options at the top.
2. Add a trailing **Custom…** option (localized).
3. Choosing **Custom…** opens a small prompt (Obsidian `PromptModal` or equivalent). Confirm writes the trimmed string to `location` and selects it. Cancel restores the previous value.
4. Empty / whitespace-only custom input is rejected (keep previous value; optional Notice).

Session create flow (`FuzzySuggestModal` for gym location):

- Keep predefined suggestions.
- Allow a custom entry the same way (type a value that is not in the list, or an explicit Custom path), writing it to `location`.
- If the user picks the predefined **Other** value, keep today’s gym `location_detail` prompt.
- If the user enters a custom `location` string, write that string to `location` and do not require `location_detail`.

### Scope of code

- `src/properties/property-select.ts` — Custom… handling for `location` only.
- `src/core/property-options.ts` / i18n — Custom… label key.
- `src/commands/create-session.ts` — allow custom location at create time.
- Tests for option resolution + custom write path (pure where possible).
- Short USER_GUIDE note: location is selectable or custom.

## 2. Theme-aligned dropdown style

`.atomic-property-select` already has class `dropdown` but almost no theme wiring.

Apply Obsidian form tokens so Properties/Bases match Settings controls:

- Background: `var(--background-modifier-form-field)`
- Border: `var(--background-modifier-border)`
- Text: `var(--text-normal)`
- Radius: `var(--input-radius)` (fallback if missing)
- Font: inherit from Properties
- Padding consistent with native inputs
- Hover/focus using existing interactive / focus ring variables

No plugin-specific colors, glows, or pill chrome. Verify in Light and Dark.

## 3. README showcase (Approach A)

### Layout (copy structure)

1. Brand: **Atomic**
2. One short tagline
3. CTA row: Download latest release · User guide
4. **Hero image**: real Obsidian screenshot of one daily note
5. Short “What it does” below the fold
6. Secondary: install, vault layout, upgrade pointers (compressed vs today’s long top)

Tone: minimal product page (Linear / Raycast style). English in the hero vault. No emoji-heavy marketing.

### Hero daily note content (screenshot subject)

Language: English. Theme: Light. Readable line length: off. Fullscreen Obsidian.

Daily note contains, in order:

1. `atomic-bookshelf` — **10** books with real cover images (bestseller set used in the mock, or the same titles seeded in the demo vault)
2. `atomic-actions` — Gym, Golf, Guitar, Reading
3. `atomic-heatmap` — Gym, Golf, Guitar, Reading in a **2×2** grid
4. `atomic-today`

The HTML file `docs/mockups/atomic/08-readme-showcase-preview.html` is **layout reference only**. It must not be embedded as the README hero.

### Capture checklist

1. Build and install the plugin into the demo vault.
2. Seed Reading items + covers for the 10 books; enable Guitar as a habit if needed.
3. Compose the daily note blocks as above with plausible activity data.
4. Capture the Obsidian window (AGENTS.md screenshot rules: Light, fullscreen, Readable line length off).
5. Save under `docs/images/` (replace or add beside existing dashboard shots).
6. Point `README.md` at that image as the primary visual.

If Obsidian cannot be installed or launched in the environment, note the failure in the PR/summary and keep the mock for design review only — do not pretend the mock is a live capture.

## 4. Testing

- Unit: custom location option / write behavior; predefined lists unchanged for other properties.
- Manual: Properties location Custom…; create-session custom location; light/dark select styling.
- Manual E2E: README hero vault composition; Obsidian screenshot pass per AGENTS.md when Obsidian runs.
- `npm test`, `npm run typecheck`, `npm run build` before complete.

## 5. Open points resolved in this spec

| Topic | Decision |
|-------|----------|
| README layout | Approach A (hero daily note) |
| Book count in hero | 10 |
| README image source | Real Obsidian capture, not HTML mock |
| Custom location | Yes, via Custom… → prompt → `location` |
| Other dropdowns | Fixed lists only |
| Select styling | Obsidian theme tokens only |
