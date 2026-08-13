# README Landing Hero Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a `1600 × 900` screenshot-first README banner with real full-viewport Obsidian desktop and mobile daily-note captures.

**Architecture:** The demo-vault seeder gains a validated book-count option so desktop and mobile captures are deterministic. The capture script launches two isolated Obsidian process groups, captures each viewport, and passes both PNGs to a Pillow compositor. The compositor owns only the landing-banner frame, text, spacing, borders, shadows, and overlap; it never redraws plugin UI.

**Tech Stack:** Node.js 22, Node test runner, Bash, Obsidian 1.13.x, `xdotool`, `wmctrl`, `ffmpeg`, Python 3, Pillow.

## Global Constraints

- Output must be an opaque `1600 × 900` PNG at `docs/images/atomic-daily-hero.png`.
- Canvas must be `#F5F2EC`; primary text `#17191D`; secondary text `#747980`; screenshot border `#D9DCE2`.
- Use DejaVu Sans and an 8 px spacing grid.
- Copy must be `ATOMIC`, `Your habits. One daily note.`, and `Atomic for Obsidian`.
- Do not add navigation, ratings, testimonials, partner logos, or a CTA.
- Desktop capture must be a complete `1600 × 900` Obsidian viewport with 12 books.
- Mobile capture must be a complete `390 × 844` Obsidian viewport with 3 books and content below the shelf.
- Keep Obsidian app chrome; remove only operating-system window decoration.
- Do not draw synthetic plugin content or an iOS status bar.
- Do not add dependencies.
- Do not use `pkill`; terminate only the process group launched by the capture script.

---

## File map

| File | Responsibility |
|---|---|
| `scripts/hero-capture-options.mjs` | Parse and validate the deterministic `--book-limit` seed option. |
| `tests/hero-capture-options.test.mjs` | Cover default, valid, malformed, and out-of-range book limits. |
| `scripts/seed-readme-demo-vault.mjs` | Seed either 12 desktop books or 3 mobile books, while keeping activity data identical. |
| `scripts/capture-readme-hero.sh` | Build two real Obsidian screenshots without hiding Obsidian chrome or killing unrelated processes. |
| `scripts/compose-device-hero.py` | Compose the warm landing-banner canvas, copy, desktop card, and overlapping phone frame. |
| `docs/images/atomic-daily-hero.png` | Committed generated banner consumed by `README.md`. |

---

### Task 1: Deterministic desktop and mobile vault seeds

**Files:**
- Create: `scripts/hero-capture-options.mjs`
- Create: `tests/hero-capture-options.test.mjs`
- Modify: `scripts/seed-readme-demo-vault.mjs`

**Interfaces:**
- Produces: `parseHeroBookLimit(argv: string[], maxBooks: number): number`
- Consumes: `process.argv.slice(2)` and the existing 12-entry `BOOKS` array.
- Produces for later tasks: `node scripts/seed-readme-demo-vault.mjs` seeds 12 books; `node scripts/seed-readme-demo-vault.mjs --book-limit 3` seeds exactly 3.

- [ ] **Step 1: Write failing option-parser tests**

Create `tests/hero-capture-options.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_HERO_BOOK_LIMIT,
  parseHeroBookLimit,
} from "../scripts/hero-capture-options.mjs";

test("parseHeroBookLimit defaults to 12", () => {
  assert.equal(DEFAULT_HERO_BOOK_LIMIT, 12);
  assert.equal(parseHeroBookLimit([], 12), 12);
});

test("parseHeroBookLimit accepts a positive count within the catalog", () => {
  assert.equal(parseHeroBookLimit(["--book-limit", "3"], 12), 3);
  assert.equal(parseHeroBookLimit(["--book-limit=7"], 12), 7);
});

test("parseHeroBookLimit rejects missing, malformed, and out-of-range values", () => {
  assert.throws(
    () => parseHeroBookLimit(["--book-limit"], 12),
    /requires an integer/,
  );
  assert.throws(
    () => parseHeroBookLimit(["--book-limit", "three"], 12),
    /requires an integer/,
  );
  assert.throws(
    () => parseHeroBookLimit(["--book-limit", "0"], 12),
    /between 1 and 12/,
  );
  assert.throws(
    () => parseHeroBookLimit(["--book-limit=13"], 12),
    /between 1 and 12/,
  );
});

test("parseHeroBookLimit rejects unknown arguments", () => {
  assert.throws(
    () => parseHeroBookLimit(["--books", "3"], 12),
    /Unknown argument: --books/,
  );
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node --test tests/hero-capture-options.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/hero-capture-options.mjs`.

- [ ] **Step 3: Implement the option parser**

Create `scripts/hero-capture-options.mjs`:

```js
export const DEFAULT_HERO_BOOK_LIMIT = 12;

export function parseHeroBookLimit(argv, maxBooks) {
  let raw = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--book-limit") {
      raw = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg.startsWith("--book-limit=")) {
      raw = arg.slice("--book-limit=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (raw === null && argv.includes("--book-limit")) {
    throw new Error("--book-limit requires an integer");
  }
  if (raw === null) return Math.min(DEFAULT_HERO_BOOK_LIMIT, maxBooks);

  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error("--book-limit requires an integer");
  }
  if (value < 1 || value > maxBooks) {
    throw new Error(`--book-limit must be between 1 and ${maxBooks}`);
  }
  return value;
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
node --test tests/hero-capture-options.test.mjs
```

Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Wire the book limit into the demo-vault seed**

In `scripts/seed-readme-demo-vault.mjs`, add:

```js
import { parseHeroBookLimit } from "./hero-capture-options.mjs";
```

Immediately after `BOOKS`, add:

```js
const bookLimit = parseHeroBookLimit(process.argv.slice(2), BOOKS.length);
const heroBooks = BOOKS.slice(0, bookLimit);
```

In `seedHobbyTimeLogs()`, replace:

```js
const [first, ...rest] = BOOKS;
```

with:

```js
const [first, ...rest] = heroBooks;
```

Replace the final log with:

```js
console.log(`Seeded demo vault at ${VAULT} with ${bookLimit} books`);
```

In `seedObsidianConfig()`, set:

```js
{
  theme: "moonstone",
  accentColor: "",
  showRibbon: true,
  enabledCssSnippets: [],
}
```

Delete the write of `.obsidian/snippets/readme-hero-fullscreen.css`. Obsidian chrome must remain visible.

- [ ] **Step 6: Verify both seed modes**

Run:

```bash
node scripts/seed-readme-demo-vault.mjs
rg --files "/workspace/obsidian-demo/atomics/hobbies/Reading/Items" | wc -l
node scripts/seed-readme-demo-vault.mjs --book-limit 3
rg --files "/workspace/obsidian-demo/atomics/hobbies/Reading/Items" | wc -l
```

Expected output counts: first `12`, then `3`.

- [ ] **Step 7: Run all Node tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit and push**

```bash
git add scripts/hero-capture-options.mjs scripts/seed-readme-demo-vault.mjs tests/hero-capture-options.test.mjs
git commit -m "test: add deterministic README hero seed modes"
git push -u origin cursor/hero-desktop-mobile-d226
```

---

### Task 2: Screenshot-first banner compositor

**Files:**
- Modify: `scripts/compose-device-hero.py`

**Interfaces:**
- Consumes: `--desktop /tmp/atomic-hero-shots/desktop.png`, `--mobile /tmp/atomic-hero-shots/mobile.png`, `--out /workspace/docs/images/atomic-daily-hero.png`.
- Produces: opaque RGB PNG with exact size `(1600, 900)`.
- Preserves: complete pixels from both screenshot inputs. The compositor may resize and mask corners but must not crop their content.

- [ ] **Step 1: Record the current failing output-size assertion**

Run the existing compositor against the most recent captures:

```bash
python3 scripts/compose-device-hero.py \
  --desktop /tmp/atomic-hero-shots/desktop.png \
  --mobile /tmp/atomic-hero-shots/mobile.png \
  --out /tmp/atomic-old-layout.png
python3 - <<'PY'
from PIL import Image
image = Image.open("/tmp/atomic-old-layout.png")
assert image.size == (1600, 900), image.size
assert image.mode == "RGB", image.mode
PY
```

Expected: FAIL because the current output is `(1720, 1020)` and RGBA.

- [ ] **Step 2: Replace the compositor constants and helpers**

Use these constants in `scripts/compose-device-hero.py`:

```python
WIDTH, HEIGHT = 1600, 900
BACKGROUND = "#F5F2EC"
TEXT = "#17191D"
MUTED = "#747980"
BORDER = "#D9DCE2"
DESKTOP_CARD = (80, 180, 1340, 890)
DESKTOP_INSET = 12
PHONE_FRAME = (1220, 240, 1520, 860)
PHONE_INSET = 12
```

Replace crop-to-fill behavior with a full-viewport contain helper:

```python
def contain(src: Image.Image, size: tuple[int, int], background: str) -> Image.Image:
    image = src.convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    result = Image.new("RGB", size, background)
    x = (size[0] - image.width) // 2
    y = (size[1] - image.height) // 2
    result.paste(image, (x, y))
    return result
```

Keep `rounded_mask()` and `font()`, but load DejaVu Sans at exact sizes:

```python
def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    filename = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(
        f"/usr/share/fonts/truetype/dejavu/{filename}",
        size,
    )
```

- [ ] **Step 3: Replace `compose()` with the approved direction B layout**

Implement:

```python
def compose(desktop: Image.Image, mobile: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(canvas)

    draw.text((80, 40), "ATOMIC", fill=TEXT, font=font(16, bold=True))
    draw.text(
        (80, 76),
        "Your habits. One daily note.",
        fill=TEXT,
        font=font(56, bold=True),
    )
    right_label = "Atomic for Obsidian"
    right_box = draw.textbbox((0, 0), right_label, font=font(15))
    right_width = right_box[2] - right_box[0]
    draw.text(
        (1520 - right_width, 56),
        right_label,
        fill=MUTED,
        font=font(15),
    )

    shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (72, 172, 1348, 898),
        radius=20,
        fill=(23, 29, 38, 34),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow).convert("RGB")
    draw = ImageDraw.Draw(canvas)

    draw.rounded_rectangle(
        DESKTOP_CARD,
        radius=16,
        fill=BORDER,
    )
    desktop_box = (
        DESKTOP_CARD[2] - DESKTOP_CARD[0] - DESKTOP_INSET * 2,
        DESKTOP_CARD[3] - DESKTOP_CARD[1] - DESKTOP_INSET * 2,
    )
    desktop_image = contain(desktop, desktop_box, "#FFFFFF")
    desktop_mask = rounded_mask(desktop_box, 10)
    canvas.paste(
        desktop_image,
        (DESKTOP_CARD[0] + DESKTOP_INSET, DESKTOP_CARD[1] + DESKTOP_INSET),
        desktop_mask,
    )

    phone_shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    phone_shadow_draw = ImageDraw.Draw(phone_shadow)
    phone_shadow_draw.rounded_rectangle(
        (1210, 230, 1530, 870),
        radius=50,
        fill=(23, 29, 38, 68),
    )
    phone_shadow = phone_shadow.filter(ImageFilter.GaussianBlur(22))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), phone_shadow).convert("RGB")
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(PHONE_FRAME, radius=44, fill="#17191D")

    phone_box = (
        PHONE_FRAME[2] - PHONE_FRAME[0] - PHONE_INSET * 2,
        PHONE_FRAME[3] - PHONE_FRAME[1] - PHONE_INSET * 2,
    )
    phone_image = contain(mobile, phone_box, "#FFFFFF")
    phone_mask = rounded_mask(phone_box, 34)
    canvas.paste(
        phone_image,
        (PHONE_FRAME[0] + PHONE_INSET, PHONE_FRAME[1] + PHONE_INSET),
        phone_mask,
    )
    return canvas
```

Delete the old laptop chassis, synthetic notch, synthetic status bar, mobile shelf crop, and perspective code.

- [ ] **Step 4: Make CLI failures explicit**

Before `Image.open`, validate inputs:

```python
for value in (args.desktop, args.mobile):
    if not Path(value).is_file():
        parser.error(f"missing screenshot: {value}")
```

Save with:

```python
out.save(args.out, "PNG", optimize=True)
```

- [ ] **Step 5: Verify exact output and full-viewport input preservation**

Run:

```bash
python3 scripts/compose-device-hero.py \
  --desktop /tmp/atomic-hero-shots/desktop.png \
  --mobile /tmp/atomic-hero-shots/mobile.png \
  --out /tmp/atomic-direction-b.png
python3 - <<'PY'
from PIL import Image
image = Image.open("/tmp/atomic-direction-b.png")
assert image.size == (1600, 900), image.size
assert image.mode == "RGB", image.mode
print(image.size, image.mode)
PY
```

Expected: `(1600, 900) RGB`.

- [ ] **Step 6: Commit and push**

```bash
git add scripts/compose-device-hero.py
git commit -m "docs: compose screenshot-first README banner"
git push -u origin cursor/hero-desktop-mobile-d226
```

---

### Task 3: Capture complete Obsidian desktop and mobile viewports

**Files:**
- Modify: `scripts/capture-readme-hero.sh`
- Update: `docs/images/atomic-daily-hero.png`

**Interfaces:**
- Consumes: `node scripts/seed-readme-demo-vault.mjs [--book-limit 3]`.
- Produces: `/tmp/atomic-hero-shots/desktop.png` at `1600 × 900`.
- Produces: `/tmp/atomic-hero-shots/mobile.png` at `390 × 844`.
- Produces: `docs/images/atomic-daily-hero.png` via `scripts/compose-device-hero.py`.

- [ ] **Step 1: Remove note-only capture behavior**

Delete from `scripts/capture-readme-hero.sh`:

- `DASH_FILE`
- `DASH_MOBILE_SHOT`
- creation and activation of `hero-capture.css`
- `ctrl+backslash`
- the optional mobile-dashboard capture
- all `pkill` calls

The seed from Task 1 already sets Light mode, Readable line length off, the ribbon visible, and no CSS snippets.

- [ ] **Step 2: Add precise process-group lifecycle functions**

Add:

```bash
OBS_PID=""

stop_obsidian() {
  if [[ -n "${OBS_PID}" ]] && kill -0 "${OBS_PID}" 2>/dev/null; then
    kill -TERM -- "-${OBS_PID}" 2>/dev/null || true
    wait "${OBS_PID}" 2>/dev/null || true
  fi
  OBS_PID=""
}

trap stop_obsidian EXIT

start_obsidian() {
  local encoded
  encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${DAILY_FILE}'))")
  local uri="obsidian://open?vault=${VAULT_ID}&file=${encoded}"
  setsid "$OBSIDIAN" --no-sandbox "$uri" >/tmp/obsidian-hero.log 2>&1 &
  OBS_PID=$!
}
```

Before the first launch, reject an existing Obsidian process without killing it:

```bash
if pgrep -x obsidian >/dev/null 2>&1; then
  echo "ERROR: Obsidian is already running. Close it before capturing." >&2
  pgrep -x obsidian >&2
  exit 1
fi
```

- [ ] **Step 3: Add one reusable capture function**

Implement:

```bash
capture_daily_note() {
  local width="$1"
  local height="$2"
  local destination="$3"
  local wait_seconds="$4"

  start_obsidian
  local win
  win=$(wait_for_window "2026-08-11")
  if [[ -z "$win" ]]; then
    echo "ERROR: Obsidian daily-note window not found" >&2
    tail -50 /tmp/obsidian-hero.log >&2 || true
    exit 1
  fi

  xdotool windowactivate --sync "$win"
  xdotool key --window "$win" Escape
  wmctrl -i -r "$win" -b add,undecorated 2>/dev/null || true
  xdotool windowmove --sync "$win" 0 0
  xdotool windowsize --sync "$win" "$width" "$height"
  xdotool windowactivate --sync "$win"
  xdotool key --window "$win" ctrl+Home || true
  sleep "$wait_seconds"

  screenshot_window "$width" "$height" "$destination"
  if [[ ! -s "$destination" ]]; then
    echo "ERROR: screenshot was not created: $destination" >&2
    exit 1
  fi
  stop_obsidian
  sleep 2
}
```

Change `screenshot_window()` to take only dimensions and destination:

```bash
screenshot_window() {
  local width="$1"
  local height="$2"
  local dest="$3"
  ffmpeg -y \
    -f x11grab \
    -video_size "${width}x${height}" \
    -i :1 \
    -frames:v 1 \
    -update 1 \
    "$dest" >/dev/null 2>&1
}
```

- [ ] **Step 4: Run the two deterministic capture passes**

Use:

```bash
node /workspace/scripts/seed-readme-demo-vault.mjs
capture_daily_note 1600 900 "$DESKTOP_SHOT" 18

node /workspace/scripts/seed-readme-demo-vault.mjs --book-limit 3
capture_daily_note 390 844 "$MOBILE_SHOT" 10

python3 /workspace/scripts/compose-device-hero.py \
  --desktop "$DESKTOP_SHOT" \
  --mobile "$MOBILE_SHOT" \
  --out "$OUT"
```

Print each file size after capture and the final output size.

- [ ] **Step 5: Verify all three image dimensions**

Run:

```bash
python3 - <<'PY'
from PIL import Image
expected = {
    "/tmp/atomic-hero-shots/desktop.png": (1600, 900),
    "/tmp/atomic-hero-shots/mobile.png": (390, 844),
    "/workspace/docs/images/atomic-daily-hero.png": (1600, 900),
}
for path, size in expected.items():
    image = Image.open(path)
    assert image.size == size, (path, image.size)
    print(path, image.size, image.mode)
PY
```

Expected: all assertions pass.

- [ ] **Step 6: Inspect the generated images**

Open these with the image reader:

- `/tmp/atomic-hero-shots/desktop.png`
- `/tmp/atomic-hero-shots/mobile.png`
- `/workspace/docs/images/atomic-daily-hero.png`

Acceptance:

- Desktop screenshot contains 12 books, Obsidian app chrome, actions, all four heatmaps, and today's sessions.
- Mobile screenshot contains exactly 3 books plus actions and responsive content below the shelf.
- Final banner follows direction B, keeps both screenshots uncropped, and has no synthetic status bar or device clutter.

- [ ] **Step 7: Commit and push before the full verification pass**

```bash
git add scripts/capture-readme-hero.sh docs/images/atomic-daily-hero.png
git commit -m "docs: capture full desktop and mobile README hero"
git push -u origin cursor/hero-desktop-mobile-d226
```

Update PR #32 with the final screenshot-first description before testing.

---

### Task 4: Full verification and handoff

**Files:**
- Verify only; modify prior task files only if a check exposes a defect.

**Interfaces:**
- Consumes: final branch state and `/workspace/obsidian-demo`.
- Produces: passing automated checks and visual evidence from Obsidian.

- [ ] **Step 1: Run required automated checks**

Run:

```bash
npm test
npm run typecheck
npm run build
git diff --quiet -- main.js
```

Expected: every command exits 0 and the production build leaves committed `main.js` unchanged.

- [ ] **Step 2: Run the required Obsidian E2E pass**

Use the seeded demo vault and verify:

1. Atomic is enabled.
2. `atomic-golf-cues`, `atomic-gym-cues`, `atomic-cues`, `atomic-timer`, and `atomic-bookshelf` render.
3. Reading timer start/stop updates Reading minutes in `atomic-heatmap`.
4. Settings show the color picker, shade swatches, enable/disable, Delete, and Add general habit.
5. `activity: reading` and `activity: gym, golf` filters render correctly.
6. Reading `status`, golf `felt`/`location`, and gym `location`/`weight_unit` dropdowns appear.
7. `atomic-bookshelf` with `status: reading` filters correctly.
8. The Reading Bases command opens with Bases enabled and notices when unavailable.
9. Legacy `fitness-*` aliases render while enabled.
10. Fitness migration turns the legacy toggle off.

Do not kill Obsidian after the E2E pass. Leave it running for follow-up testing.

- [ ] **Step 3: Confirm final repository state**

Run:

```bash
git diff --check
git status --short
```

Expected: no unintended generated bundle or demo-vault files. Only intended follow-up fixes may appear.

- [ ] **Step 4: Route failures back to the owning task**

- A book-count or seed failure returns to Task 1.
- A banner size, color, type, crop, border, or overlap failure returns to Task 2.
- A missing-window, wrong-viewport, incomplete-content, or process-cleanup failure returns to Task 3.
- Re-run all of Task 4 after the focused fix passes. Do not create an empty commit when no fix is needed.

- [ ] **Step 5: Update the pull request**

Update PR #32 with:

- final design summary,
- `npm test`, `npm run typecheck`, and `npm run build` results,
- confirmation of the Obsidian E2E pass,
- the final banner embedded from `docs/images/atomic-daily-hero.png`.

