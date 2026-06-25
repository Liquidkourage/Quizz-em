"""Extract welcome-wall art layers from the TV mockup PNG (1536×1024)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
MOCKUP = ROOT / "public/mockups/welcome-wall-tv-mockup.png"
OUT = ROOT / "public/welcome"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1536, 1024


def main() -> None:
    src = Image.open(MOCKUP).convert("RGB")
    assert src.size == (W, H), src.size

    # Felt background: side strips + upper band (no logo, no panels) stitched & blurred.
    left = src.crop((0, 320, 140, 900))
    right = src.crop((W - 140, 320, W, 900))
    upper = src.crop((0, 280, W, 340))

    bg = Image.new("RGB", (W, H), (8, 24, 20))
    bg.paste(left.resize((W // 2, H - 200), Image.Resampling.LANCZOS), (0, 160))
    bg.paste(right.resize((W // 2, H - 200), Image.Resampling.LANCZOS), (W // 2, 160))
    bg.paste(upper.resize((W, 180), Image.Resampling.LANCZOS), (0, 0))
    bg = bg.filter(ImageFilter.GaussianBlur(radius=2))
    bg.save(OUT / "felt-bg-from-mockup.jpg", quality=92, optimize=True)

    # Floor + reflection: bottom band from mockup (includes wood + gold bounce).
    floor = src.crop((0, int(H * 0.78), W, H))
    floor.save(OUT / "floor-reflection-from-mockup.png")

    # Ornate bracket: top-left corner of left panel (mockup art).
    bracket = src.crop((52, 268, 248, 464))
    bracket.save(OUT / "bracket-corner-from-mockup.png")

    # Full mockup background reference (logo + panels masked via center darken optional).
    src.save(OUT / "mockup-reference-full.png")

    print(f"Wrote assets to {OUT}")


if __name__ == "__main__":
    main()
