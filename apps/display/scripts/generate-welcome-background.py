"""Generate a true welcome-wall BACKGROUND PLATE — zero foreground UI.

Every panel, logo, and floor-reflection zone is fully replaced with felt/floor
texture from the mockup margins. Corner gold arcs are pasted from outer corners only.
Suit watermarks are recovered from side regions after scrubbing UI pixels.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
MOCKUP = ROOT / "public/mockups/welcome-wall-tv-mockup.png"
OUT = ROOT / "public/welcome"

W, H = 1536, 1024
PANEL_TOP = 265
FLOOR_TOP = 798

PANELS = (
    (46, PANEL_TOP, 492, FLOOR_TOP),
    (522, PANEL_TOP, 1014, FLOOR_TOP),
    (1044, PANEL_TOP, 1496, FLOOR_TOP),
)
LOGO_BOX = (360, 0, 1176, 255)


def _rgb(img: Image.Image) -> np.ndarray:
    return np.array(img.convert("RGB"), dtype=np.float32)


def _felt_column(src: np.ndarray, x: int, y0: int, y1: int) -> np.ndarray:
    return src[y0:y1, x : x + 1, :].mean(axis=1, keepdims=True)


def _fill_rect(out: np.ndarray, src: np.ndarray, rect: tuple[int, int, int, int], sample_x: int) -> None:
    x0, y0, x1, y1 = rect
    w, h = x1 - x0, y1 - y0
    col = _felt_column(src, sample_x, y0, y1)
    out[y0:y1, x0:x1, :] = np.repeat(col, w, axis=1)


def _scrub_ui_pixels(patch: np.ndarray) -> np.ndarray:
    """Remove gold borders, QR white, dark glass, bright text from a patch."""
    out = patch.copy()
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    ui = (
        ((r > 130) & (g > 95) & (b < 125) & (chroma > 25))  # gold
        | (lum > 168)  # white / bright text
        | ((lum < 55) & (chroma < 45))  # dark glass
    )
    if not ui.any():
        return out
    # Fill UI pixels with local median of non-UI neighbors (simple: column mean of non-ui).
    for x in range(out.shape[1]):
        col = out[:, x, :]
        good = col[~ui[:, x]]
        if len(good):
            out[ui[:, x], x, :] = good.mean(axis=0)
    return out


def build_background(mockup: Image.Image) -> Image.Image:
    src = _rgb(mockup)
    out = np.zeros_like(src)

    # 1. Continuous purple left / teal right (no panel-shaped blocks).
    _fill_rect(out, src, (0, 0, W // 2, FLOOR_TOP), 8)
    _fill_rect(out, src, (W // 2, 0, W, FLOOR_TOP), W - 9)

    # 2. Corner gold arcs only (outer 280px — not the logo center).
    base = Image.fromarray(out.astype(np.uint8))
    arc_l = mockup.crop((0, 0, 280, PANEL_TOP)).resize((440, PANEL_TOP), Image.Resampling.LANCZOS)
    arc_r = mockup.crop((W - 280, 0, W, PANEL_TOP)).resize((440, PANEL_TOP), Image.Resampling.LANCZOS)
    base.paste(arc_l, (0, 0))
    base.paste(arc_r, (W - 440, 0))
    out = _rgb(base)

    # 3. Suit watermarks — scrub UI from side crops, blend onto each half.
    club_src = _scrub_ui_pixels(src[320:820, 0:500, :])
    club = Image.fromarray(club_src.astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=1.2))
    diamond_src = _scrub_ui_pixels(src[320:820, 1036:1536, :])
    diamond = Image.fromarray(diamond_src.astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=1.2))

    base = Image.fromarray(out.astype(np.uint8))
    for overlay, x in ((club, 0), (diamond, 1036)):
        gray = overlay.convert("L")
        detail = gray.point(lambda p: max(0, min(255, int((p - 85) * 1.5))))
        base.paste(overlay, (x, 320), detail.point(lambda p: int(p * 0.38)))
    out = _rgb(base)

    # 4. Floor — continuous dark felt from margins (no panel reflections).
    _fill_rect(out, src, (0, FLOOR_TOP, W // 2, H), 8)
    _fill_rect(out, src, (W // 2, FLOOR_TOP, W, H), W - 9)

    # 5. Soften the center vertical seam between purple and teal halves.
    blend_w = 80
    cx = W // 2
    for i in range(blend_w):
        t = i / blend_w
        x = cx - blend_w // 2 + i
        if 0 <= x < W:
            out[:, x, :] = out[:, x, :] * (1 - t) + out[:, min(W - 1, x + 1), :] * t

    bg = Image.fromarray(out.astype(np.uint8))
    floor = bg.crop((0, FLOOR_TOP, W, H))
    floor = ImageEnhance.Brightness(floor).enhance(0.68)
    draw = ImageDraw.Draw(floor)
    for y in range(4):
        a = 1 - y / 4
        draw.line([(0, y), (W, y)], fill=(int(220 * a), int(165 * a), int(38 * a)), width=1)
    bg.paste(floor, (0, FLOOR_TOP))

    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(vig).ellipse((-W * 0.1, -H * 0.06, W * 1.1, H * 1.04), fill=(0, 0, 0, 60))
    bg = Image.alpha_composite(bg.convert("RGBA"), vig).convert("RGB")
    return bg.filter(ImageFilter.GaussianBlur(radius=0.25))


def build_comparison(mockup: Image.Image, generated: Image.Image) -> Image.Image:
    m = mockup.convert("RGB")
    g = generated.convert("RGB")
    pad = 8
    comp = Image.new("RGB", (W * 2 + pad * 3, H + pad * 2 + 36), (24, 24, 28))
    comp.paste(m, (pad, pad + 36))
    comp.paste(g, (W + pad * 2, pad + 36))
    draw = ImageDraw.Draw(comp)
    draw.text((pad, 8), "Mockup composite (has foreground UI)", fill=(220, 220, 220))
    draw.text((W + pad * 2, 8), "Background plate (foreground removed)", fill=(220, 220, 220))
    return comp


def main() -> None:
    if not MOCKUP.exists():
        raise FileNotFoundError(MOCKUP)

    OUT.mkdir(parents=True, exist_ok=True)
    mockup = Image.open(MOCKUP)
    assert mockup.size == (W, H), mockup.size

    bg = build_background(mockup)
    comparison = build_comparison(mockup, bg)

    bg.save(OUT / "welcome-background.jpg", quality=94, optimize=True)
    comparison.save(OUT / "welcome-background-comparison.png", optimize=True)

    print(f"Background plate -> {OUT / 'welcome-background.jpg'}")
    print(f"Comparison       -> {OUT / 'welcome-background-comparison.png'}")


if __name__ == "__main__":
    main()
