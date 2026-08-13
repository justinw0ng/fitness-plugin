#!/usr/bin/env python3
"""Animate the rightmost hero-shelf book opening and write a looping GIF.

Works from the composed banner PNG, or from the desktop + mobile captures used
by compose-device-hero.py. CSS 3D is not required: the cover hinges in 2D by
scaling from the spine, matching the plugin's left-edge open.
"""
from __future__ import annotations

import argparse
import importlib.util
import math
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ModuleNotFoundError:
    print(
        "ERROR: Pillow is required. Install it with: python3 -m pip install Pillow",
        file=sys.stderr,
    )
    raise SystemExit(1)

REPO = Path(__file__).resolve().parents[1]
DEFAULT_HERO = REPO / "docs/images/atomic-daily-hero.png"
DEFAULT_GIF = REPO / "docs/images/atomic-daily-hero.gif"
DEJAVU = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
DEJAVU_REG = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")

# Desktop card on the 1600×900 banner; stay left of the phone overlap.
HERO_SEARCH = (80, 180, 1210, 430)
RIGHTMOST_TITLE = "Work That Leaves"
RIGHTMOST_SUBTITLE = "reading"
PAGES = (248, 241, 223)
PAGE_INK = (63, 52, 34)
TOOLTIP_BG = (30, 30, 30)
TOOLTIP_FG = (255, 255, 255)

OPEN_FRAMES = 10
HOLD_FRAMES = 10
CLOSE_FRAMES = 10
REST_FRAMES = 6
FPS = 16


@dataclass(frozen=True)
class BookRect:
    x0: int
    y0: int
    x1: int
    y1: int

    @property
    def width(self) -> int:
        return self.x1 - self.x0 + 1

    @property
    def height(self) -> int:
        return self.y1 - self.y0 + 1

    @property
    def box(self) -> tuple[int, int, int, int]:
        return (self.x0, self.y0, self.x1 + 1, self.y1 + 1)


def is_gap(rgb: tuple[int, int, int]) -> bool:
    red, green, blue = rgb
    chroma = max(red, green, blue) - min(red, green, blue)
    luma = (red + green + blue) / 3
    return chroma < 16 and luma >= 175


def painted(rgb: tuple[int, int, int]) -> bool:
    return not is_gap(rgb) and sum(rgb) / 3 < 248


def load_compose():
    path = REPO / "scripts/compose-device-hero.py"
    spec = importlib.util.spec_from_file_location("compose_device_hero", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def locate_shelf_books(
    image: Image.Image,
    region: tuple[int, int, int, int] | None = None,
) -> list[BookRect]:
    width, height = image.size
    pixels = image.load()
    if region is None:
        if width == 1600 and height == 900:
            left, top, right, bottom = HERO_SEARCH
        else:
            left, top, right, bottom = 0, int(height * 0.08), width, int(height * 0.40)
    else:
        left, top, right, bottom = region

    best_y = top
    best = 0
    for y in range(top, min(bottom, height)):
        count = 0
        for x in range(left, min(right, width), 2):
            if painted(pixels[x, y]):
                count += 1
        if count > best:
            best = count
            best_y = y

    runs: list[tuple[int, int]] = []
    run: list[int] | None = None
    for x in range(left, min(right, width)):
        gap = not painted(pixels[x, best_y])
        if not gap:
            if run is None:
                run = [x, x]
            else:
                run[1] = x
            continue
        if run is not None and run[1] - run[0] >= 20:
            runs.append((run[0], run[1]))
        run = None
    if run is not None and run[1] - run[0] >= 20:
        runs.append((run[0], run[1]))

    def is_book_row(cx: int, y: int) -> bool:
        hit = 0
        total = 0
        for dx in range(-4, 5):
            x = cx + dx
            if 0 <= x < width:
                total += 1
                if painted(pixels[x, y]):
                    hit += 1
        return total > 0 and hit / total >= 0.4

    books: list[BookRect] = []
    for x0, x1 in runs:
        cx = (x0 + x1) // 2
        y = best_y
        while y > 0 and is_book_row(cx, y):
            y -= 1
        top_y = y + 1
        y = best_y
        while y < height - 1 and is_book_row(cx, y):
            y += 1
        bottom_y = y - 1
        books.append(BookRect(x0, top_y, x1, bottom_y))

    tall = [book.height for book in books if book.height >= 40]
    if not tall:
        raise RuntimeError("could not locate bookshelf covers")
    tall.sort()
    median = tall[len(tall) // 2]
    filtered = [book for book in books if book.height >= int(median * 0.6)]
    if not filtered:
        raise RuntimeError("could not locate a full-height rightmost book")
    return filtered


def rightmost_book(books: list[BookRect]) -> BookRect:
    return max(books, key=lambda book: book.x1)


def ease_out(progress: float) -> float:
    t = max(0.0, min(1.0, progress))
    return 1 - (1 - t) ** 4


def cover_width_scale(progress: float) -> float:
    angle = ease_out(progress) * 80.0
    return max(0.12, math.cos(math.radians(angle)))


def lift_px(progress: float, max_lift: int = 8) -> int:
    return int(round(ease_out(progress) * max_lift))


def wrap_words(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        trial = word if not current else f"{current} {word}"
        if draw.textbbox((0, 0), trial, font=font)[2] <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [text]


def page_face(size: tuple[int, int], title: str, subtitle: str) -> Image.Image:
    image = Image.new("RGB", size, PAGES)
    draw = ImageDraw.Draw(image)
    width, height = size
    try:
        title_font = ImageFont.truetype(str(DEJAVU), max(7, min(11, width // 6)))
    except OSError:
        title_font = ImageFont.load_default()
    try:
        sub_font = ImageFont.truetype(str(DEJAVU_REG), max(6, min(9, width // 8)))
    except OSError:
        sub_font = ImageFont.load_default()
    x = max(4, width // 10)
    y = max(6, height // 10)
    max_width = width - x - 3
    for line in wrap_words(draw, title, title_font, max_width):
        draw.text((x, y), line, fill=PAGE_INK, font=title_font)
        y += title_font.size + 1
    y += 4
    draw.text((x, y), subtitle, fill=(107, 90, 58), font=sub_font)
    return image


def erase_book(frame: Image.Image, book: BookRect) -> None:
    col_x = max(0, book.x0 - 3)
    strip = frame.crop((col_x, book.y0, col_x + 1, book.y1 + 1))
    for x in range(book.x0, book.x1 + 1):
        frame.paste(strip, (x, book.y0))


def draw_tooltip(
    frame: Image.Image,
    book: BookRect,
    lift: int,
    title: str,
    subtitle: str,
    opacity: float,
) -> None:
    if opacity <= 0:
        return
    draw_probe = ImageDraw.Draw(frame)
    title_font = ImageFont.truetype(str(DEJAVU), 12)
    sub_font = ImageFont.truetype(str(DEJAVU_REG), 11)
    pad_x, pad_y = 10, 8
    title_box = draw_probe.textbbox((0, 0), title, font=title_font)
    sub_box = draw_probe.textbbox((0, 0), subtitle, font=sub_font)
    box_w = max(title_box[2], sub_box[2]) + pad_x * 2
    box_h = (title_box[3] - title_box[1]) + (sub_box[3] - sub_box[1]) + pad_y * 2 + 6
    cx = (book.x0 + book.x1) // 2
    left = max(4, cx - box_w // 2)
    top = max(4, book.y0 - lift - 8 - box_h)
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    alpha = int(255 * opacity)
    fill = (*TOOLTIP_BG, alpha)
    draw.rounded_rectangle((left, top, left + box_w, top + box_h), 8, fill=fill)
    draw.polygon(
        [
            (cx - 6, top + box_h),
            (cx + 6, top + box_h),
            (cx, top + box_h + 6),
        ],
        fill=fill,
    )
    ink = (*TOOLTIP_FG, alpha)
    draw.text((left + pad_x, top + pad_y), title, fill=ink, font=title_font)
    draw.text(
        (left + pad_x, top + pad_y + title_font.size + 4),
        subtitle,
        fill=(*TOOLTIP_FG, int(alpha * 0.8)),
        font=sub_font,
    )
    frame.paste(Image.alpha_composite(frame.convert("RGBA"), overlay).convert("RGB"))


def render_open_frame(
    closed: Image.Image,
    book: BookRect,
    cover: Image.Image,
    progress: float,
    title: str,
    subtitle: str,
) -> Image.Image:
    if progress <= 0.001:
        return closed.copy()
    frame = closed.copy()
    lift = lift_px(progress)
    erase_book(frame, book)
    dest = (book.x0, book.y0 - lift)
    pages = page_face((book.width, book.height), title, subtitle)
    frame.paste(pages, dest)
    scale = cover_width_scale(progress)
    cover_w = max(2, int(round(book.width * scale)))
    hinged = cover.resize((cover_w, book.height), Image.Resampling.LANCZOS)
    frame.paste(hinged, dest)
    tooltip = 0.0 if progress < 0.4 else min(1.0, (progress - 0.4) / 0.25)
    draw_tooltip(frame, book, lift, title, subtitle, tooltip)
    return frame


def timeline() -> list[float]:
    frames: list[float] = []
    for index in range(OPEN_FRAMES):
        frames.append((index + 1) / OPEN_FRAMES)
    frames.extend([1.0] * HOLD_FRAMES)
    for index in range(CLOSE_FRAMES):
        frames.append(1.0 - (index + 1) / CLOSE_FRAMES)
    frames.extend([0.0] * REST_FRAMES)
    return frames


def save_gif(frames: list[Image.Image], destination: Path) -> None:
    if not frames:
        raise RuntimeError("no frames to encode")
    destination.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        tmp = Path(tempfile.mkdtemp(prefix="atomic-hero-gif-"))
        try:
            for index, frame in enumerate(frames):
                frame.save(tmp / f"frame-{index:03d}.png")
            palette = tmp / "palette.png"
            pattern = str(tmp / "frame-%03d.png")
            subprocess.run(
                [
                    ffmpeg,
                    "-y",
                    "-framerate",
                    str(FPS),
                    "-i",
                    pattern,
                    "-vf",
                    "palettegen=max_colors=180:stats_mode=diff",
                    str(palette),
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            subprocess.run(
                [
                    ffmpeg,
                    "-y",
                    "-framerate",
                    str(FPS),
                    "-i",
                    pattern,
                    "-i",
                    str(palette),
                    "-lavfi",
                    "paletteuse=dither=bayer:bayer_scale=4",
                    "-loop",
                    "0",
                    str(destination),
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
        return
    delay = int(round(1000 / FPS))
    frames[0].save(
        destination,
        save_all=True,
        append_images=frames[1:],
        duration=delay,
        loop=0,
        optimize=True,
    )


def animate_image(
    closed: Image.Image,
    title: str,
    subtitle: str,
    region: tuple[int, int, int, int] | None = None,
) -> tuple[list[Image.Image], BookRect]:
    books = locate_shelf_books(closed, region)
    book = rightmost_book(books)
    cover = closed.crop(book.box)
    frames = [
        render_open_frame(closed, book, cover, progress, title, subtitle)
        for progress in timeline()
    ]
    return frames, book


def build_frames(
    hero: Path | None,
    desktop: Path | None,
    mobile: Path | None,
    title: str,
    subtitle: str,
) -> list[Image.Image]:
    if desktop and mobile:
        compose = load_compose()
        desktop_image = Image.open(desktop).convert("RGB")
        mobile_image = Image.open(mobile).convert("RGB")
        region = (0, 0, desktop_image.width, int(desktop_image.height * 0.42))
        desktop_frames, _ = animate_image(desktop_image, title, subtitle, region)
        return [compose.compose(frame, mobile_image) for frame in desktop_frames]
    if hero is None:
        raise RuntimeError("provide --hero or both --desktop and --mobile")
    closed = Image.open(hero).convert("RGB")
    frames, _ = animate_image(closed, title, subtitle)
    return frames


def dump_book(hero: Path) -> BookRect:
    image = Image.open(hero).convert("RGB")
    return rightmost_book(locate_shelf_books(image))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--hero", type=Path, default=None)
    parser.add_argument("--desktop", type=Path, default=None)
    parser.add_argument("--mobile", type=Path, default=None)
    parser.add_argument("--out", type=Path, default=DEFAULT_GIF)
    parser.add_argument("--title", default=RIGHTMOST_TITLE)
    parser.add_argument("--subtitle", default=RIGHTMOST_SUBTITLE)
    parser.add_argument("--dump-book", action="store_true")
    parser.add_argument("--preview-frame", type=Path, default=None)
    args = parser.parse_args()

    if args.dump_book:
        source = args.hero or DEFAULT_HERO
        if not source.is_file():
            parser.error(f"missing hero: {source}")
        book = dump_book(source)
        print(
            f"x0={book.x0} y0={book.y0} x1={book.x1} y1={book.y1} "
            f"w={book.width} h={book.height}"
        )
        return

    hero = args.hero
    if args.desktop is None and args.mobile is None and hero is None:
        hero = DEFAULT_HERO
    if hero is not None and not hero.is_file():
        parser.error(f"missing hero: {hero}")
    if (args.desktop is None) ^ (args.mobile is None):
        parser.error("provide both --desktop and --mobile")

    frames = build_frames(hero, args.desktop, args.mobile, args.title, args.subtitle)
    if args.preview_frame:
        open_index = OPEN_FRAMES - 1
        frames[open_index].save(args.preview_frame)
        print(f"wrote preview {args.preview_frame}")
    save_gif(frames, args.out)
    size = args.out.stat().st_size
    print(f"wrote {args.out} frames={len(frames)} bytes={size} size={frames[0].size}")


if __name__ == "__main__":
    main()
