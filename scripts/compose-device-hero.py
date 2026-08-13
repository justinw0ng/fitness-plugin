#!/usr/bin/env python3
"""Composite desktop + mobile screenshots onto a laptop/phone device mockup."""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


W, H = 1720, 1020
LAPTOP_SCREEN = (72, 86, 1298, 792)
PHONE_FRAME = (1218, 96, 1578, 852)
PHONE_SCREEN = (1234, 168, 1562, 836)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    )
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size[0] - 1, size[1] - 1), radius, fill=255
    )
    return mask


def crop_window_chrome(src: Image.Image) -> Image.Image:
    img = src.convert("RGB")
    w, h = img.size
    top = 0
    for y in range(min(h, 80)):
        whites = 0
        samples = 0
        for x in range(0, w, 4):
            samples += 1
            if img.getpixel((x, y))[0] > 240:
                whites += 1
        if samples and whites / samples > 0.6:
            top = y
            break
    left = 0
    for x in range(min(w, 40)):
        p = img.getpixel((x, min(h - 1, top + 40)))
        if p[0] > 240:
            left = x
            break
    if top == 0 and left == 0:
        return img
    return img.crop((left, top, w, h))


def crop_mobile_three_books(src: Image.Image) -> Image.Image:
    """Keep the daily-note header plus the first shelf (three covers)."""
    img = crop_window_chrome(src)
    w, h = img.size
    if w > 16:
        img = img.crop((0, 0, w - 8, h))
        w, h = img.size

    shelf_y = None
    in_bar = False
    for y in range(220, min(h, 480)):
        pixels = [img.getpixel((x, y)) for x in range(24, w - 24, 3)]
        if not pixels:
            continue
        avg = tuple(sum(p[i] for p in pixels) // len(pixels) for i in range(3))
        spread = max(p[0] for p in pixels) - min(p[0] for p in pixels)
        is_bar = 200 <= avg[0] <= 228 and abs(avg[0] - avg[1]) < 8 and spread < 36
        if is_bar:
            in_bar = True
            shelf_y = y
        elif in_bar:
            break
    if shelf_y is None:
        shelf_y = min(h, 380)
    bottom = min(h, shelf_y + 28)
    cropped = img.crop((0, 0, w, bottom))

    phone_h = max(bottom, int(w * 2.05))
    padded = Image.new("RGB", (w, phone_h), (255, 255, 255))
    padded.paste(cropped, (0, 0))
    return padded


def fit_cover(src: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    tw, th = box[2] - box[0], box[3] - box[1]
    img = src.convert("RGB")
    scale = max(tw / img.width, th / img.height)
    nw, nh = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = max(0, (nw - tw) // 2)
    return img.crop((left, 0, left + tw, th))


def paste_rounded(
    canvas: Image.Image, src: Image.Image, xy: tuple[int, int], radius: int
) -> None:
    rgba = src.convert("RGBA")
    canvas.paste(rgba, xy, rounded_mask(rgba.size, radius))


def compose(desktop: Image.Image, mobile: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)

    lid = (48, 58, 1322, 812)
    base = (22, 812, 1348, 846)
    phone = PHONE_FRAME

    sdraw.rounded_rectangle(lid, 22, fill=(0, 0, 0, 80))
    sdraw.rounded_rectangle(base, 10, fill=(0, 0, 0, 60))
    sdraw.rounded_rectangle(phone, 48, fill=(0, 0, 0, 90))
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(22)))

    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(lid, 18, fill=(196, 198, 202))
    draw.rounded_rectangle((56, 66, 1314, 804), 14, fill=(16, 16, 18))
    nx = (lid[0] + lid[2]) // 2
    draw.rounded_rectangle((nx - 36, 58, nx + 36, 78), 10, fill=(16, 16, 18))
    draw.ellipse((nx - 5, 62, nx + 5, 72), fill=(48, 48, 52))
    draw.ellipse((nx - 2, 65, nx + 2, 69), fill=(110, 160, 200))

    draw.rounded_rectangle(base, 8, fill=(210, 212, 216))
    draw.rectangle((22, 812, 1348, 822), fill=(186, 188, 192))
    draw.rounded_rectangle((600, 812, 770, 828), 8, fill=(168, 170, 174))

    draw.rounded_rectangle(phone, 44, fill=(214, 216, 220))
    draw.rounded_rectangle((1226, 104, 1570, 844), 38, fill=(16, 16, 18))

    desk = fit_cover(crop_window_chrome(desktop), LAPTOP_SCREEN)
    paste_rounded(canvas, desk, (LAPTOP_SCREEN[0], LAPTOP_SCREEN[1]), 8)

    phone_img = fit_cover(crop_mobile_three_books(mobile), PHONE_SCREEN)
    paste_rounded(canvas, phone_img, (PHONE_SCREEN[0], PHONE_SCREEN[1]), 24)

    overlay = ImageDraw.Draw(canvas)
    overlay.rectangle(
        (PHONE_SCREEN[0], PHONE_FRAME[1] + 10, PHONE_SCREEN[2], PHONE_SCREEN[1]),
        fill=(255, 255, 255),
    )
    overlay.rounded_rectangle((1348, 118, 1448, 146), 15, fill=(8, 8, 10))
    overlay.text(
        (PHONE_SCREEN[0] + 16, 124),
        "9:41",
        fill=(20, 20, 20),
        font=font(15, bold=True),
    )
    rx = PHONE_SCREEN[2] - 16
    overlay.rounded_rectangle((rx - 24, 128, rx, 140), 3, outline=(20, 20, 20), width=1)
    overlay.rectangle((rx - 22, 130, rx - 8, 138), fill=(20, 20, 20))
    overlay.rectangle((rx + 1, 132, rx + 3, 136), fill=(20, 20, 20))
    wx, wy = rx - 42, 140
    overlay.arc((wx - 9, wy - 10, wx + 9, wy + 4), 200, 340, fill=(20, 20, 20), width=2)
    overlay.arc((wx - 5, wy - 6, wx + 5, wy + 3), 200, 340, fill=(20, 20, 20), width=2)
    overlay.ellipse((wx - 1, wy - 1, wx + 2, wy + 2), fill=(20, 20, 20))
    sx = rx - 64
    for i, bar_h in enumerate((4, 6, 8, 11)):
        overlay.rectangle((sx + i * 4, 141 - bar_h, sx + i * 4 + 2, 141), fill=(20, 20, 20))

    overlay.rounded_rectangle((1212, 250, 1220, 310), 2, fill=(176, 178, 182))
    overlay.rounded_rectangle((1212, 330, 1220, 400), 2, fill=(176, 178, 182))
    overlay.rounded_rectangle((1576, 290, 1584, 380), 2, fill=(176, 178, 182))

    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--desktop", required=True)
    parser.add_argument("--mobile", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    out = compose(Image.open(args.desktop), Image.open(args.mobile))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    out.save(args.out, "PNG", optimize=True)
    print(f"wrote {args.out} {out.size} {out.mode}")


if __name__ == "__main__":
    main()
