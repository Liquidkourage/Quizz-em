"""Build canonical welcome-wall art in public/welcome/ from the TV mockup."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
WELCOME = ROOT / "public/welcome"
MOCKUP = ROOT / "public/mockups/welcome-wall-tv-mockup.png"

W, H = 1536, 1024


def key_bracket_to_alpha(im: Image.Image) -> Image.Image:
    """Remove dark panel matte from a mockup bracket crop."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _a = px[x, y]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            chroma = max(r, g, b) - min(r, g, b)
            # Panel fill / felt bleed
            if lum < 42:
                a = 0
            elif lum < 95 and chroma < 38:
                a = 0
            elif b > r + 8 and b > g + 4 and lum < 120:
                a = 0
            elif g > r + 6 and lum < 110 and chroma < 55:
                a = 0
            else:
                a = 255
            px[x, y] = (r, g, b, a)
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    im = ImageOps.expand(im, border=2, fill=(0, 0, 0, 0))
    im.thumbnail((300, 300), Image.Resampling.LANCZOS)
    return im


def save_felt_from_mockup(dest: Path, src: Image.Image) -> None:
    """Purple/emerald felt with embossed suits — stitched from mockup side bands."""
    left = src.crop((0, 320, 140, 900))
    right = src.crop((W - 140, 320, W, 900))
    upper = src.crop((0, 0, W, 300))

    bg = Image.new("RGB", (W, H), (8, 24, 20))
    bg.paste(left.resize((W // 2, H - 180), Image.Resampling.LANCZOS), (0, 140))
    bg.paste(right.resize((W // 2, H - 180), Image.Resampling.LANCZOS), (W // 2, 140))
    bg.paste(upper.resize((W, 200), Image.Resampling.LANCZOS), (0, 0))
    bg.filter(ImageFilter.GaussianBlur(radius=1.2)).save(dest, quality=92, optimize=True)


def save_floor_from_mockup(dest: Path, src: Image.Image) -> None:
    """Polished floor + panel reflections — bottom band from mockup."""
    floor = src.crop((0, int(H * 0.78), W, H))
    floor.save(dest, optimize=True)


def save_bracket_from_mockup(dest: Path, src: Image.Image) -> None:
    """Mockup L-bracket with marquee bulbs."""
    bracket = src.crop((52, 268, 248, 464))
    key_bracket_to_alpha(bracket).save(dest, optimize=True)


def main() -> None:
    if not MOCKUP.exists():
        raise FileNotFoundError(f"Missing mockup: {MOCKUP}")

    WELCOME.mkdir(parents=True, exist_ok=True)
    mockup = Image.open(MOCKUP).convert("RGB")
    assert mockup.size == (W, H), mockup.size

    save_felt_from_mockup(WELCOME / "felt-bg.jpg", mockup)
    save_floor_from_mockup(WELCOME / "floor-reflection.png", mockup)
    save_bracket_from_mockup(WELCOME / "bracket-corner.png", mockup)

    print(f"Mockup-derived welcome art -> {WELCOME}")


if __name__ == "__main__":
    main()
