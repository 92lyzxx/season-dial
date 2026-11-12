"""裁真机截图里的桌宠区域放大看。"""
import os
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "out")
src = os.path.join(OUT, "live_after.png")
im = Image.open(src).convert("RGB")
box = (1420, 90, 1920, 380)
c = im.crop(box)
c.resize((c.width * 2, c.height * 2), Image.LANCZOS).save(os.path.join(OUT, "live_zoom.png"))
print("ok", box)
