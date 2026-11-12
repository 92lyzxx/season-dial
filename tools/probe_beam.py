import math, sys
from PIL import Image

p = sys.argv[1] if len(sys.argv) > 1 else r'tools\out\4-winter.png'
im = Image.open(p).convert('RGBA')
W, H = im.size
R = min(W * 0.365, H * 0.76)
cx, cy = W / 2, H * 0.555
ry = R * 0.335

best = (0, 0, 0)  # (radius, angle, lum)
for ai in range(720):
    a = ai * 2 * math.pi / 720
    for ri in range(60, 150):
        r = R * ri / 100
        x = int(cx + math.cos(a) * r)
        y = int(cy + math.sin(a) * r * (ry / R))
        if 0 <= x < W and 0 <= y < H:
            px = im.getpixel((x, y))
            lum = (px[0] + px[1] + px[2]) / 3
            if lum > 235 and px[3] > 200:
                if r > best[0]:
                    best = (r, a, lum)

print('R=%.1f  cx=%.1f cy=%.1f' % (R, cx, cy))
print('brightest white pixel max radius: %.1f  (= %.3f R)  angle=%.2f rad' % (best[0], best[0] / R, best[1]))
