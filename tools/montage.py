import os, glob
from PIL import Image, ImageDraw, ImageFilter

base = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')

def wallpaper(w, h):
    bg = Image.new('RGB', (w, h), (18, 20, 26))
    d = ImageDraw.Draw(bg)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=(int(24 + 26 * t), int(26 + 30 * t), int(36 + 40 * t)))
    glow = Image.new('RGB', (w, h), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-w * 0.3, h * 0.5, w * 0.5, h * 1.3], fill=(62, 56, 42))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    return Image.blend(bg, glow, 0.55)

files = sorted(glob.glob(os.path.join(base, '*.png')))
if os.path.exists(os.path.join(base, 'sheet.png')):
    files = [f for f in files if os.path.basename(f) != 'sheet.png']

for f in files:
    im = Image.open(f).convert('RGBA')
    w, h = im.size
    out = Image.alpha_composite(wallpaper(w, h).convert('RGBA'), im)
    out.convert('RGB').save(f.replace('.png', '_preview.png'))
    print('preview', os.path.basename(f))

thumbs = []
for f in files:
    im = Image.open(f).convert('RGBA')
    tw = 430
    th = int(im.size[1] * tw / im.size[0])
    t = im.resize((tw, th), Image.LANCZOS)
    thumbs.append(Image.alpha_composite(wallpaper(tw, th).convert('RGBA'), t).convert('RGB'))

cols, rows = 2, 4
cw, ch = 430, 302
sheet = Image.new('RGB', (cols * cw, rows * ch), (8, 10, 14))
for i, t in enumerate(thumbs):
    t2 = t.resize((cw - 6, ch - 6), Image.LANCZOS)
    sheet.paste(t2, ((i % cols) * cw + 3, (i // cols) * ch + 3))
sheet.save(os.path.join(base, 'sheet.png'))
print('sheet ok', sheet.size)
