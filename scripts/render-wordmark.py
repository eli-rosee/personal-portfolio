"""Render the name wordmark, the [ER] + rocket logo and the section headings in Mission Control DCU
to transparent PNGs.

The font's desktop license allows rasterized images for web use but not
embedding the font itself, so the site only ever ships these PNGs.

Usage (from the repo root, needs Pillow):
    python3 scripts/render-wordmark.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / "design/fonts/mission-control-dcu/Mission Control.otf"
SUPERSAMPLE = 4  # draw larger, then downscale for smooth edges

TEXT = (0xE6, 0xE1, 0xD6)  # --text
MUTED = (0x8A, 0x93, 0xA6)  # --muted
ACCENT = (0xF2, 0xA5, 0x41)  # --accent

font = ImageFont.truetype(str(FONT), 200 * SUPERSAMPLE)


def glyphs(text, color):
    """Text in the licensed font, cropped to its ink."""
    left, top, right, bottom = font.getbbox(text)
    mask = Image.new("L", (right - left, bottom - top), 0)
    ImageDraw.Draw(mask).text((-left, -top), text, font=font, fill=255)
    mask = mask.crop(mask.getbbox())
    out = Image.new("RGBA", mask.size, color + (0,))
    out.putalpha(mask)
    return out


def rocket(height, body=TEXT):
    """Upright rocket on a 100x160 grid (amber flame), tilted 45° to the upper right."""
    s = 8 * SUPERSAMPLE
    im = Image.new("RGBA", (100 * s, 160 * s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    pts = lambda *p: [(x * s, y * s) for x, y in p]
    draw.polygon(pts((50, 0), (72, 34), (72, 110), (28, 110), (28, 34)), fill=body)  # nose + body
    draw.polygon(pts((28, 78), (10, 112), (10, 124), (28, 110)), fill=body)  # left fin
    draw.polygon(pts((72, 78), (90, 112), (90, 124), (72, 110)), fill=body)  # right fin
    draw.ellipse([41 * s, 44 * s, 59 * s, 62 * s], fill=(0, 0, 0, 0))  # window
    draw.polygon(pts((36, 116), (64, 116), (50, 158)), fill=ACCENT)  # flame
    im = im.rotate(-45, resample=Image.BICUBIC, expand=True)
    im = im.crop(im.getbbox())
    return im.resize((round(im.width * height / im.height), height), Image.LANCZOS)


def row(parts, gaps):
    """Parts side by side, vertically centered, with the given gap before each part after the first."""
    width = sum(p.width for p in parts) + sum(gaps)
    height = max(p.height for p in parts)
    out = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    x = 0
    for i, part in enumerate(parts):
        x += gaps[i - 1] if i else 0
        out.alpha_composite(part, (x, (height - part.height) // 2))
        x += part.width
    return out


def save(image, path, width, color=None):
    """Downscale to the final pixel width (2x the display size) and save.
    Single-color art passes `color` so only its alpha is scaled, which keeps edges clean."""
    height = round(image.height * width / image.width)
    if color:
        alpha = image.getchannel("A").resize((width, height), Image.LANCZOS)
        image = Image.new("RGBA", alpha.size, color + (0,))
        image.putalpha(alpha)
    else:
        image = image.resize((width, height), Image.LANCZOS)
    dest = ROOT / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest, optimize=True)
    print(f"Wrote {path} ({image.width}x{image.height})")
    return image


# Wordmark: ~700px wide in the hero
save(glyphs("ELI ROSE", ACCENT), "src/assets/wordmark.png", 1400, ACCENT)

# Logo: muted brackets around the initials, then the rocket with a clear gap
er = glyphs("ER", TEXT)
bracket_gap = 28 * SUPERSAMPLE
logo = row(
    [glyphs("[", MUTED), er, glyphs("]", MUTED), rocket(round(er.height * 0.8))],
    [bracket_gap, bracket_gap, 70 * SUPERSAMPLE],
)
save(logo, "src/assets/logo.png", 250)  # nav: ~125px wide

# Section headings: off-white, 21px tall on the page (saved at 2x). One scale for all, so the
# letters match across headings whatever their ink.
heading_scale = 42 / glyphs("E", TEXT).height
for word in ["Projects", "About", "Telemetry"]:
    art = glyphs(word.upper(), TEXT)
    save(art, f"src/assets/headings/{word.lower()}.png", round(art.width * heading_scale), TEXT)

# Favicons, all the rocket alone.
# SVG (Chrome, Edge, Firefox): transparent, dark body on light tab bars and off-white on dark ones.
ROCKET = "M50 0 72 34V78L90 112V124L72 110H28L10 124V112L28 78V34Z"  # rocket()'s body + fins as one outline
WINDOW = "M41 53a9 9 0 1 0 18 0a9 9 0 1 0-18 0Z"
FLAME = "M36 116H64L50 158Z"
hexcolor = lambda c: "#%02x%02x%02x" % c
svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="-7 5 132 132">
	<style>
		.body {{ fill: #131824; }}
		@media (prefers-color-scheme: dark) {{ .body {{ fill: {hexcolor(TEXT)}; }} }}
	</style>
	<g transform="rotate(45 50 80) translate(0 -15)">
		<path class="body" fill-rule="evenodd" d="{ROCKET} {WINDOW}"/>
		<path fill="{hexcolor(ACCENT)}" d="{FLAME}"/>
	</g>
</svg>
"""
(ROOT / "public/favicon.svg").write_text(svg)
print("Wrote public/favicon.svg")


def icon(background, body):
    """The rocket centered on a square; background None = transparent."""
    size = 256
    out = Image.new("RGBA", (size, size), (background + (255,)) if background else (0, 0, 0, 0))
    ship = rocket(round(size * 0.86), body)
    out.alpha_composite(ship, ((size - ship.width) // 2, (size - ship.height) // 2))
    return out


# ICO fallback: transparent, with a gray body that shows on light and dark tab bars
icon(None, MUTED).save(ROOT / "public/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("Wrote public/favicon.ico")
# Apple touch icon: iOS fills transparency with black, so it keeps the page background
save(icon((0x0B, 0x0E, 0x14), TEXT), "public/favicon.png", 180)
