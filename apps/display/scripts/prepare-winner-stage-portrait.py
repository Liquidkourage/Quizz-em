"""
Build a portrait winner-stage master from the landscape card art.

This is an interim reframe for tall mosaic tiles (5×2, etc.). For production,
replace apps/display/src/assets/winner-stage-card-portrait.png with custom art:
  - Canvas: 1200 × 1680 px (5:7)
  - Keep crown + wreaths within ~78% of width (not edge-to-edge)
  - Same slot anchors as winner-stage-preview.html (name 25%, pot 40%, cards 50.5%, diff 86.2%)
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "assets" / "winner-stage-card.png"
OUT = ROOT / "src" / "assets" / "winner-stage-card-portrait.png"

OUT_W, OUT_H = 1200, 1680
# Center crop — keep middle 58% of landscape width (crown + wreaths) before vertical fit.
CROP_WIDTH_RATIO = 0.58


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    sw, sh = im.size
    crop_w = int(sw * CROP_WIDTH_RATIO)
    left = (sw - crop_w) // 2
    cropped = im.crop((left, 0, left + crop_w, sh))

    scale = OUT_W / crop_w
    resized_h = round(sh * scale)
    art = cropped.resize((OUT_W, resized_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (OUT_W, OUT_H), (0, 0, 0, 255))
    top = max(0, (OUT_H - resized_h) // 2)
    canvas.paste(art, (0, top), art)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUT, optimize=True)
    print(f"Wrote {OUT} ({OUT_W}x{OUT_H}) from center {CROP_WIDTH_RATIO:.0%} crop of {SRC.name}")


if __name__ == "__main__":
    main()
