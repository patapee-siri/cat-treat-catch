"""Builds die-cut "sticker" PNGs from transparent cat cut-outs.

Usage:  python tools/make_stickers.py <source_dir> <output_dir>

Expects <source_dir> to contain crookshanks_01.png, ginny_01.png, lumos_01.png
(transparent PNG face cut-outs). Requires Pillow.

Each output is a square PNG: the cut-out, a white sticker border, and a thin
dark contour outside the border. The silhouette is smoothed first so stray fur
wisps don't make the border ragged.
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

NAMES = {
    "crookshanks_01.png": "crookshanks",
    "ginny_01.png": "ginny",
    "lumos_01.png": "lumos",
}

CONTENT = 288      # px, longest side of the cut-out inside the sticker
WHITE_R = 8        # white border thickness
INK_R = 3          # dark contour thickness outside the white border
MARGIN = 6
INK = (74, 44, 58, 255)
WHITE = (255, 255, 255, 255)


def dilate(mask: Image.Image, radius: int) -> Image.Image:
    """Round (disc-shaped) dilation of an 'L' mask."""
    out = mask.copy()
    steps = max(24, radius * 6)
    for ring in range(1, radius + 1, max(1, radius // 4)):
        for i in range(steps):
            a = 2 * math.pi * i / steps
            dx, dy = round(math.cos(a) * ring), round(math.sin(a) * ring)
            out = ImageChops.lighter(out, ImageChops.offset(mask, dx, dy))
    return out


def smooth_silhouette(alpha: Image.Image) -> Image.Image:
    solid = alpha.point(lambda v: 255 if v > 70 else 0)
    blurred = solid.filter(ImageFilter.GaussianBlur(5))
    return blurred.point(lambda v: 255 if v > 110 else 0)


def build(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGBA")
    img = img.crop(img.getbbox())
    scale = CONTENT / max(img.size)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)

    pad = WHITE_R + INK_R + MARGIN
    size = max(img.size) + pad * 2
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox, oy = (size - img.width) // 2, (size - img.height) // 2

    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    layer.paste(img, (ox, oy))
    sil = smooth_silhouette(layer.getchannel("A"))

    ink_mask = dilate(sil, WHITE_R + INK_R).filter(ImageFilter.GaussianBlur(0.8))
    white_mask = dilate(sil, WHITE_R).filter(ImageFilter.GaussianBlur(0.8))

    canvas.paste(Image.new("RGBA", (size, size), INK), (0, 0), ink_mask)
    canvas.paste(Image.new("RGBA", (size, size), WHITE), (0, 0), white_mask)
    canvas.alpha_composite(layer)
    canvas.save(dst, optimize=True)
    print(dst.name, canvas.size, dst.stat().st_size, "bytes")


def main() -> None:
    src_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    for src_name, slug in NAMES.items():
        build(src_dir / src_name, out_dir / f"{slug}-sticker.png")


if __name__ == "__main__":
    main()
