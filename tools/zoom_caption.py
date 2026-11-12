"""裁出文字区域放大，检查白底/深底可读性。"""
import os
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "out")

def crop(src, dst, box, scale=2.4):
    im = Image.open(os.path.join(OUT, src)).convert("RGB")
    c = im.crop(box)
    c = c.resize((int(c.width * scale), int(c.height * scale)), Image.LANCZOS)
    c.save(os.path.join(OUT, dst))
    print("ok", dst)

# 白底文字区
crop("1-spring_white.png", "cap_white_zoom.png", (60, 240, 440, 345))
# 深底文字区（截图原始透明层合成到深灰）
im = Image.open(os.path.join(OUT, "3-autumn.png")).convert("RGBA")
bg = Image.new("RGBA", im.size, (24, 24, 26, 255))
bg.alpha_composite(im)
bg.convert("RGB").save(os.path.join(OUT, "3-autumn_dark.png"))
crop("3-autumn_dark.png", "cap_dark_zoom.png", (60, 240, 440, 345))
