import ctypes
from ctypes import wintypes
import subprocess

user32 = ctypes.windll.user32

def find_app_hwnds():
    out = []
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
    def cb(hwnd, _):
        buf = ctypes.create_unicode_buffer(512)
        user32.GetWindowTextW(hwnd, buf, 512)
        if buf.value == "四季转盘" and user32.IsWindowVisible(hwnd):
            out.append(hwnd)
        return True
    user32.EnumWindows(WNDENUMPROC(cb), 0)
    return out

for h in find_app_hwnds():
    r = wintypes.RECT()
    user32.GetWindowRect(h, ctypes.byref(r))
    print("before:", r.left, r.top, r.right - r.left, r.bottom - r.top)
    ok = user32.SetWindowPos(h, 0, 1150, 400, 820, 578, 0x0004 | 0x0010)  # SWP_NOZORDER|SWP_NOACTIVATE
    print("SetWindowPos ok:", ok, "err:", ctypes.get_last_error())
    user32.GetWindowRect(h, ctypes.byref(r))
    print("after :", r.left, r.top, r.right - r.left, r.bottom - r.top)
