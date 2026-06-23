"""Strip white matte from showdown stage PNGs and trim transparent padding."""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
# Near-white matte from ChatGPT exports; gold laurel/crown pixels stay opaque.
MATTE_THRESHOLD = 238


def is_matte_pixel(rgb: np.ndarray) -> np.ndarray:
    return np.all(rgb >= MATTE_THRESHOLD, axis=-1)


def flood_matte_mask(matte: np.ndarray) -> np.ndarray:
    height, width = matte.shape
    visited = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        for y in (0, height - 1):
            if matte[y, x]:
                visited[y, x] = True
                queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if matte[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height and not visited[ny, nx] and matte[ny, nx]:
                visited[ny, nx] = True
                queue.append((nx, ny))

    return visited


def soften_white_fringe(arr: np.ndarray) -> None:
    """Reduce semi-white halos on anti-aliased edges."""
    rgb = arr[:, :, :3].astype(np.float32)
    alpha = arr[:, :, 3].astype(np.float32)
    opaque = alpha > 0
    if not opaque.any():
        return

    min_channel = rgb[:, :, 0].copy()
    min_channel = np.minimum(min_channel, rgb[:, :, 1])
    min_channel = np.minimum(min_channel, rgb[:, :, 2])
    max_channel = rgb[:, :, 0].copy()
    max_channel = np.maximum(max_channel, rgb[:, :, 1])
    max_channel = np.maximum(max_channel, rgb[:, :, 2])
    spread = max_channel - min_channel

    fringe = opaque & (min_channel >= 200) & (spread <= 36)
    if not fringe.any():
        return

    fade = np.clip((235 - min_channel) / 35.0, 0.0, 1.0)
    arr[fringe, 3] = (alpha[fringe] * fade[fringe]).astype(np.uint8)


def process_image(path: Path) -> None:
    rgba = np.array(Image.open(path).convert("RGBA"))
    matte = is_matte_pixel(rgba[:, :, :3])
    flooded = flood_matte_mask(matte)
    rgba[flooded, 3] = 0
    soften_white_fringe(rgba)

    image = Image.fromarray(rgba)
    bbox = image.getbbox()
    if bbox is not None:
        image = image.crop(bbox)

    image.save(path, optimize=True)
    transparent_pct = float((np.array(image)[:, :, 3] == 0).mean())
    print(f"{path.name}: {image.size[0]}x{image.size[1]} transparent={transparent_pct:.1%}")


def main() -> None:
    src_dir = ROOT / "src" / "assets" / "showdown"
    public_dir = ROOT / "public" / "showdown"
    public_dir.mkdir(parents=True, exist_ok=True)

    for path in sorted(src_dir.glob("*.png")):
        process_image(path)
        Image.open(path).save(public_dir / path.name, optimize=True)


if __name__ == "__main__":
    main()
