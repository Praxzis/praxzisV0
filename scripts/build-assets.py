"""Builds the brand + material assets used by the notebook UI.

  python3 scripts/build-assets.py <path-to-supplied-logo.png>

Outputs (assets/brand, assets/paper):
  logo-ink.png      navy strokes of the supplied logo, paper removed (tintable)
  logo-accent.png   turquoise strokes of the supplied logo (star, flourishes)
  grain.png         seamless paper grain + fibre overlay, neutral, alpha only
"""

import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "assets" / "brand"
PAPER = ROOT / "assets" / "paper"


def build_logo(src: Path) -> None:
    im = Image.open(src).convert("RGBA")
    rgba = np.asarray(im).astype(np.float32) / 255.0
    rgb, a0 = rgba[..., :3], rgba[..., 3]

    # The paper the logo was drawn on: median of opaque, light pixels.
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    paper_mask = (a0 > 0.98) & (lum > 0.8)
    paper = np.median(rgb[paper_mask], axis=0)
    paper_l = float(paper @ np.array([0.299, 0.587, 0.114]))

    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # Navy and turquoise differ mostly in how far green rises above red.
    teal_score = np.clip(((g - r) - 0.06) / 0.07, 0, 1)

    darkness = np.clip((paper_l - lum) / (paper_l - 0.16), 0, 1)
    # The source paper is mottled; anything this faint is paper, not ink.
    ramp = np.clip((darkness - 0.26) / 0.5, 0, 1)
    ramp = ramp * ramp * (3 - 2 * ramp)
    ink_alpha = np.clip(ramp * (1 - teal_score) * 1.05, 0, 1)
    accent_alpha = np.clip(teal_score * np.clip(darkness * 2.2 + 0.25, 0, 1), 0, 1)

    # Only keep ink inside the opaque part of the source, and drop paper speckle.
    keep = (a0 > 0.98).astype(np.float32)
    ink_alpha = np.where(ink_alpha < 0.06, 0, ink_alpha) * keep
    accent_alpha = np.where(accent_alpha < 0.08, 0, accent_alpha) * keep

    ys, xs = np.where((ink_alpha + accent_alpha) > 0.1)
    pad = 8
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, im.height)
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, im.width)

    BRAND.mkdir(parents=True, exist_ok=True)

    def save(alpha: np.ndarray, color: tuple[int, int, int], name: str) -> None:
        out = np.zeros((*alpha.shape, 4), dtype=np.uint8)
        out[..., 0], out[..., 1], out[..., 2] = color
        out[..., 3] = (alpha * 255).astype(np.uint8)
        Image.fromarray(out[y0:y1, x0:x1], "RGBA").save(BRAND / name, optimize=True)

    # White so the app can tint it per theme; accent keeps its own hue.
    save(ink_alpha, (255, 255, 255), "logo-ink.png")
    save(accent_alpha, (255, 255, 255), "logo-accent.png")

    # Splash mark: the logo in day inks on a transparent ground.
    splash = np.zeros((*ink_alpha.shape, 4), dtype=np.float32)
    navy, teal = np.array([30, 43, 80]) / 255, np.array([42, 138, 138]) / 255
    a = np.clip(ink_alpha + accent_alpha, 0, 1)
    mix = np.where(a[..., None] > 0, (ink_alpha[..., None] * navy + accent_alpha[..., None] * teal) / np.maximum(a, 1e-6)[..., None], 0)
    splash[..., :3], splash[..., 3] = mix, a
    Image.fromarray((splash[y0:y1, x0:x1] * 255).astype(np.uint8), "RGBA").save(BRAND / "splash.png", optimize=True)
    print("logo", x1 - x0, "x", y1 - y0, "paper", (paper * 255).astype(int))


def tileable_noise(size: int, cells: int, rng: np.random.Generator) -> np.ndarray:
    """Smooth value noise that wraps at the edges."""
    grid = rng.random((cells, cells)).astype(np.float32)
    t = np.linspace(0, cells, size, endpoint=False)
    i0 = np.floor(t).astype(int)
    f = t - i0
    f = f * f * (3 - 2 * f)
    i1 = (i0 + 1) % cells
    i0 %= cells
    a = grid[np.ix_(i0, i0)]
    b = grid[np.ix_(i0, i1)]
    c = grid[np.ix_(i1, i0)]
    d = grid[np.ix_(i1, i1)]
    fx, fy = f[None, :], f[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def build_grain(size: int = 640, seed: int = 11) -> None:
    rng = np.random.default_rng(seed)
    pyr = random.Random(seed)

    # Signed field: <0 darkens, >0 lightens. Several octaves so it never reads as a tile.
    # Mostly fine tooth; tonal drift across a page is drawn per sheet instead.
    field = (rng.random((size, size)).astype(np.float32) - 0.5) * 0.5
    for cells, weight in ((220, 0.3), (110, 0.22), (40, 0.1)):
        field += (tileable_noise(size, cells, rng) - 0.5) * weight

    # Fibres: short, slightly curved strands, drawn with wrap-around.
    fib = Image.new("F", (size, size), 0.0)
    fp = fib.load()
    for _ in range(900):
        x, y = pyr.random() * size, pyr.random() * size
        ang = pyr.random() * math.pi
        length = pyr.uniform(6, 34)
        bend = pyr.uniform(-0.05, 0.05)
        tone = pyr.choice((-1.0, -1.0, 0.7))
        strength = pyr.uniform(0.25, 0.8) * tone
        for s in range(int(length)):
            ang += bend
            x += math.cos(ang)
            y += math.sin(ang)
            fp[int(x) % size, int(y) % size] += strength
    raw = np.asarray(fib, dtype=np.float32)
    fibres = raw * 0.4
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        fibres += np.roll(raw, (dy, dx), axis=(0, 1)) * 0.15
    field += fibres * 0.5

    # Rare specks (inclusions in the pulp).
    for _ in range(90):
        x, y = rng.integers(0, size, 2)
        field[y, x] -= rng.uniform(0.6, 1.4)

    field = np.clip(field, -1.2, 1.2)
    dark = np.clip(-field, 0, 1)
    light = np.clip(field, 0, 1)

    out = np.zeros((size, size, 4), dtype=np.uint8)
    # Neutral warm darkening and warm lightening in one overlay.
    shade = np.where(dark >= light, 0, 255).astype(np.uint8)
    out[..., 0] = np.where(shade == 0, 70, 255)
    out[..., 1] = np.where(shade == 0, 52, 252)
    out[..., 2] = np.where(shade == 0, 30, 240)
    alpha = np.maximum(dark, light * 0.8)
    # Quantise a little so the PNG stays small.
    out[..., 3] = (np.round(alpha * 40) / 40 * 255).astype(np.uint8)

    PAPER.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, "RGBA").save(PAPER / "grain.png", optimize=True)
    print("grain", size)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        build_logo(Path(sys.argv[1]))
    build_grain()
