#!/usr/bin/env python3
"""Render existing brand vectors. Requires rsvg-convert and Python Pillow.

Edit keegoid-master.svg (wordmark) and keegoid-tile.svg (square K) natively,
then run python3 scripts/build-brand.py. All PNG/ICO backgrounds stay transparent.
The favicon adds a white K for dark browser themes; raster fallbacks retain the
purple K with a white keyline. Stripe accepts the generated PNG logo and icon.
"""
from pathlib import Path
import subprocess
import tempfile
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / 'static/images/brand'


def render(source, target, width):
    subprocess.run(['rsvg-convert', '-w', str(width), str(source), '-o', str(target)], check=True)


def main():
    master = (BRAND / 'keegoid-master.svg').read_text()
    (BRAND / 'keegoid-logo.svg').write_text(master)
    tile = (BRAND / 'keegoid-tile.svg').read_text()
    (BRAND / 'keegoid-tile-square.svg').write_text(tile)
    adaptive = tile.replace('  <g transform=', '  <style>@media (prefers-color-scheme: dark) { .mark { fill: white; } }</style>\n  <g class="mark" transform=', 1)
    (ROOT / 'static/favicon.svg').write_text(adaptive)
    for size in (16, 32, 64):
        render(BRAND / 'keegoid-tile.svg', BRAND / f'keegoid-tile-{size}.png', size)
    for name, size in [('keegoid-touch-icon.png', 180), ('keegoid-stripe-icon.png', 512)]:
        render(BRAND / 'keegoid-tile.svg', BRAND / name, size)
    for name, width in [('keegoid-logo-1620.png', 1620), ('keegoid-stripe-logo.png', 1491)]:
        render(BRAND / 'keegoid-logo.svg', BRAND / name, width)
    render(BRAND / 'keegoid-og-card.svg', BRAND / 'keegoid-og-card.png', 1200)
    # Each ICO entry is rendered at its own native resolution.
    with tempfile.TemporaryDirectory() as tmp:
        images = []
        for size in (16, 32, 48, 64, 128, 256):
            target = Path(tmp) / f'{size}.png'
            render(BRAND / 'keegoid-tile.svg', target, size)
            with Image.open(target) as image:
                images.append(image.convert('RGBA'))
        images[-1].save(ROOT / 'static/favicon.ico', format='ICO', sizes=[im.size for im in images], append_images=images[:-1])


if __name__ == '__main__':
    main()
