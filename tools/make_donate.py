"""把用户提供的微信赞赏码截图裁成干净卡片，输出 assets/donate.png。

原图 1152x1152，截图工具留了一圈 1px 灰框（x=24 / y=24 / x=1127）和两个角标圆点
（半径约 9px，中心在 29.5,29.5 与右上角）。这里向内裁 40px 把框和角标都切掉，
底部金色条带直接顶到图片下边缘，保持原样。

用法：python tools/make_donate.py
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r"D:\Download\桌面\微信图片_20261113011351_277_47.jpg"
OUT = os.path.join(ROOT, "assets", "donate.png")

INSET = 40
CARD_RIGHT = 1127

im = Image.open(SRC).convert("RGB")
w, h = im.size
box = (INSET, INSET, CARD_RIGHT - INSET, h)
card = im.crop(box)
print("cropped:", card.size)

target_w = 720
card = card.resize((target_w, round(card.height * target_w / card.width)), Image.LANCZOS)
card.save(OUT, "PNG", optimize=True)
print("saved:", OUT, card.size, os.path.getsize(OUT) // 1024, "KB")
