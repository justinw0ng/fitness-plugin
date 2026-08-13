#!/usr/bin/env python3
"""Composite desktop + mobile screenshots into a README hero banner."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ModuleNotFoundError:
    print(
        "ERROR: Pillow is required. Install it with: python3 -m pip install Pillow",
        file=sys.stderr,
    )
    raise SystemExit(1)

WIDTH, HEIGHT = 1600, 900
BACKGROUND = "#F5F2EC"
TEXT = "#17191D"
MUTED = "#747980"
BORDER = "#D9DCE2"
DESKTOP_CARD = (80, 180, 1340, 890)
DESKTOP_INSET = 12
PHONE_FRAME = (1220, 240, 1520, 860)
PHONE_INSET = 12
REPO = Path(__file__).resolve().parents[1]
JERSEY_FONT = REPO / "docs/fonts/Jersey20-Regular.ttf"
DEJAVU_DIR = Path("/usr/share/fonts/truetype/dejavu")


def font(size: int, bold: bool = False, jersey: bool = False) -> ImageFont.FreeTypeFont:
    if jersey:
        if not JERSEY_FONT.is_file():
            raise FileNotFoundError(f"missing Jersey 20 font: {JERSEY_FONT}")
        return ImageFont.truetype(str(JERSEY_FONT), size)
    filename = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(str(DEJAVU_DIR / filename), size)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size[0] - 1, size[1] - 1), radius, fill=255
    )
    return mask


def contain(src: Image.Image, size: tuple[int, int], background: str) -> Image.Image:
    image = src.convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    result = Image.new("RGB", size, background)
    x = (size[0] - image.width) // 2
    y = (size[1] - image.height) // 2
    result.paste(image, (x, y))
    return result


def compose(desktop: Image.Image, mobile: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(canvas)

    draw.text((80, 36), "ATOMIC TRACKER", fill=TEXT, font=font(24, jersey=True))
    draw.text(
        (80, 68),
        "Your habits. One daily note.",
        fill=TEXT,
        font=font(56, jersey=True),
    )
    right_label = "Atomic Tracker"
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--desktop", required=True)
    parser.add_argument("--mobile", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    for value in (args.desktop, args.mobile):
        if not Path(value).is_file():
            parser.error(f"missing screenshot: {value}")

    out = compose(Image.open(args.desktop), Image.open(args.mobile))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    out.save(args.out, "PNG", optimize=True)
    print(f"wrote {args.out} {out.size} {out.mode}")


if __name__ == "__main__":
    main()
