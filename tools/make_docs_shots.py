"""把离屏截图合成到深色底并放大 2 倍，用作 README / Releases 的展示图。

输入：tools/out/*.png（capture.js 生成，透明底）
输出：docs/screenshots/*.png
"""
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "tools", "out")
DST = os.path.join(ROOT, "docs", "screenshots")
os.makedirs(DST, exist_ok=True)

SCALE = 2
BG_TOP = (28, 30, 34)
BG_BOTTOM = (16, 17, 20)


def backdrop(size):
    w, h = size
    bg = Image.new("RGB", (1, h))
    px = bg.load()
    for y in range(h):
        t = y / max(1, h - 1)
        px[0, y] = tuple(
            int(BG_TOP[i] * (1 - t) + BG_BOTTOM[i] * t) for i in range(3)
        )
    return bg.resize((w, h))


def compose(name, out_name):
    src = Image.open(os.path.join(SRC, name)).convert("RGBA")
    big = src.resize((src.width * SCALE, src.height * SCALE), Image.LANCZOS)
    bg = backdrop(big.size)
    bg.paste(big, (0, 0), big)
    bg.save(os.path.join(DST, out_name), "PNG", optimize=True)
    print("ok", out_name, bg.size)


PAIRS = [
    ("1-spring.png", "spring.png"),
    ("2-summer.png", "summer.png"),
    ("3-autumn.png", "autumn.png"),
    ("4-winter.png", "winter.png"),
    ("10-wipe.png", "season-sweep.png"),
]
for a, b in PAIRS:
    compose(a, b)

# 四季总览：2×2 拼图
tiles = ["spring.png", "summer.png", "autumn.png", "winter.png"]
imgs = [Image.open(os.path.join(DST, t)).convert("RGB") for t in tiles]
gap = 8
w, h = imgs[0].size
sheet = Image.new("RGB", (w * 2 + gap, h * 2 + gap), (22, 23, 26))
for i, im in enumerate(imgs):
    sheet.paste(im, ((i % 2) * (w + gap), (i // 2) * (h + gap))
                )
sheet.save(os.path.join(DST, "overview.png"), "PNG", optimize=True)
print("ok overview.png", sheet.size)
