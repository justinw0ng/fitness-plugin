#!/usr/bin/env python3
"""Generate original typographic demo book covers (invented titles, no publisher art)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "docs/demo-covers"
DEJAVU = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
DEJAVU_REG = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")

WIDTH, HEIGHT = 432, 672

BOOKS = [
    ("the-unhurried-advantage", "The Unhurried\nAdvantage", "#1B3A4B", "#F4EFE6", "#C4A35A"),
    ("ship-before-you-brand", "Ship Before\nYou Brand", "#8C2F1B", "#F7E6D4", "#F2C14E"),
    ("evenings-without-email", "Evenings\nWithout Email", "#0F4C5C", "#E8F1F2", "#7FB069"),
    ("the-practice-of-enough", "The Practice\nof Enough", "#3E5C3A", "#EEF3E6", "#D7C48A"),
    ("decisions-in-daylight", "Decisions in\nDaylight", "#C47B2B", "#FFF6E5", "#2C1810"),
    ("skill-before-scale", "Skill Before\nScale", "#222831", "#EEEEEE", "#F05454"),
    ("the-honest-hour", "The Honest\nHour", "#6B1D2A", "#F6E8E4", "#E0B084"),
    ("white-space-first", "White Space\nFirst", "#F7F4EE", "#17191D", "#9AA0A6"),
    ("the-narrow-yes", "The Narrow\nYes", "#2E1A47", "#EDE4F5", "#C9A227"),
    ("work-that-leaves", "Work That\nLeaves", "#1F3D2B", "#E7F0E8", "#A3C9A8"),
    ("drafts-before-decks", "Drafts Before\nDecks", "#314E6F", "#E6EEF6", "#E0C084"),
    ("a-smaller-ambition", "A Smaller\nAmbition", "#7A4450", "#F8EDEF", "#F0D3A8"),
]


def add_paper_grain(image: Image.Image, seed: int) -> None:
    """Deterministic grain so covers stay original without looking like flat fills."""
    pixels = image.load()
    state = seed & 0xFFFFFFFF
    for y in range(HEIGHT):
        for x in range(WIDTH):
            state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
            delta = (state % 17) - 8
            r, g, b = pixels[x, y]
            pixels[x, y] = (
                max(0, min(255, r + delta)),
                max(0, min(255, g + delta)),
                max(0, min(255, b + delta)),
            )


def wrap_font(draw: ImageDraw.ImageDraw, text: str, max_width: int, start: int) -> ImageFont.FreeTypeFont:
    size = start
    while size >= 22:
        candidate = ImageFont.truetype(str(DEJAVU), size)
        lines = text.split("\n")
        widest = max(draw.textbbox((0, 0), line, font=candidate)[2] for line in lines)
        if widest <= max_width:
            return candidate
        size -= 2
    return ImageFont.truetype(str(DEJAVU), 22)


def draw_cover(slug: str, title: str, bg: str, fg: str, accent: str, index: int) -> None:
    image = Image.new("RGB", (WIDTH, HEIGHT), bg)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 28, HEIGHT), fill=accent)
    draw.rectangle((36, 48, WIDTH - 36, 56), fill=accent)
    font = wrap_font(draw, title, WIDTH - 88, 44)
    y = 88
    for line in title.split("\n"):
        draw.text((52, y), line, fill=fg, font=font)
        y += font.size + 8
    motif_y = y + 36
    if index % 3 == 0:
        draw.ellipse((52, motif_y, 132, motif_y + 80), outline=accent, width=4)
    elif index % 3 == 1:
        draw.polygon(
            [(52, motif_y + 70), (92, motif_y), (132, motif_y + 70)],
            outline=accent,
        )
    else:
        draw.rectangle((52, motif_y, 148, motif_y + 8), fill=accent)
        draw.rectangle((52, motif_y + 24, 120, motif_y + 32), fill=accent)
    small = ImageFont.truetype(str(DEJAVU_REG), 16)
    draw.text((52, HEIGHT - 72), "A working draft", fill=fg, font=small)
    draw.rectangle((52, HEIGHT - 44, WIDTH - 52, HEIGHT - 36), fill=accent)
    add_paper_grain(image, 2026 + index * 97)
    image.save(OUT / f"{slug}.png")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for index, (slug, title, bg, fg, accent) in enumerate(BOOKS):
        draw_cover(slug, title, bg, fg, accent, index)
    print(f"Wrote {len(BOOKS)} covers to {OUT}")


if __name__ == "__main__":
    main()
