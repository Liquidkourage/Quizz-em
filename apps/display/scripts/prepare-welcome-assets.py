"""Build canonical welcome-wall art in public/welcome/."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
WELCOME = ROOT / "public/welcome"
MOCKUP = ROOT / "public/mockups/welcome-wall-tv-mockup.png"
CURSOR_ASSETS = Path.home() / ".cursor/projects/c-Users-liqui-quizzing-hold-em/assets"


def key_bracket_to_alpha(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _a = px[x, y]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            chroma = max(r, g, b) - min(r, g, b)
            if lum >= 198 and chroma < 36:
                a = 0
            elif abs(r - g) < 20 and abs(g - b) < 20 and 105 < lum < 198:
                a = 0
            elif lum < 40:
                a = 0
            elif lum < 80 and chroma < 30:
                a = 0
            elif max(r, g, b) < 55:
                a = 0
            else:
                a = 255
            px[x, y] = (r, g, b, a)
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    im = ImageOps.expand(im, border=4, fill=(0, 0, 0, 0))
    im.thumbnail((280, 280), Image.Resampling.LANCZOS)
    im.save(dest, optimize=True)


def save_felt(dest: Path) -> None:
    felt_src = CURSOR_ASSETS / "welcome-felt-bg.png"
    if felt_src.exists():
        Image.open(felt_src).convert("RGB").save(dest, quality=90, optimize=True)


def save_floor(dest: Path) -> None:
    """Wood + gold horizon + soft column bloom — no mockup UI."""
    w, h = 1920, 200
    im = Image.new("RGB", (w, h), (6, 4, 2))
    px = im.load()
    for y in range(h):
        for x in range(w):
            t = y / h
            wood = int(8 + 26 * t)
            px[x, y] = (wood + 3, max(1, wood - 1), max(2, wood - 3))
    # Gold horizon line + bloom (top ~18%)
    for y in range(22):
        a = 1 - y / 22
        for x in range(w):
            r, g, b = px[x, y]
            px[x, y] = (
                min(255, r + int(235 * a)),
                min(255, g + int(175 * a)),
                min(255, b + int(42 * a)),
            )
    # Three column reflection blooms (approx panel positions)
    col_centers = (w * 0.17, w * 0.5, w * 0.83)
    col_half = int(w * 0.14)
    for y in range(22, h):
        falloff = max(0, 1 - (y - 22) / (h * 0.62))
        if falloff <= 0:
            continue
        for x in range(w):
            col_boost = 0.0
            for cx in col_centers:
                d = abs(x - cx) / col_half
                if d < 1:
                    col_boost = max(col_boost, (1 - d) ** 1.6)
            if col_boost <= 0:
                continue
            r, g, b = px[x, y]
            boost = col_boost * falloff
            px[x, y] = (
                min(255, r + int(38 * boost)),
                min(255, g + int(26 * boost)),
                min(255, b + int(4 * boost)),
            )
    im.filter(ImageFilter.GaussianBlur(radius=0.8)).save(dest, quality=90, optimize=True)


def save_bracket(dest: Path) -> None:
    for name in ("welcome-bracket-mockup-style.png", "welcome-bracket-corner-tl.png"):
        src = CURSOR_ASSETS / name
        if src.exists():
            key_bracket_to_alpha(src, dest)
            return
    raise FileNotFoundError("No bracket source PNG in Cursor assets")


def main() -> None:
    WELCOME.mkdir(parents=True, exist_ok=True)
    save_felt(WELCOME / "felt-bg.jpg")
    save_floor(WELCOME / "floor-reflection.jpg")
    save_bracket(WELCOME / "bracket-corner.png")
    print(f"Canonical welcome art -> {WELCOME}")


if __name__ == "__main__":
    main()
