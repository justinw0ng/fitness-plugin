# README landing hero banner

Date: 2026-08-13  
Status: approved direction; waiting for written-spec review  
Related: PR #32

## Goal

Replace the device-only README hero with a screenshot-first landing banner based on direction B from the visual review.

The banner must use real Obsidian captures for both views:

- Desktop: the complete first viewport of the Atomic daily note with 12 books, actions, 2×2 heatmaps, and today's sessions.
- Mobile: the complete first viewport of the same daily note with only 3 books, followed by actions and the start of the responsive heatmap layout.

The Obsidian views must remain recognizable as Obsidian. Do not redraw the plugin UI with synthetic HTML or CSS.

## Design references

The composition follows the supplied finance landing-page reference, but uses the screenshot-first option selected in review. It applies these skills from `bergside/awesome-design-skills`:

- Clean: limited palette, legible type, no decorative clutter.
- Spacious: 8 px spacing grid and generous margins.
- Premium: precise alignment, restrained shadows, and a clear type hierarchy.
- Storytelling: headline first, then desktop product proof, then the overlapping mobile view.
- Perspective: depth comes only from the mobile overlap and shadows. No tilted or isometric screens.

## Artboard and tokens

- Output: `1600 × 900` PNG.
- Canvas: opaque warm off-white `#F5F2EC`.
- Primary text: `#17191D`.
- Secondary text: `#747980`.
- Screenshot border: `#D9DCE2`.
- Corner radius: 16 px for the desktop card, 40 px for the phone frame.
- Spacing: multiples of 8 px.
- Shadows: one soft desktop shadow and one stronger phone shadow. No glow.
- Type: DejaVu Sans throughout the banner.

## Composition

### Header

- Place `ATOMIC` at the upper left as a small black wordmark.
- Set the headline to `Your habits. One daily note.` below the wordmark.
- Place `Atomic for Obsidian` as a small label at the upper right.
- Do not add navigation, testimonials, ratings, partner logos, or a CTA. Direction B is deliberately screenshot-first.
- Use an 80 px left/right content margin. Set the headline at 56 px with a 56 px line height.

### Desktop capture

- Place the desktop card at `(80, 180)` with a `1260 × 710` outer size.
- Keep the complete Obsidian app viewport, including its own app chrome. Crop only the operating-system title bar or desktop wallpaper if captured.
- Use Light mode and disable Readable line length.
- Capture at `1600 × 900` and fit the full viewport inside the card without cropping.
- Show 12 Reading covers on one shelf, the four action buttons, the 2×2 heatmap grid, and today's sessions within the first viewport.

### Mobile capture

- Place the phone frame at `(1220, 240)` with a `300 × 620` outer size, overlapping the lower-right area of the desktop card.
- Capture a real `390 × 844` narrow Obsidian viewport.
- Seed only 3 Reading items for this capture so the first shelf is one row and the next dashboard content remains visible.
- Keep the complete mobile viewport. Do not crop the image down to the shelf.
- Use a thin black phone frame only to separate the screenshot from the desktop card.
- Do not add a synthetic iOS status bar over Obsidian content.

## Capture and composition workflow

1. Build and deploy Atomic to `/workspace/obsidian-demo`.
2. Seed the desktop vault with 12 Reading items and activity data.
3. Open the daily note in Obsidian and capture the desktop viewport.
4. Reseed the same demo vault with the explicit `--book-limit 3` option.
5. Reopen the daily note at `390 × 844` and capture the complete mobile viewport.
6. Compose both captures with the header text onto the `1600 × 900` artboard.
7. Write the result to `docs/images/atomic-daily-hero.png`.

The capture script must fail with a clear message when Obsidian, its window, or either screenshot is missing. The compositor must fail when input files cannot be opened.

## Files

- Update `docs/images/atomic-daily-hero.png`.
- Update `scripts/capture-readme-hero.sh`.
- Update `scripts/compose-device-hero.py`.
- Update `scripts/seed-readme-demo-vault.mjs` to accept `--book-limit <count>`. Its default is 12; the mobile pass uses 3.
- Keep the README image path unchanged.
- Keep the daily-note and dashboard examples unchanged.

## Verification

- Run `npm test`.
- Run `npm run typecheck`.
- Run `npm run build`, then restore `main.js` if the generated bundle is unchanged by this documentation-only task.
- Regenerate the banner from a clean demo-vault seed.
- Confirm the output is exactly `1600 × 900`.
- Inspect the final PNG at full size and README scale.
- Confirm desktop content is real Obsidian UI and readable enough to identify the shelf, actions, heatmaps, and today section.
- Confirm the mobile screenshot is a full viewport, contains exactly 3 books, and shows content below the shelf.
- Run the short Obsidian E2E pass required by `AGENTS.md`.

## Non-goals

- Rebuilding the README as an HTML landing page.
- Changing plugin UI, responsive behavior, or book-shelf logic.
- Replacing Obsidian captures with generated mock UI.
- Adding extra marketing sections to the banner.
