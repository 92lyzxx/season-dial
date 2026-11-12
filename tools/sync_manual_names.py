"""把说明书里的旧产品名/旧路径同步成 SeasonDial。"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, "docs", "manual.zh-CN.md")

with open(p, encoding="utf-8") as f:
    s = f.read()

pairs = [
    ("# 四季转盘 · 桌宠", "# SeasonDial · 四季转盘 — 使用说明"),
    ("双击桌面上的 **四季转盘** 快捷方式即可（等价于运行 `dist\\四季转盘.exe`）。",
     "双击桌面上的 **SeasonDial** 快捷方式即可（等价于运行 `dist\\SeasonDial-1.0.0.exe`）。"),
    ("`dist\\四季转盘.exe`", "`dist\\SeasonDial-1.0.0.exe`"),
    ("%APPDATA%\\四季转盘\\window-state.json", "%APPDATA%\\SeasonDial\\window-state.json"),
    ("cd 四季转盘桌宠", "cd season-dial"),
    ('Get-Process -Name "四季转盘" | Stop-Process -Force',
     'Get-Process -Name "SeasonDial" | Stop-Process -Force'),
]

for a, b in pairs:
    if a not in s:
        print("miss:", a[:40])
    s = s.replace(a, b)

with open(p, "w", encoding="utf-8", newline="\n") as f:
    f.write(s)

print("patched", p)
for line in s.splitlines():
    if "SeasonDial" in line or "四季转盘.exe" in line:
        print("  >>", line)
