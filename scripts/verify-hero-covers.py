#!/usr/bin/env python3
"""Pass when bookshelf covers show the painted left-edge stripe.

Fallback shelf tiles are a flat hashed color with a centered title. The demo
PNGs have a distinct spine stripe, so desktop and mobile hero shots can wait
for the same cover art instead of capturing the fallback tiles.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


def is_gap(rgb: tuple[int, int, int]) -> bool:
    red, green, blue = rgb
    chroma = max(red, green, blue) - min(red, green, blue)
    luma = (red + green + blue) / 3
    return chroma < 16 and luma >= 175


def mean_rgb(
    pixels: object,
    coords: list[tuple[int, int]],
) -> tuple[float, float, float]:
    acc = [0.0, 0.0, 0.0]
    count = 0
    for x, y in coords:
        red, green, blue = pixels[x, y]
        acc[0] += red
        acc[1] += green
        acc[2] += blue
        count += 1
    if count == 0:
        return (0.0, 0.0, 0.0)
    return (acc[0] / count, acc[1] / count, acc[2] / count)


def rgb_diff(
    left: tuple[float, float, float],
    right: tuple[float, float, float],
) -> float:
    return sum(abs(a - b) for a, b in zip(left, right)) / 3


def count_striped_covers(path: Path) -> tuple[int, int]:
    image = Image.open(path).convert("RGB")
    width, height = image.size
    pixels = image.load()

    best_y = int(height * 0.18)
    best = 0
    for y in range(int(height * 0.10), int(height * 0.34)):
        painted = 0
        for x in range(0, width, 2):
            color = pixels[x, y]
            if not is_gap(color) and sum(color) / 3 < 250:
                painted += 1
        if painted > best:
            best = painted
            best_y = y

    runs: list[tuple[int, int]] = []
    run: list[int] | None = None
    for x in range(width):
        color = pixels[x, best_y]
        gap = is_gap(color) or sum(color) / 3 >= 250
        if not gap:
            if run is None:
                run = [x, x]
            else:
                run[1] = x
            continue
        if run is not None and run[1] - run[0] >= 40:
            runs.append((run[0], run[1]))
        run = None
    if run is not None and run[1] - run[0] >= 40:
        runs.append((run[0], run[1]))

    striped = 0
    for x0, x1 in runs:
        book_width = x1 - x0 + 1
        cx = (x0 + x1) // 2
        y0 = best_y
        while y0 > 0 and not is_gap(pixels[cx, y0]) and sum(pixels[cx, y0]) / 3 < 250:
            y0 -= 1
        y1 = best_y
        while (
            y1 < height - 1
            and not is_gap(pixels[cx, y1])
            and sum(pixels[cx, y1]) / 3 < 250
        ):
            y1 += 1
        book_height = max(1, y1 - y0)
        sample_y = y0 + int(book_height * 0.48)
        stripe = mean_rgb(
            pixels,
            [
                (x0 + max(2, int(book_width * percent)), sample_y)
                for percent in (0.04, 0.05, 0.06, 0.07)
            ],
        )
        face = mean_rgb(
            pixels,
            [
                (x0 + int(book_width * percent), sample_y)
                for percent in (0.28, 0.32, 0.36, 0.40)
            ],
        )
        if rgb_diff(stripe, face) >= 28:
            striped += 1
    return striped, len(runs)


def main() -> None:
    if len(sys.argv) != 3:
        print("usage: verify-hero-covers.py IMAGE MIN_STRIPED", file=sys.stderr)
        raise SystemExit(2)
    path = Path(sys.argv[1])
    min_striped = int(sys.argv[2])
    striped, books = count_striped_covers(path)
    print(f"typographic covers striped={striped} books={books} min={min_striped}")
    if striped < min_striped:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
