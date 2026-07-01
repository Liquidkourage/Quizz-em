"""Round 2 mockups — split (from 4/5) and side (from 1/3) refinements."""
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


def draw_split_banner(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle(
        (24, 14, TILE_W - 24, 62),
        radius=8,
        fill=(255, 248, 225, 235),
        outline=(226, 173, 26, 255),
        width=2,
    )
    tf = load_font(22, bold=True)
    tw, _ = text_size(draw, "SPLIT POT", tf)
    draw.text(((TILE_W - tw) // 2, 18), "SPLIT POT", font=tf, fill=(26, 16, 8, 255))


def draw_side_banner(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle(
        (24, 14, TILE_W - 24, 62),
        radius=8,
        fill=(224, 255, 252, 235),
        outline=(45, 212, 191, 255),
        width=2,
    )
    tf = load_font(22, bold=True)
    tw, _ = text_size(draw, "SIDE POT", tf)
    draw.text(((TILE_W - tw) // 2, 18), "SIDE POT", font=tf, fill=(8, 47, 73, 255))


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


def draw_pot_each_inline(
    draw: ImageDraw.ImageDraw,
    amount: str,
    y_pct: float = 0.40,
    *,
    pot_size: int = 54,
    each_size: int = 32,
    each_pill: bool = False,
) -> None:
    pot_font = load_font(pot_size, bold=True)
    each_font = load_font(each_size, bold=True)
    main, each = f"${amount}", "EACH"
    tw1, th = text_size(draw, main, pot_font)
    tw2, eh = text_size(draw, each, each_font)
    gap = 12 if each_pill else 8
    pill_pad = (10, 4) if each_pill else (0, 0)
    extra = (pill_pad[0] * 2) if each_pill else 0
    total = tw1 + gap + tw2 + extra
    x = (TILE_W - total) // 2
    y = int(TILE_H * y_pct) - th // 2
    draw.text((x, y), main, font=pot_font, fill=(226, 173, 26, 255), stroke_width=2, stroke_fill=(0, 0, 0))
    ex = x + tw1 + gap
    ey = y + (th - eh) // 2 + (2 if each_pill else 6)
    if each_pill:
        draw.rounded_rectangle(
            (ex - pill_pad[0], ey - pill_pad[1], ex + tw2 + pill_pad[0], ey + eh + pill_pad[1]),
            radius=10,
            fill=(255, 248, 225, 230),
            outline=(226, 173, 26, 255),
            width=2,
        )
    draw.text((ex, ey), each, font=each_font, fill=(107, 63, 0, 255) if each_pill else (255, 248, 220, 255))


def draw_compact_name_lines(
    draw: ImageDraw.ImageDraw,
    lines: tuple[str, ...],
    *,
    y_start_pct: float = 0.23,
    font_size: int = 26,
    line_gap: int = 4,
) -> None:
    nf = load_font(font_size, bold=True)
    y = int(TILE_H * y_start_pct)
    for line in lines:
        tw, th = text_size(draw, line, nf)
        draw.text(
            ((TILE_W - tw) // 2, y),
            line,
            font=nf,
            fill=(255, 255, 255, 255),
            stroke_width=1,
            stroke_fill=(0, 0, 0),
        )
        y += th + line_gap


def draw_cards(draw: ImageDraw.ImageDraw, digits: list[str], y_pct: float = 0.505) -> None:
    card_font = load_font(30, bold=True)
    gap = 52
    start_x = TILE_W // 2 - (len(digits) * gap) // 2
    cy = int(TILE_H * y_pct)
    for i, digit in enumerate(digits):
        cx = start_x + i * gap
        if digit == ".":
            draw.text(
                (cx + 6, cy + 38),
                digit,
                font=load_font(34, bold=True),
                fill=(226, 173, 26, 255),
                stroke_width=2,
                stroke_fill=(0, 0, 0),
            )
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


def draw_footer(draw: ImageDraw.ImageDraw, value: str = "-0.01") -> None:
    draw_centered(draw, value, 0.862, load_font(42, bold=True), (255, 246, 220, 255), stroke=1, stroke_fill=(0, 0, 0))


def save(img: Image.Image, name: str, concept: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / name
    labeled = img.copy()
    d = ImageDraw.Draw(labeled)
    d.rounded_rectangle((8, TILE_H - 36, TILE_W - 8, TILE_H - 8), radius=6, fill=(0, 0, 0, 190))
    cf = load_font(13, bold=True)
    d.text((18, TILE_H - 30), concept, font=cf, fill=(255, 255, 255, 255))
    labeled.convert("RGB").save(out, optimize=True)
    print(out)


# --- Split round 2 (from 4: inline EACH, 5: compact wrap) ---


def split_b2_01_wrap_then_each() -> None:
    """Compact 2-line names + inline $80 EACH below (4+5 hybrid)."""
    bg, draw = base_tile()
    draw_split_banner(draw)
    draw_compact_name_lines(draw, ("Alice C.  ·  Blake R.",))
    draw_pot_each_inline(draw, "80", y_pct=0.40)
    draw_cards(draw, ["3", "2", ".", "0", "3", "4"])
    draw_footer(draw)
    save(bg, "split-pot-b2-01-wrap-then-each.png", "Split B2-1: Compact names + inline $80 EACH")


def split_b2_02_each_pill() -> None:
    """Inline pot with EACH in gold pill badge (refined 4)."""
    bg, draw = base_tile()
    draw_split_banner(draw)
    draw_centered(draw, "Alice C. · Blake R.", 0.25, load_font(30, bold=True), (255, 255, 255, 255), stroke=2, stroke_fill=(0, 0, 0))
    draw_pot_each_inline(draw, "80", each_pill=True)
    draw_cards(draw, ["3", "2", ".", "0", "3", "4"])
    draw_footer(draw)
    save(bg, "split-pot-b2-02-each-pill.png", "Split B2-2: $80 + EACH gold pill on same line")


def split_b2_03_dot_separator() -> None:
    """$80 · EACH with middle dot; names on one line (4 variant)."""
    bg, draw = base_tile()
    draw_split_banner(draw)
    draw_centered(draw, "Alice C. · Blake R.", 0.25, load_font(28, bold=True), (255, 255, 255, 255), stroke=2, stroke_fill=(0, 0, 0))
    line = "$80  ·  EACH"
    draw_centered(draw, line, 0.40, load_font(46, bold=True), (226, 173, 26, 255), stroke=2, stroke_fill=(0, 0, 0))
    draw_cards(draw, ["3", "2", ".", "0", "3", "4"])
    draw_footer(draw)
    save(bg, "split-pot-b2-03-dot-separator.png", "Split B2-3: $80 · EACH single pot line")


def split_b2_04_stacked_each() -> None:
    """Large $80 with EACH subline; compact 2-line names above (5+4 stack)."""
    bg, draw = base_tile()
    draw_split_banner(draw)
    draw_compact_name_lines(draw, ("Alice C.  ·  Blake R.", "Chris T.  ·  Dana M."), y_start_pct=0.22, font_size=24)
    draw_centered(draw, "$80", 0.395, load_font(56, bold=True), (226, 173, 26, 255), stroke=2, stroke_fill=(0, 0, 0))
    draw_centered(draw, "EACH", 0.435, load_font(26, bold=True), (255, 248, 220, 255))
    draw_cards(draw, ["3", "2", ".", "0", "3", "4"], y_pct=0.52)
    draw_footer(draw)
    save(bg, "split-pot-b2-04-stacked-each.png", "Split B2-4: 2-line wrap names + stacked $80 / EACH")


def split_b2_05_fourway_inline() -> None:
    """4-way compact wrap + inline $80 EACH at full scale (5 at 4-way)."""
    bg, draw = base_tile()
    draw_split_banner(draw)
    draw_compact_name_lines(
        draw,
        ("Alice C.  ·  Blake R.", "Chris T.  ·  Dana M."),
        y_start_pct=0.22,
        font_size=23,
        line_gap=2,
    )
    draw_pot_each_inline(draw, "80", y_pct=0.42, pot_size=50, each_size=28)
    draw_cards(draw, ["3", "2", ".", "0", "3", "4"], y_pct=0.52)
    draw_footer(draw)
    save(bg, "split-pot-b2-05-fourway-inline.png", "Split B2-5: 4-way wrap + inline $80 EACH")


# --- Side round 2 (from 1: dual rows, 3: split columns) ---


def side_b2_01_panel_rows() -> None:
    """Dual gold rows inside dark panel (refined 1)."""
    bg, draw = base_tile()
    draw_side_banner(draw)
    draw_centered(draw, "Hugo F.", 0.24, load_font(34, bold=True), (255, 255, 255, 255), stroke=2, stroke_fill=(0, 0, 0))
    panel = (TILE_W // 2 - 210, int(TILE_H * 0.32), TILE_W // 2 + 210, int(TILE_H * 0.50))
    draw.rounded_rectangle(panel, radius=10, fill=(0, 0, 0, 175), outline=(226, 173, 26, 180), width=2)
    pf = load_font(42, bold=True)
    nf = load_font(20, bold=True)
    lf = load_font(15, bold=True)
    for i, (label, name, amt) in enumerate((("MAIN", "Elena G.", "227"), ("SIDE", "Hugo F.", "226"))):
        y = int(TILE_H * (0.355 + i * 0.075))
        color = (251, 191, 36, 255) if label == "MAIN" else (103, 232, 249, 255)
        draw.text((panel[0] + 16, y), label, font=lf, fill=color)
        draw.text((panel[0] + 72, y + 2), name, font=nf, fill=(255, 255, 255, 255))
        amt_txt = f"${amt}"
        tw, _ = text_size(draw, amt_txt, pf)
        draw.text((panel[2] - tw - 16, y - 6), amt_txt, font=pf, fill=(226, 173, 26, 255), stroke_width=1, stroke_fill=(0, 0, 0))
    draw_cards(draw, ["0", "1", "2", "3", ".", "7"])
    draw_footer(draw)
    save(bg, "side-pot-b2-01-panel-rows.png", "Side B2-1: Dual rows in bordered panel (refined 1)")


def side_b2_02_columns_tinted() -> None:
    """Split columns with gold/cyan half tints (refined 3)."""
    bg, draw = base_tile()
    draw_side_banner(draw)
    y0, y1 = int(TILE_H * 0.22), int(TILE_H * 0.52)
    draw.rectangle((0, y0, TILE_W // 2, y1), fill=(251, 191, 36, 28))
    draw.rectangle((TILE_W // 2, y0, TILE_W, y1), fill=(103, 232, 249, 28))
    draw.line((TILE_W // 2, y0, TILE_W // 2, y1), fill=(226, 173, 26, 160), width=3)
    lf = load_font(15, bold=True)
    pf = load_font(44, bold=True)
    nf = load_font(19, bold=True)
    for col, (label, name, amt, color) in enumerate(
        (
            ("MAIN", "Elena G.", "227", (251, 191, 36, 255)),
            ("SIDE", "Hugo F.", "226", (103, 232, 249, 255)),
        )
    ):
        cx = TILE_W // 4 if col == 0 else 3 * TILE_W // 4
        y = int(TILE_H * 0.30)
        tw, _ = text_size(draw, label, lf)
        draw.text((cx - tw // 2, y), label, font=lf, fill=color)
        tw, _ = text_size(draw, name, nf)
        draw.text((cx - tw // 2, y + 24), name, font=nf, fill=(255, 255, 255, 255), stroke_width=1, stroke_fill=(0, 0, 0))
        amt_txt = f"${amt}"
        tw, _ = text_size(draw, amt_txt, pf)
        draw.text((cx - tw // 2, y + 50), amt_txt, font=pf, fill=(226, 173, 26, 255))
    draw_cards(draw, ["0", "1", "2", "3", ".", "7"])
    draw_footer(draw)
    save(bg, "side-pot-b2-02-columns-tinted.png", "Side B2-2: Tinted columns + divider (refined 3)")


def side_b2_03_hybrid_stack() -> None:
    """Column labels/names top, dual gold amounts on one row below (1+3)."""
    bg, draw = base_tile()
    draw_side_banner(draw)
    lf = load_font(14, bold=True)
    nf = load_font(18, bold=True)
    for col, (label, name, color) in enumerate(
        (("MAIN", "Elena G.", (251, 191, 36, 255)), ("SIDE", "Hugo F.", (103, 232, 249, 255)))
    ):
        cx = TILE_W // 4 if col == 0 else 3 * TILE_W // 4
        y = int(TILE_H * 0.26)
        tw, _ = text_size(draw, label, lf)
        draw.text((cx - tw // 2, y), label, font=lf, fill=color)
        tw, _ = text_size(draw, name, nf)
        draw.text((cx - tw // 2, y + 20), name, font=nf, fill=(255, 255, 255, 255))
    pf = load_font(48, bold=True)
    for col, amt in enumerate(("227", "226")):
        cx = TILE_W // 4 if col == 0 else 3 * TILE_W // 4
        amt_txt = f"${amt}"
        tw, th = text_size(draw, amt_txt, pf)
        draw.text((cx - tw // 2, int(TILE_H * 0.38) - th // 2), amt_txt, font=pf, fill=(226, 173, 26, 255), stroke_width=2, stroke_fill=(0, 0, 0))
    draw.line((TILE_W // 2, int(TILE_H * 0.24), TILE_W // 2, int(TILE_H * 0.46)), fill=(226, 173, 26, 100), width=2)
    draw_cards(draw, ["0", "1", "2", "3", ".", "7"])
    draw_footer(draw)
    save(bg, "side-pot-b2-03-hybrid-stack.png", "Side B2-3: Column names + shared amount row (1+3)")


def side_b2_04_rows_larger() -> None:
    """Dual rows with bigger amounts, no crown name (refined 1)."""
    bg, draw = base_tile()
    draw_side_banner(draw)
    pf = load_font(46, bold=True)
    nf = load_font(22, bold=True)
    lf = load_font(17, bold=True)
    for i, (label, name, amt) in enumerate((("MAIN", "Elena G.", "227"), ("SIDE", "Hugo F.", "226"))):
        y = int(TILE_H * (0.30 + i * 0.10))
        color = (251, 191, 36, 255) if label == "MAIN" else (103, 232, 249, 255)
        draw.text((TILE_W // 2 - 200, y), label, font=lf, fill=color)
        draw.text((TILE_W // 2 - 110, y + 2), name, font=nf, fill=(255, 255, 255, 255))
        amt_txt = f"${amt}"
        tw, _ = text_size(draw, amt_txt, pf)
        draw.text((TILE_W // 2 + 50, y - 8), amt_txt, font=pf, fill=(226, 173, 26, 255), stroke_width=2, stroke_fill=(0, 0, 0))
    draw_cards(draw, ["0", "1", "2", "3", ".", "7"])
    draw_footer(draw)
    save(bg, "side-pot-b2-04-rows-larger.png", "Side B2-4: Larger dual rows, no crown hero (refined 1)")


def side_b2_05_columns_compact() -> None:
    """Narrow split columns, side winner under SIDE only (refined 3)."""
    bg, draw = base_tile()
    draw_side_banner(draw)
    mid = TILE_W // 2
    draw.line((mid, int(TILE_H * 0.24), mid, int(TILE_H * 0.48)), fill=(45, 212, 191, 180), width=2)
    lf = load_font(13, bold=True)
    pf = load_font(38, bold=True)
    nf = load_font(17, bold=True)
    for col, (label, name, amt, color) in enumerate(
        (
            ("MAIN", "Elena G.", "227", (251, 191, 36, 255)),
            ("SIDE", "Hugo F.", "226", (103, 232, 249, 255)),
        )
    ):
        cx = TILE_W // 4 if col == 0 else 3 * TILE_W // 4
        y = int(TILE_H * 0.28)
        tw, _ = text_size(draw, label, lf)
        draw.text((cx - tw // 2, y), label, font=lf, fill=color)
        tw, _ = text_size(draw, name, nf)
        draw.text((cx - tw // 2, y + 18), name, font=nf, fill=(255, 255, 255, 255))
        amt_txt = f"${amt}"
        tw, _ = text_size(draw, amt_txt, pf)
        draw.text((cx - tw // 2, y + 40), amt_txt, font=pf, fill=(226, 173, 26, 255))
    draw_centered(draw, "Side winner", 0.22, load_font(14, bold=True), (103, 232, 249, 200))
    draw_cards(draw, ["0", "1", "2", "3", ".", "7"])
    draw_footer(draw)
    save(bg, "side-pot-b2-05-columns-compact.png", "Side B2-5: Compact columns, tighter crown zone (refined 3)")


def main() -> None:
    split_b2_01_wrap_then_each()
    split_b2_02_each_pill()
    split_b2_03_dot_separator()
    split_b2_04_stacked_each()
    split_b2_05_fourway_inline()
    side_b2_01_panel_rows()
    side_b2_02_columns_tinted()
    side_b2_03_hybrid_stack()
    side_b2_04_rows_larger()
    side_b2_05_columns_compact()
    print(f"Wrote 10 round-2 mockups to {OUT_DIR}")


if __name__ == "__main__":
    main()
