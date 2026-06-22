"""Render a corrected winner-stage tile preview (Alice C. reference)."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "assets" / "winner-stage-card.png"
OUT = ROOT / "public" / "alice-winner-corrected.png"

TILE_W, TILE_H = 806, 482
ZOOM = 1.2


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    names = ("arialbd.ttf", "arial.ttf") if bold else ("arial.ttf", "segoeui.ttf")
    for name in names:
        path = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts" / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1]


def draw_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    y_pct: float,
    font: ImageFont.ImageFont,
    fill: tuple[int, ...],
    *,
    stroke: int = 0,
    stroke_fill: tuple[int, ...] | None = None,
) -> None:
    tw, th = text_size(draw, text, font)
    x = (TILE_W - tw) // 2
    y = int(TILE_H * y_pct) - th // 2
    if stroke:
        for dx, dy in (
            (-1, 0),
            (1, 0),
            (0, -1),
            (0, 1),
            (-1, -1),
            (1, 1),
            (-1, 1),
            (1, -1),
        ):
            draw.text((x + dx, y + dy), text, font=font, fill=stroke_fill or (0, 0, 0))
    draw.text((x, y), text, font=font, fill=fill)


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    sw, sh = im.size

    frame_w = int(TILE_W * ZOOM)
    frame_h = int(TILE_H * ZOOM)
    art_h = frame_h
    art_w = round(sw * art_h / sh)
    art = im.resize((art_w, art_h), Image.Resampling.LANCZOS)
    left = max(0, (art_w - frame_w) // 2)
    frame = art.crop((left, 0, left + frame_w, frame_h))
    ox = (frame_w - TILE_W) // 2
    oy = (frame_h - TILE_H) // 2
    bg = frame.crop((ox, oy, ox + TILE_W, oy + TILE_H)).copy()

    draw = ImageDraw.Draw(bg)

    badge_font = load_font(22, bold=True)
    draw.rounded_rectangle((12, 12, 58, 44), radius=8, outline=(226, 173, 26, 220), width=2, fill=(0, 0, 0, 180))
    draw.text((22, 16), "13", font=badge_font, fill=(226, 173, 26, 255))

    draw_centered(draw, "Alice C.", 0.25, load_font(46, bold=True), (255, 255, 255, 255), stroke=2, stroke_fill=(0, 0, 0, 200))
    draw_centered(draw, "$6,000", 0.40, load_font(52, bold=True), (226, 173, 26, 255), stroke=2, stroke_fill=(0, 0, 0, 180))

    digits = ["3", "2", ".", "0", "3", "4"]
    card_font = load_font(28, bold=True)
    start_x = TILE_W // 2 - (len(digits) * 52) // 2
    cy = int(TILE_H * 0.505)
    for i, digit in enumerate(digits):
        cx = start_x + i * 52
        if digit == ".":
            draw.text((cx + 8, cy + 34), digit, font=card_font, fill=(226, 173, 26, 255))
            continue
        draw.rounded_rectangle(
            (cx, cy, cx + 44, cy + 72),
            radius=6,
            outline=(226, 173, 26, 200),
            width=2,
            fill=(12, 18, 30, 240),
        )
        tw, th = text_size(draw, digit, card_font)
        draw.text((cx + (44 - tw) // 2, cy + (72 - th) // 2 - 2), digit, font=card_font, fill=(226, 173, 26, 255))

    draw_centered(draw, "+0.034", 0.862, load_font(44, bold=True), (34, 6, 16, 255), stroke=1, stroke_fill=(255, 248, 230, 200))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    bg.convert("RGB").save(OUT, optimize=True)
    print(OUT, bg.size)


if __name__ == "__main__":
    main()
