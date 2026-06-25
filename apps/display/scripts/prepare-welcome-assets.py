"""Build canonical welcome-wall art in public/welcome/."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
WELCOME = ROOT / "public/welcome"
MOCKUP = ROOT / "public/mockups/welcome-wall-tv-mockup.png"
CURSOR_ASSETS = Path.home() / ".cursor/projects/c-Users-liqui-quizzing-hold-em/assets"


def _bracket_source() -> Path | None:
    for name in (
        "welcome-bracket-corner-v2.png",
        "welcome-bracket-corner-tl.png",
        "bracket-corner-generated.png",
    ):
        for base in (CURSOR_ASSETS, WELCOME, ROOT / "public/mockups"):
            candidate = base / name
            if candidate.exists():
                return candidate
    return None


def key_bracket_to_alpha(src: Path, dest: Path) -> None:
    """Remove checkerboard + black matte; keep gold filigree only."""
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _a = px[x, y]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            max_c = max(r, g, b)
            min_c = min(r, g, b)
            chroma = max_c - min_c

            if lum >= 198 and chroma < 36:
                a = 0
            elif abs(r - g) < 20 and abs(g - b) < 20 and 105 < lum < 198:
                a = 0
            elif lum < 36:
                a = 0
            elif lum < 78 and chroma < 32:
                a = 0
            elif max_c < 58:
                a = 0
            elif lum < 95 and r < 110 and g < 95:
                a = max(0, min(255, int((lum - 32) * 4.2)))
            else:
                a = 255

            px[x, y] = (r, g, b, a)

    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    im = ImageOps.expand(im, border=6, fill=(0, 0, 0, 0))
    im.thumbnail((360, 360), Image.Resampling.LANCZOS)
    im.save(dest, optimize=True)


def main() -> None:
    WELCOME.mkdir(parents=True, exist_ok=True)
    assets = CURSOR_ASSETS

    felt_src = assets / "welcome-felt-bg.png"
    if felt_src.exists():
        Image.open(felt_src).convert("RGB").save(WELCOME / "felt-bg.jpg", quality=90, optimize=True)

    bracket_src = _bracket_source()
    if bracket_src:
        key_bracket_to_alpha(bracket_src, WELCOME / "bracket-corner.png")

    src = Image.open(MOCKUP).convert("RGB")
    w, h = src.size
    # Wood + reflection only — below panel bottoms.
    floor = src.crop((0, int(h * 0.84), w, h))
    floor.save(WELCOME / "floor-reflection-mockup.jpg", quality=90, optimize=True)

    print(f"Canonical welcome art -> {WELCOME}")


if __name__ == "__main__":
    main()
