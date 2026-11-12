"""把打赏弹窗的离屏截图（tools/out/donate_preview.png，透明底）合成到深色底，
输出 docs/screenshots/donate.png，供 README 展示。"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "tools", "out", "donate_preview.png")
DST = os.path.join(ROOT, "docs", "screenshots", "donate.png")

SCALE = 2
PAD = 48
BG_TOP = (28, 30, 34)
BG_BOTTOM = (16, 17, 20)

src = Image.open(SRC).convert("RGBA")
big = src.resize((src.width * SCALE, src.height * SCALE), Image.LANCZOS)

w, h = big.width + PAD * 2, big.height + PAD * 2
bg = Image.new("RGB", (1, h))
px = bg.load()
for y in range(h):
    t = y / max(1, h - 1)
    px[0, y] = tuple(int(BG_TOP[i] * (1 - t) + BG_BOTTOM[i] * t) for i in range(3))
bg = bg.resize((w, h))
bg.paste(big, (PAD, PAD), big)
bg.save(DST, "PNG", optimize=True)
print("ok donate.png", bg.size, os.path.getsize(DST) // 1024, "KB")
