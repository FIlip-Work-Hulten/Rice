#!/usr/bin/env python3
"""Generate dark lake background PNGs at multiple sizes.
Produces subtle gradient, soft reflection, blurred horizontal wave lines and noise.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import math, os, random

OUT_DIR = 'src/frontend/static/img'
SIZES = [ (3840,2160), (2560,1440), (1920,1080), (1366,768), (1280,720), (800,600) ]

os.makedirs(OUT_DIR, exist_ok=True)

# base colors (night)
TOP_COLOR = (2,6,18)
BOTTOM_COLOR = (8,18,44)
REFLECTION_COLOR = (220,240,255)

print('Generating backgrounds in', OUT_DIR)
for w,h in SIZES:
    print(' -', w, 'x', h)
    base = Image.new('RGB', (w,h), BOTTOM_COLOR)
    draw = ImageDraw.Draw(base)
    # vertical gradient
    for y in range(h):
        t = y / float(h-1)
        r = int(TOP_COLOR[0] * (1-t) + BOTTOM_COLOR[0] * t)
        g = int(TOP_COLOR[1] * (1-t) + BOTTOM_COLOR[1] * t)
        b = int(TOP_COLOR[2] * (1-t) + BOTTOM_COLOR[2] * t)
        draw.line([(0,y),(w,y)], fill=(r,g,b))

    # add soft reflection (ellipse + blur)
    refl = Image.new('RGBA', (w,h), (0,0,0,0))
    rd = ImageDraw.Draw(refl)
    rx = int(w * 0.5)
    ry = int(h * 0.25)
    rw = int(w * 0.7)
    rh = int(h * 0.18)
    bbox = (rx - rw//2, ry - rh//2, rx + rw//2, ry + rh//2)
    rd.ellipse(bbox, fill=REFLECTION_COLOR + (26,))
    refl = refl.filter(ImageFilter.GaussianBlur(radius=max(6, w//600)))
    base = Image.alpha_composite(base.convert('RGBA'), refl).convert('RGB')

    # add soft horizontal wave lines layer
    lines = Image.new('RGBA', (w,h), (0,0,0,0))
    ld = ImageDraw.Draw(lines)
    line_count = int(h/18)
    for i in range(line_count):
        y = int(h * 0.2 + i * (h*0.6/line_count) + math.sin(i*1.3 + random.random())* (h*0.003))
        opacity = int(6 + random.random()*6)
        ld.line([(0,y),(w,y)], fill=(180,200,255, opacity), width=1)
    lines = lines.filter(ImageFilter.GaussianBlur(radius= max(2, w//1400)))
    base = Image.alpha_composite(base.convert('RGBA'), lines).convert('RGB')

    # add subtle noise
    try:
        noise = Image.effect_noise((w//2, h//2), 10.0).convert('L').resize((w,h), resample=Image.BILINEAR)
        noise = ImageChops.multiply(noise, Image.new('L', (w,h), 30))
        # blend noise as overlay
        noise_col = Image.merge('RGB', [noise.point(lambda p: int(p*0.06))]*3)
        base = ImageChops.add(base, noise_col)
    except Exception:
        # fallback: light uniform tint
        pass

    # final gentle blur
    base = base.filter(ImageFilter.GaussianBlur(radius=1.2))

    out_path = os.path.join(OUT_DIR, f'background-{w}.png')
    base.save(out_path, optimize=True)

# also save a default background.png (1920 size)
try:
    src = os.path.join(OUT_DIR, 'background-1920.png')
    dst = os.path.join(OUT_DIR, 'background.png')
    if os.path.exists(src):
        Image.open(src).save(dst, optimize=True)
        print('Saved default', dst)
except Exception as e:
    print('Could not save default background.png:', e)

print('Done.')
