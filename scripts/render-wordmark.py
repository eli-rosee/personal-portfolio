"""Render the name wordmark in Mission Control DCU to a transparent PNG.

The font's desktop license allows rasterized images for web use but not
embedding the font itself, so the site only ever ships this PNG.

Usage (from the repo root, needs Pillow):
    python3 scripts/render-wordmark.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / "design/fonts/mission-control-dcu/Mission Control.otf"
OUT = ROOT / "src/assets/wordmark.png"

TEXT = "ELI ROSE"
COLOR = (0xF2, 0xA5, 0x41)  # --accent
WIDTH = 1400  # final pixel width: 2x the ~700px display width
SUPERSAMPLE = 4  # draw larger, then downscale for smooth edges

font = ImageFont.truetype(str(FONT), 200 * SUPERSAMPLE)
left, top, right, bottom = font.getbbox(TEXT)
mask = Image.new("L", (right - left, bottom - top), 0)
ImageDraw.Draw(mask).text((-left, -top), TEXT, font=font, fill=255)
mask = mask.crop(mask.getbbox())

height = round(mask.height * WIDTH / mask.width)
mask = mask.resize((WIDTH, height), Image.LANCZOS)

out = Image.new("RGBA", mask.size, COLOR + (0,))
out.putalpha(mask)
OUT.parent.mkdir(parents=True, exist_ok=True)
out.save(OUT, optimize=True)
print(f"Wrote {OUT.relative_to(ROOT)} ({out.width}x{out.height})")
