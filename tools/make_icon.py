"""由 AI 生成的 1536px 母图，产出 tray 用 PNG 与 Windows 多尺寸 ICO。

小尺寸（16/24/32/48）用「只保留椭圆盘」的简化版，避免整块深色底板把小盘压没；
大尺寸（64/128/256）用完整圆角方形底板。ICO 按 PNG 压缩逐尺寸手写，保证每一档
都是专门缩放出来的图，而不是一张图硬塞进所有尺寸。

用法：python tools/make_icon.py
"""
import io
import os
import struct

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "icon_src.png")
ICO = os.path.join(ROOT, "build", "icon.ico")
TRAY = os.path.join(ROOT, "assets", "icon.png")
DOC = os.path.join(ROOT, "docs", "icon.png")

src = Image.open(SRC).convert("RGBA")

# 1) 512 版：tray 与 README 用
tray = src.resize((512, 512), Image.LANCZOS)
tray.save(TRAY, "PNG", optimize=True)
tray.save(DOC, "PNG", optimize=True)


# 2) 找出椭圆盘（高饱和区域）的包围盒，给简化版裁图用
def disc_box(im):
    small = im.resize((768, 768), Image.LANCZOS)
    w, h = small.size
    px = small.load()
    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 40:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            if mx - mn > 70 and mx > 90:          # 有彩色的部分 = 四季盘
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    return (minx, miny, maxx + 1, maxy + 1), small.size


box, size = disc_box(src)
scale = src.width / size[0]
box_src = tuple(int(v * scale) for v in box)
print("disc box(src):", box_src)


def square_crop(im, box, pad_ratio=0.10):
    """把包围盒裁成正方形并留一点边距。"""
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    side = max(x1 - x0, y1 - y0) * (1 + pad_ratio * 2)
    half = side / 2
    l, t = int(cx - half), int(cy - half)
    return im.crop((l, t, l + int(side), t + int(side)))


simple = square_crop(src, box_src, 0.14)


# 3) 逐尺寸出图：小档用简化盘并切圆角，大档用完整底板
def rounded(im, radius_ratio=0.22):
    size = im.width
    mask = Image.new("L", (size * 4, size * 4), 0)
    from PIL import ImageDraw
    d = ImageDraw.Draw(mask)
    r = int(size * 4 * radius_ratio)
    d.rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=r, fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    out = im.copy()
    out.putalpha(mask)
    return out


def art_for(size_px):
    if size_px <= 48:
        return rounded(simple.resize((size_px, size_px), Image.LANCZOS))
    return src.resize((size_px, size_px), Image.LANCZOS)


def ico_bytes(pairs):
    """手写 ICO：每个尺寸一个独立 PNG 数据块。"""
    blobs = []
    for size_px, im in pairs:
        buf = io.BytesIO()
        im.save(buf, format="PNG", optimize=True)
        blobs.append((size_px, buf.getvalue()))

    header = struct.pack("<HHH", 0, 1, len(blobs))
    offset = 6 + 16 * len(blobs)
    dirs = b""
    for size_px, data in blobs:
        dim = 0 if size_px >= 256 else size_px
        dirs += struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
    body = b"".join(d for _, d in blobs)
    return header + dirs + body


sizes = [16, 24, 32, 48, 64, 128, 256]
with open(ICO, "wb") as f:
    f.write(ico_bytes([(s, art_for(s)) for s in sizes]))

print("icon.png", os.path.getsize(TRAY), "bytes")
print("icon.ico", os.path.getsize(ICO), "bytes")
print("sizes:", sizes)
