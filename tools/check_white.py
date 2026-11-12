"""把透明底截图贴到纯白背景上，检查文字可读性（白底预览）。"""
import os
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "out")

for name in ("1-spring", "3-autumn"):
    p = os.path.join(OUT, name + ".png")
    if not os.path.exists(p):
        print("missing", p)
        continue
    im = Image.open(p).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    bg.alpha_composite(im)
    dst = os.path.join(OUT, name + "_white.png")
    bg.convert("RGB").save(dst)
    print("ok", dst, im.size)
