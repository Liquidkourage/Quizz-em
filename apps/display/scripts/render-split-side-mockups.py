"""Render 10 stage-tile mockups: 5 split-pot + 5 side-pot layout concepts."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "assets" / "winner-stage-card.png"
OUT_DIR = ROOT / "public" / "mockups" / "stage-variants"

TILE_W, TILE_H = 900, 538
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


def base_tile() -> tuple[Image.Image, ImageDraw.ImageDraw]:
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
    bg = bg.resize((TILE_W, TILE_H), Image.Resampling.LANCZOS)
    return bg, ImageDraw.Draw(bg)


def draw_label_bar(draw: ImageDraw.ImageDraw, title: str, subtitle: str) -> None:
    draw.rounded_rectangle((24, 14, TILE_W - 24, 62), radius=8, fill=(255, 248, 225, 235), outline=(226, 173, 26, 255), width=2)
    tf = load_font(22, bold=True)
    sf = load_font(16, bold=True)
    tw, _ = text_size(draw, title, tf)
    draw.text(((TILE_W - tw) // 2, 18), title, font=tf, fill=(26, 16, 8, 255))
    sw, _ = text_size(draw, subtitle, sf)
    draw.text(((TILE_W - sw) // 2, 40), subtitle, font=sf, fill=(107, 63, 0, 255))


def draw_side_banner(draw: ImageDraw.ImageDraw, title: str, subtitle: str = "") -> None:
    draw.rounded_rectangle((24, 14, TILE_W - 24, 62 if not subtitle else 72), radius=8, fill=(224, 255, 252, 235), outline=(45, 212, 191, 255), width=2)
    tf = load_font(22, bold=True)
    tw, _ = text_size(draw, title, tf)
    draw.text(((TILE_W - tw) // 2, 18), title, font=tf, fill=(8, 47, 73, 255))
    if subtitle:
        sf = load_font(15, bold=True)
        sw, _ = text_size(draw, subtitle, sf)
        draw.text(((TILE_W - sw) // 2, 42), subtitle, font=sf, fill=(21, 94, 117, 255))


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
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            draw.text((x + dx, y + dy), text, font=font, fill=stroke_fill or (0, 0, 0))
    draw.text((x, y), text, font=font, fill=fill)


def draw_pot_inline(draw: ImageDraw.ImageDraw, amount: str, each: bool = False, y_pct: float = 0.40) -> None:
    pot_font = load_font(48, bold=True)
    if each:
        main = f"${amount}"
        each_txt = " EACH"
        tw1, th = text_size(draw, main, pot_font)
        tw2, _ = text_size(draw, each_txt, load_font(28, bold=True))
        total = tw1 + tw2
        x = (TILE_W - total) // 2
        y = int(TILE_H * y_pct) - th // 2
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            draw.text((x + dx, y + dy), main, font=pot_font, fill=(0, 0, 0))
        draw.text((x, y), main, font=pot_font, fill=(226, 173, 26, 255))
        ef = load_font(28, bold=True)
        draw.text((x + tw1, y + 8), each_txt, font=ef, fill=(255, 248, 232, 255))
    else:
        draw_centered(draw, f"${amount}", y_pct, pot_font, (226, 173, 26, 255), stroke=2, stroke_fill=(0, 0, 0))


def draw_cards(draw: ImageDraw.ImageDraw, digits: list[str], y_pct: float = 0.505) -> None:
    card_font = load_font(30, bold=True)
    gap = 52
    start_x = TILE_W // 2 - (len(digits) * gap) // 2
    cy = int(TILE_H * y_pct)
    for i, digit in enumerate(digits):
        cx = start_x + i * gap
        if digit == ".":
            draw.text((cx + 6, cy + 38), digit, font=load_font(34, bold=True), fill=(226, 173, 26, 255), stroke_width=2, stroke_fill=(0, 0, 0))
            continue
        draw.rounded_rectangle((cx, cy, cx + 44, cy + 72), radius=6, outline=(226, 173, 26, 200), width=2, fill=(12, 18, 30, 240))
        tw, th = text_size(draw, digit, card_font)
        draw.text((cx + (44 - tw) // 2, cy + (72 - th) // 2 - 2), digit, font=card_font, fill=(226, 173, 26, 255))


def draw_footer(draw: ImageDraw.ImageDraw) -> None:
    draw_centered(draw, "-0.01", 0.862, load_font(42, bold=True), (255, 246, 220, 255), stroke=1, stroke_fill=(0, 0, 0))


def save(img: Image.Image, name: str, concept: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / name
    labeled = img.copy()
    d = ImageDraw.Draw(labeled)
    d.rounded_rectangle((8, TILE_H - 36, TILE_W - 8, TILE_H - 8), radius=6, fill=(0, 0, 0, 190))
    cf = load_font(14, bold=True)
    d.text((18, TILE_H - 30), concept, font=cf, fill=(255, 255, 255, 255))
    labeled.convert("RGB").save(out, optimize=True)
    print(out)


# --- Split pot mockups (tile 3: Alice C. · Blake R., $80 each) ---

def split_1_banner_subtitle() -> None:
    bg, draw = base_tile()
    draw_label_bar(draw, "SPLIT POT", "Alice C.  ·  Blake R.")
    draw_pot_inline(draw, "80", each=True)
    draw_cards(draw, ["3", "2", ".", "0", "3", "4"])
    draw_footer(draw)
    save(bg, "split-pot-01-banner-subtitle.png", "Split 1: Full names in banner subtitle")


def split_2_two_line_stack() -> None:
    bg, draw = base_tile()
    draw_label_bar(draw, "SPLIT POT", "")
    nf = load_font(34, bold=True)
    draw_centered(draw, "Alice C.", 0.22, nf, (255, 255, 255, 255), stroke=2, stroke_fill=(0, 0, 0))
    draw_centered(draw, "Blake R.", 0.28, nf, (255, 255, 255, 255), stroke=2, stroke_fill=(0, 0, 0))
    draw_pot_inline(draw, "80", each=True)
    draw_cards(draw, ["3", "2", ".", "0", "3", "4"])
    draw_footer(draw)
    save(bg, "split-pot-02-two-line-stack.png", "Split 2: Stacked names (no truncation)")


def split_3_winner_pills() -> None:
    bg, draw = base_tile()
    draw_label_bar(draw, "SPLIT POT", "")
    draw_centered(draw, "2 Winners", 0.24, load_font(36, bold=True), (255, 255, 255, 255), stroke=2, stroke_fill=(0, 0, 0))
    pill_y = int(TILE_H * 0.30)
    for i, name in enumerate(("Alice C.", "Blake R.")):
        px = TILE_W // 2 + (i * 2 - 1) * 120
        draw.rounded_rectangle((px - 70, pill_y - 14, px + 70, pill_y + 18), radius=12, fill=(0, 0, 0, 160), outline=(226, 173, 26, 220), width=2)
        pf = load_font(18, bold=True)
        tw, th = text_size(draw, name, pf)
        draw.text((px - tw // 2, pill_y - th // 2), name, font=pf, fill=(255, 255, 255, 255))
    draw_pot_inline(draw, "80", each=True, y_pct=0.42)
    draw_cards(draw, ["3", "2", ".", "0", "3", "4"])
    draw_footer(draw)
    save(bg, "split-pot-03-winner-pills.png", "Split 3: Count + name pills")


def split_4_pot_suffix_each() -> None:
    bg, draw = base_tile()
    draw_label_bar(draw, "SPLIT POT", "")
    draw_centered(draw, "Alice C. · Blake R.", 0.25, load_font(30, bold=True), (255, 255, 255, 255), stroke=2, stroke_fill=(0, 0, 0))
    pot_font = load_font(54, bold=True)
    each_font = load_font(32, bold=True)
    main, each = "$80", "EACH"
    tw1, th = text_size(draw, main, pot_font)
    tw2, _ = text_size(draw, each, each_font)
    x = (TILE_W - tw1 - tw2 - 8) // 2
    y = int(TILE_H * 0.40) - th // 2
    draw.text((x, y), main, font=pot_font, fill=(226, 173, 26, 255), stroke_width=2, stroke_fill=(0, 0, 0))
    draw.text((x + tw1 + 8, y + 6), each, font=each_font, fill=(226, 173, 26, 255))
    draw.text((x + tw1 + 8, y + 6), each, font=each_font, fill=(255, 248, 220, 255))
    draw_cards(draw, ["3", "2", ".", "0", "3", "4"])
    draw_footer(draw)
    save(bg, "split-pot-04-pot-suffix-each.png", "Split 4: $80 + gold EACH on same line")


def split_5_compact_wrap() -> None:
    bg, draw = base_tile()
    draw_label_bar(draw, "SPLIT POT", "")
    nf = load_font(26, bold=True)
    y = int(TILE_H * 0.23)
    for line in ("Alice C.  ·  Blake R.", "Chris T.  ·  Dana M."):
        tw, th = text_size(draw, line, nf)
        draw.text(((TILE_W - tw) // 2, y), line, font=nf, fill=(255, 255, 255, 255), stroke_width=1, stroke_fill=(0, 0, 0))
        y += th + 4
    draw_pot_inline(draw, "80", each=True, y_pct=0.42)
    draw_cards(draw, ["3", "2", ".", "0", "3", "4"])
    draw_footer(draw)
    save(bg, "split-pot-05-compact-wrap.png", "Split 5: Smaller font, 2-line name wrap (4-way example)")


# --- Side pot mockups (tile 4: MAIN Elena G. $227, SIDE Hugo F. $226) ---

def side_1_dual_gold_pots() -> None:
    bg, draw = base_tile()
    draw_side_banner(draw, "SIDE POT")
    draw_centered(draw, "Hugo F.", 0.24, load_font(36, bold=True), (255, 255, 255, 255), stroke=2, stroke_fill=(0, 0, 0))
    pf = load_font(38, bold=True)
    nf = load_font(20, bold=True)
    for i, (label, name, amt) in enumerate((("MAIN", "Elena G.", "227"), ("SIDE", "Hugo F.", "226"))):
        y = int(TILE_H * (0.36 + i * 0.08))
        lf = load_font(16, bold=True)
        draw.text((TILE_W // 2 - 180, y), label, font=lf, fill=(251, 191, 36, 255) if label == "MAIN" else (103, 232, 249, 255))
        draw.text((TILE_W // 2 - 90, y + 2), name, font=nf, fill=(255, 255, 255, 255))
        amt_txt = f"${amt}"
        tw, th = text_size(draw, amt_txt, pf)
        draw.text((TILE_W // 2 + 60, y - 4), amt_txt, font=pf, fill=(226, 173, 26, 255), stroke_width=1, stroke_fill=(0, 0, 0))
    draw_cards(draw, ["0", "1", "2", "3", ".", "7"])
    draw_footer(draw)
    save(bg, "side-pot-01-dual-gold-pots.png", "Side 1: Two pot-scale rows (MAIN + SIDE)")


def side_2_side_hero() -> None:
    bg, draw = base_tile()
    draw_side_banner(draw, "SIDE POT")
    draw_centered(draw, "Hugo F.", 0.24, load_font(36, bold=True), (255, 255, 255, 255), stroke=2, stroke_fill=(0, 0, 0))
    draw_centered(draw, "Main $227 → Elena G.", 0.34, load_font(18, bold=True), (200, 200, 200, 255))
    draw_centered(draw, "$226", 0.42, load_font(52, bold=True), (226, 173, 26, 255), stroke=2, stroke_fill=(0, 0, 0))
    draw_centered(draw, "SIDE", 0.48, load_font(16, bold=True), (103, 232, 249, 255))
    draw_cards(draw, ["0", "1", "2", "3", ".", "7"])
    draw_footer(draw)
    save(bg, "side-pot-02-side-hero.png", "Side 2: Side amount hero, main as subtitle")


def side_3_split_columns() -> None:
    bg, draw = base_tile()
    draw_side_banner(draw, "SIDE POT")
    mid = TILE_W // 2
    draw.line((mid, int(TILE_H * 0.22), mid, int(TILE_H * 0.52)), fill=(226, 173, 26, 120), width=2)
    lf = load_font(14, bold=True)
    pf = load_font(40, bold=True)
    nf = load_font(18, bold=True)
    for col, (label, name, amt, color) in enumerate(
        (
            ("MAIN", "Elena G.", "227", (251, 191, 36, 255)),
            ("SIDE", "Hugo F.", "226", (103, 232, 249, 255)),
        )
    ):
        cx = TILE_W // 4 if col == 0 else 3 * TILE_W // 4
        y0 = int(TILE_H * 0.28)
        tw, _ = text_size(draw, label, lf)
        draw.text((cx - tw // 2, y0), label, font=lf, fill=color)
        tw, _ = text_size(draw, name, nf)
        draw.text((cx - tw // 2, y0 + 22), name, font=nf, fill=(255, 255, 255, 255))
        amt_txt = f"${amt}"
        tw, th = text_size(draw, amt_txt, pf)
        draw.text((cx - tw // 2, y0 + 48), amt_txt, font=pf, fill=(226, 173, 26, 255))
    draw_cards(draw, ["0", "1", "2", "3", ".", "7"])
    draw_footer(draw)
    save(bg, "side-pot-03-split-columns.png", "Side 3: Left MAIN / right SIDE columns")


def side_4_amount_tabs() -> None:
    bg, draw = base_tile()
    draw_side_banner(draw, "SIDE POT", "Elena G. wins main · Hugo F. wins side")
    tab_y = int(TILE_H * 0.36)
    for i, (label, name, amt) in enumerate((("MAIN", "Elena G.", "227"), ("SIDE", "Hugo F.", "226"))):
        x0 = TILE_W // 2 + (i * 2 - 1) * 155 - 70
        draw.rounded_rectangle((x0, tab_y, x0 + 140, tab_y + 72), radius=10, fill=(0, 0, 0, 170), outline=(226, 173, 26, 200), width=2)
        lf = load_font(13, bold=True)
        draw.text((x0 + 10, tab_y + 6), label, font=lf, fill=(251, 191, 36, 255) if label == "MAIN" else (103, 232, 249, 255))
        draw.text((x0 + 10, tab_y + 24), name, font=load_font(16, bold=True), fill=(255, 255, 255, 255))
        draw.text((x0 + 10, tab_y + 44), f"${amt}", font=load_font(26, bold=True), fill=(226, 173, 26, 255))
    draw_cards(draw, ["0", "1", "2", "3", ".", "7"])
    draw_footer(draw)
    save(bg, "side-pot-04-amount-tabs.png", "Side 4: Tab cards with label + name + amount")


def side_5_both_names_crown() -> None:
    bg, draw = base_tile()
    draw_side_banner(draw, "SIDE POT")
    nf = load_font(30, bold=True)
    draw_centered(draw, "Elena G.", 0.22, nf, (255, 255, 255, 255), stroke=2, stroke_fill=(0, 0, 0))
    draw_centered(draw, "Hugo F.", 0.28, nf, (255, 255, 255, 255), stroke=2, stroke_fill=(0, 0, 0))
    y = int(TILE_H * 0.38)
    pf = load_font(44, bold=True)
    for i, (label, amt) in enumerate((("MAIN", "227"), ("SIDE", "226"))):
        cx = TILE_W // 2 + (i * 2 - 1) * 130
        lf = load_font(14, bold=True)
        tw, _ = text_size(draw, label, lf)
        draw.text((cx - tw // 2, y), label, font=lf, fill=(251, 191, 36, 255) if label == "MAIN" else (103, 232, 249, 255))
        amt_txt = f"${amt}"
        tw, th = text_size(draw, amt_txt, pf)
        draw.text((cx - tw // 2, y + 18), amt_txt, font=pf, fill=(226, 173, 26, 255))
    draw_cards(draw, ["0", "1", "2", "3", ".", "7"])
    draw_footer(draw)
    save(bg, "side-pot-05-both-names-crown.png", "Side 5: Both winners stacked, dual pot amounts")


def main() -> None:
    split_1_banner_subtitle()
    split_2_two_line_stack()
    split_3_winner_pills()
    split_4_pot_suffix_each()
    split_5_compact_wrap()
    side_1_dual_gold_pots()
    side_2_side_hero()
    side_3_split_columns()
    side_4_amount_tabs()
    side_5_both_names_crown()
    print(f"Wrote 10 mockups to {OUT_DIR}")


if __name__ == "__main__":
    main()
