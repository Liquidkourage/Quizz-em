"""Build canonical welcome-wall art in public/welcome/.

Sources:
- felt-bg.jpg — generated felt plate (matches mockup purple/emerald + suits)
- floor-reflection-mockup.jpg — bottom strip cropped from welcome-wall-tv-mockup.png
- bracket-corner.png — generated ornate bracket (checkerboard keyed to alpha)

Run from repo root:
  python apps/display/scripts/prepare-welcome-assets.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WELCOME = ROOT / "public/welcome"
MOCKUP = ROOT / "public/mockups/welcome-wall-tv-mockup.png"
GENERATED = ROOT.parent.parent / ".cursor/projects/c-Users-liqui-quizzing-hold-em/assets"
# Fallback when assets live in Cursor project storage
CURSOR_ASSETS = Path.home() / ".cursor/projects/c-Users-liqui-quizzing-hold-em/assets"


def _assets_dir() -> Path:
    for candidate in (
        GENERATED,
        CURSOR_ASSETS,
        ROOT / "public/mockups",
    ):
        if (candidate / "welcome-felt-bg.png").exists() or (candidate / "welcome-bracket-corner-tl.png").exists():
            return candidate
    return CURSOR_ASSETS


def key_checkerboard_to_alpha(src: Path, dest: Path, threshold: int = 195) -> None:
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                px[x, y] = (r, g, b, 0)
            elif abs(r - g) < 18 and abs(g - b) < 18 and r > 110 and r < threshold:
                px[x, y] = (r, g, b, 0)
    im.thumbnail((420, 420), Image.Resampling.LANCZOS)
    im.save(dest, optimize=True)


def main() -> None:
    WELCOME.mkdir(parents=True, exist_ok=True)
    assets = _assets_dir()

    felt_src = assets / "welcome-felt-bg.png"
    if felt_src.exists():
        Image.open(felt_src).convert("RGB").save(WELCOME / "felt-bg.jpg", quality=90, optimize=True)

    bracket_src = assets / "welcome-bracket-corner-tl.png"
    if not bracket_src.exists():
        bracket_src = WELCOME / "bracket-corner-generated.png"
    if bracket_src.exists():
        key_checkerboard_to_alpha(bracket_src, WELCOME / "bracket-corner.png")

    src = Image.open(MOCKUP).convert("RGB")
    w, h = src.size
    floor = src.crop((0, int(h * 0.78), w, h))
    floor.save(WELCOME / "floor-reflection-mockup.jpg", quality=90, optimize=True)

    print(f"Canonical welcome art → {WELCOME}")


if __name__ == "__main__":
    main()
