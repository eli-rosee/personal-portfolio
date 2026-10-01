"""Render the site's brand art: the name wordmark, the [ER] + rocket logo, the section headings,
the favicons, the link-preview image, and the rocket's outline for the About card.

The lettering is in Mission Control DCU, whose desktop license allows rasterized images for web
use but not embedding the font, so the site only ships these PNGs. The font lives in
design/fonts/ (gitignored); without it the script can't run.

Usage (from the repo root, needs Pillow and fontTools, and npm install for the web fonts):
    python3 scripts/render-art.py

Outputs:
    src/assets/brand/wordmark.png      hero name
    src/assets/brand/logo.png          nav logo
    src/assets/brand/headings/*.png    section headings (SectionHeading.astro)
    src/assets/brand/rocket.json       rocket outline as SVG paths (ClipCard.astro)
    public/favicon.ico                 tab icon fallback (stays at the root, where browsers look for it)
    public/assets/favicon.svg          tab icon
    public/assets/apple-touch-icon.png home-screen icon on iPhones and iPads
    public/preview-image.png           link-preview image (tagline from src/content/site.ts)
"""

import json
import random
import re
from io import BytesIO
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / "design/fonts/mission-control-dcu/Mission Control.otf"
SUPERSAMPLE = 4  # draw larger, then downscale for smooth edges

# Palette, matching the tokens in src/styles/global.css
BG = (0x0B, 0x0E, 0x14)  # --bg
SURFACE = (0x13, 0x18, 0x24)  # --surface
TEXT = (0xE6, 0xE1, 0xD6)  # --text
MUTED = (0x8A, 0x93, 0xA6)  # --muted
ACCENT = (0xF2, 0xA5, 0x41)  # --accent

# The rocket, nose up on a 100x160 grid: one outline for the body and fins, a round window,
# and the flame. Every rocket on the site is drawn from these.
HULL = [(50, 0), (72, 34), (72, 78), (90, 112), (90, 124), (72, 110), (28, 110), (10, 124), (10, 112), (28, 78), (28, 34)]
WINDOW = (50, 53, 9)  # center x, center y, radius
FLAME = [(36, 116), (64, 116), (50, 158)]

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
    """The rocket (amber flame) tilted 45° to the upper right, scaled to `height` pixels."""
    s = 8 * SUPERSAMPLE
    im = Image.new("RGBA", (100 * s, 160 * s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    scaled = lambda points: [(x * s, y * s) for x, y in points]
    cx, cy, r = WINDOW
    draw.polygon(scaled(HULL), fill=body)
    draw.ellipse([(cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s], fill=(0, 0, 0, 0))
    draw.polygon(scaled(FLAME), fill=ACCENT)
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
save(glyphs("ELI ROSE", ACCENT), "src/assets/brand/wordmark.png", 1400, ACCENT)

# Logo: muted brackets around the initials, then the rocket with a clear gap
er = glyphs("ER", TEXT)
bracket_gap = 28 * SUPERSAMPLE
logo = row(
    [glyphs("[", MUTED), er, glyphs("]", MUTED), rocket(round(er.height * 0.8))],
    [bracket_gap, bracket_gap, 70 * SUPERSAMPLE],
)
save(logo, "src/assets/brand/logo.png", 250)  # nav: ~125px wide

# Section headings: off-white, 21px tall on the page (saved at 2x). One scale for all, so the
# letters match across headings whatever their ink.
heading_scale = 42 / glyphs("E", TEXT).height
for word in ["Projects", "About", "Telemetry"]:
    art = glyphs(word.upper(), TEXT)
    save(art, f"src/assets/brand/headings/{word.lower()}.png", round(art.width * heading_scale), TEXT)

# The rocket as SVG paths: the hull with the window cut out (draw it with fill-rule="evenodd"),
# and the flame
polygon_path = lambda points: "M" + " ".join(f"{x} {y}" for x, y in points) + "Z"
cx, cy, r = WINDOW
hull_path = f"{polygon_path(HULL)} M{cx - r} {cy}a{r} {r} 0 1 0 {2 * r} 0a{r} {r} 0 1 0 {-2 * r} 0Z"
flame_path = polygon_path(FLAME)

(ROOT / "src/assets/brand/rocket.json").write_text(json.dumps({"hull": hull_path, "flame": flame_path}, indent=2) + "\n")
print("Wrote src/assets/brand/rocket.json")

# Favicons, all the rocket alone.
# SVG (Chrome, Edge, Firefox): transparent, dark body on light tab bars and off-white on dark ones.
hexcolor = lambda c: "#%02x%02x%02x" % c
svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="-7 5 132 132">
	<style>
		.body {{ fill: {hexcolor(SURFACE)}; }}
		@media (prefers-color-scheme: dark) {{ .body {{ fill: {hexcolor(TEXT)}; }} }}
	</style>
	<g transform="rotate(45 50 80) translate(0 -15)">
		<path class="body" fill-rule="evenodd" d="{hull_path}"/>
		<path fill="{hexcolor(ACCENT)}" d="{flame_path}"/>
	</g>
</svg>
"""
(ROOT / "public/assets/favicon.svg").write_text(svg)
print("Wrote public/assets/favicon.svg")


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
save(icon(BG, TEXT), "public/assets/apple-touch-icon.png", 180)


# Link preview (preview-image.png): the picture chat apps and social sites show when the site's link is
# shared, at the 1200x630 they all expect. The [ER] logo, the name and tagline, then the section
# headings' amber slant and signal waves beside the domain, over faint stars.


def web_font(package, file, size):
    """A font the site already installs (an @fontsource WOFF file), loaded for Pillow."""
    ttf = TTFont(ROOT / "node_modules/@fontsource" / package / "files" / file)
    ttf.flavor = None  # unwrap the WOFF into a plain TrueType font
    data = BytesIO()
    ttf.save(data)
    data.seek(0)
    return ImageFont.truetype(data, size)


def fit_width(image, width):
    return image.resize((width, round(image.height * width / image.width)), Image.LANCZOS)


def link_preview():
    k = 2  # drawn at 2x, then downscaled for smooth edges
    W, H = 1200 * k, 630 * k
    pad_x, pad_y = 88 * k, 72 * k
    footer_h = 30 * k
    out = Image.new("RGBA", (W, H), BG + (255,))

    # Faint stars, the same on every run; bigger ones are brighter, like the page's starfield
    stars = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(stars)
    rng = random.Random(7)
    for _ in range(140):
        depth = rng.random() ** 2
        x, y, r = rng.random() * W, rng.random() * H, (0.6 + depth * 0.9) * k
        draw.ellipse([x - r, y - r, x + r, y + r], fill=TEXT + (round(255 * (0.2 + depth * 0.5)),))
    out.alpha_composite(stars)

    # Top: the logo
    top_logo = fit_width(logo, 190 * k)
    out.alpha_composite(top_logo, (pad_x, pad_y))

    # Middle: the name, then the tagline from src/content/site.ts, wrapped at 930px
    tagline = re.search(r'tagline:\s*"([^"]+)"', (ROOT / "src/content/site.ts").read_text()).group(1)
    plex = web_font("ibm-plex-mono", "ibm-plex-mono-latin-400-normal.woff", 31 * k)
    lines = [""]
    for word in tagline.split():
        trial = f"{lines[-1]} {word}".strip()
        if lines[-1] and plex.getlength(trial) > 930 * k:
            lines.append(word)
        else:
            lines[-1] = trial
    line_h = round(31 * 1.5 * k)
    name = fit_width(glyphs("ELI ROSE", ACCENT), 780 * k)
    gap = 30 * k
    block_h = name.height + gap + line_h * len(lines)
    space_top, space_bottom = pad_y + top_logo.height, H - pad_y - footer_h
    y = space_top + (space_bottom - space_top - block_h) // 2  # centered between logo and footer
    out.alpha_composite(name, (pad_x, y))
    y += name.height + gap
    draw = ImageDraw.Draw(out)
    for text in lines:
        draw.text((pad_x, y + line_h // 2), text, font=plex, fill=TEXT, anchor="lm")
        y += line_h

    # Bottom: the slant, the domain in widely spaced capitals, then the waves
    top, mid = H - pad_y - footer_h, H - pad_y - footer_h // 2
    sw = 20 * k
    draw.polygon([(pad_x + 0.4 * sw, top), (pad_x + sw, top), (pad_x + 0.6 * sw, top + footer_h), (pad_x, top + footer_h)], fill=ACCENT)
    space = web_font("space-mono", "space-mono-latin-400-normal.woff", 21 * k)
    x = pad_x + sw + 26 * k
    for ch in "ELIROSE.DEV":
        draw.text((x, mid), ch, font=space, fill=TEXT, anchor="lm")
        x += space.getlength(ch) + 0.2 * 21 * k  # 0.2em tracking, as on the site's labels
    x += 26 * k
    # The waves: the section headings' four arcs (an 86x26 drawing), the later ones fainter
    s = 28 * k / 26
    for i, opacity in enumerate([1, 0.6, 0.36, 0.18]):
        x0 = 6 + 22 * i
        arc = [((1 - t) ** 2 * x0 + 2 * (1 - t) * t * (x0 + 9) + t * t * x0, 3 + 20 * t) for t in (j / 40 for j in range(41))]
        points = [(x + px * s, mid - 13 * s + py * s) for px, py in arc]
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        wave = ImageDraw.Draw(layer)
        wave.line(points, fill=ACCENT + (round(255 * opacity),), width=round(2 * s), joint="curve")
        for px, py in (points[0], points[-1]):  # round caps
            wave.ellipse([px - s, py - s, px + s, py + s], fill=ACCENT + (round(255 * opacity),))
        out.alpha_composite(layer)

    preview = out.convert("RGB").resize((1200, 630), Image.LANCZOS)
    preview.save(ROOT / "public/preview-image.png", optimize=True)
    print("Wrote public/preview-image.png (1200x630)")


link_preview()
