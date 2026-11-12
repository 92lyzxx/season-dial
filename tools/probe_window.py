"""打印桌宠所有顶层窗口的矩形与可见性，用来核实窗口尺寸/位置是否真的变了。

用法：python tools/probe_window.py [进程名，默认 SeasonDial.exe]
"""
import ctypes
import subprocess
import sys
from ctypes import wintypes

user32 = ctypes.windll.user32

EXE = sys.argv[1] if len(sys.argv) > 1 else "SeasonDial.exe"


def iter_windows():
    hwnds = []
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)

    def cb(hwnd, _):
        hwnds.append(hwnd)
        return True

    user32.EnumWindows(WNDENUMPROC(cb), 0)
    return hwnds


def win_text(hwnd):
    buf = ctypes.create_unicode_buffer(512)
    user32.GetWindowTextW(hwnd, buf, 512)
    return buf.value


def pid_of(hwnd):
    pid = wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    return pid.value


raw = subprocess.check_output(
    ["tasklist", "/FI", f"IMAGENAME eq {EXE}", "/FO", "CSV", "/NH"],
    encoding="gbk", errors="ignore")
pids = set()
for line in raw.splitlines():
    parts = [p.strip('"') for p in line.split('","')]
    if len(parts) >= 2 and parts[1].isdigit():
        pids.add(int(parts[1]))

print("pids:", pids)
for h in iter_windows():
    if pid_of(h) not in pids:
        continue
    r = wintypes.RECT()
    user32.GetWindowRect(h, ctypes.byref(r))
    print(
        f"hwnd={h} title={win_text(h)!r} visible={bool(user32.IsWindowVisible(h))} "
        f"rect=({r.left},{r.top})-({r.right},{r.bottom}) size={r.right-r.left}x{r.bottom-r.top}"
    )
