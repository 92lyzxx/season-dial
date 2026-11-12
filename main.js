const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const STATE_FILE = () => path.join(app.getPath('userData'), 'window-state.json');

let win = null;
let tray = null;
let dragOrigin = null;

const DEFAULT_SIZE = { width: 500, height: 352 };

function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8'));
    if (typeof s.x === 'number' && typeof s.y === 'number') return s;
  } catch (e) { /* first run */ }
  return null;
}

function saveState() {
  if (!win || win.isDestroyed()) return;
  try {
    const b = win.getBounds();
    fs.writeFileSync(STATE_FILE(), JSON.stringify(b), 'utf8');
  } catch (e) { /* ignore */ }
}

function pickIcon() {
  const p = path.join(__dirname, 'assets', 'icon.png');
  if (fs.existsSync(p)) return nativeImage.createFromPath(p);
  return nativeImage.createEmpty();
}

function createWindow() {
  const state = loadState();
  const area = screen.getPrimaryDisplay().workArea;

  const width = state?.width || DEFAULT_SIZE.width;
  const height = state?.height || DEFAULT_SIZE.height;
  let x = state?.x;
  let y = state?.y;

  if (typeof x !== 'number' || typeof y !== 'number') {
    // 默认出现在屏幕右上角（工作区内，留 24px 边距）
    const m = 24;
    x = Math.round(area.x + area.width - width - m);
    y = Math.round(area.y + m);
  }
  // 存档位置可能落在已拔掉的显示器上：钳回工作区
  x = Math.min(Math.max(x, area.x), Math.max(area.x, area.x + area.width - width));
  y = Math.min(Math.max(y, area.y), Math.max(area.y, area.y + area.height - height));

  win = new BrowserWindow({
    width, height, x, y,
    transparent: true,
    frame: false,
    resizable: true,
    movable: true,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    backgroundColor: '#00000000',
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setMenu(null);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.once('ready-to-show', () => {
    win.showInactive();
    win.setAlwaysOnTop(true, 'screen-saver');
  });

  let saveTimer = null;
  const later = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 600);
  };
  win.on('moved', later);
  win.on('resized', later);

  // 点别的窗口/桌面时，窗口失焦 → 通知渲染进程收起右键菜单
  win.on('blur', () => {
    if (win && !win.isDestroyed()) win.webContents.send('pet:menuClose');
  });

  win.on('closed', () => { win = null; });
}

function createTray() {
  tray = new Tray(pickIcon().resize({ width: 32, height: 32 }));
  const rebuild = () => {
    const menu = Menu.buildFromTemplate([
      {
        label: `SeasonDial ${app.getVersion()} · 四季转盘`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: '窗口置顶',
        type: 'checkbox',
        checked: win ? win.isAlwaysOnTop() : true,
        click: (item) => {
          if (!win) return;
          win.setAlwaysOnTop(item.checked, 'screen-saver');
          win.webContents.send('pet:resized');
        }
      },
      {
        label: '居中显示',
        click: () => {
          if (!win) return;
          const b = win.getBounds();
          const area = screen.getPrimaryDisplay().workArea;
          win.setPosition(
            Math.round(area.x + (area.width - b.width) / 2),
            Math.round(area.y + (area.height - b.height) / 2)
          );
          saveState();
        }
      },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() }
    ]);
    tray.setContextMenu(menu);
  };
  rebuild();
  tray.setToolTip('四季转盘桌宠');
  tray.on('click', () => { rebuild(); });
}

ipcMain.on('pet:ready', () => { saveState(); });

/* ---------- 鼠标穿透：主进程按光标位置判定，不依赖渲染进程事件 ---------- */

let clickThroughOn = true;
let hitShape = null;   // { cx, cy, rx, ry, capX0, capY0, capX1, capY1 }
let menuIsOpen = false;
let ignoring = false;

function setIgnore(flag) {
  if (!win || win.isDestroyed()) return;
  if (ignoring === flag) return;
  ignoring = flag;
  win.setIgnoreMouseEvents(flag, { forward: true });
}

function insideHit(lx, ly) {
  if (!hitShape) return true;
  const { cx, cy, rx, ry } = hitShape;
  const nx = (lx - cx) / rx, ny = (ly - cy) / ry;
  if (nx * nx + ny * ny <= 1) return true;
  if (hitShape.capX1 > hitShape.capX0) {
    if (lx >= hitShape.capX0 && lx <= hitShape.capX1 &&
        ly >= hitShape.capY0 && ly <= hitShape.capY1) return true;
  }
  return false;
}

setInterval(() => {
  if (!win || win.isDestroyed()) return;
  if (!clickThroughOn || dragging) { setIgnore(false); return; }
  if (menuIsOpen) {
    setIgnore(false);
    // 菜单开着时，光标一旦离开窗口（点桌面/点别的窗口），就收起菜单
    const b2 = win.getBounds();
    const c2 = screen.getCursorScreenPoint();
    if (c2.x < b2.x - 2 || c2.y < b2.y - 2 ||
        c2.x > b2.x + b2.width + 2 || c2.y > b2.y + b2.height + 2) {
      win.webContents.send('pet:menuClose');
    }
    return;
  }
  const b = win.getBounds();
  const c = screen.getCursorScreenPoint();
  const lx = c.x - b.x, ly = c.y - b.y;
  if (lx < -40 || ly < -40 || lx > b.width + 40 || ly > b.height + 40) {
    setIgnore(true);
    return;
  }
  setIgnore(!insideHit(lx, ly));
}, 70);

ipcMain.on('pet:hit', (_e, shape) => { hitShape = shape; });

ipcMain.on('pet:clickthrough', (_e, flag) => {
  clickThroughOn = !!flag;
  if (!clickThroughOn) setIgnore(false);
});

ipcMain.on('pet:menuopen', (_e, flag) => {
  menuIsOpen = !!flag;
  if (menuIsOpen) setIgnore(false);
});

/* ---------- 拖动：主进程按光标屏幕坐标移动窗口 ---------- */

let dragTimer = null;
let dragOffset = null;
let dragging = false;

function stopDrag() {
  dragging = false;
  if (dragTimer) { clearInterval(dragTimer); dragTimer = null; }
  dragOffset = null;
  saveState();
}

ipcMain.on('pet:dragStart', () => {
  if (!win || win.isDestroyed()) return;
  const p = win.getPosition();
  const c = screen.getCursorScreenPoint();
  dragOffset = { x: c.x - p[0], y: c.y - p[1] };
  dragging = true;
  setIgnore(false);
  if (dragTimer) clearInterval(dragTimer);
  dragTimer = setInterval(() => {
    if (!win || win.isDestroyed() || !dragOffset || !dragging) return;
    const c2 = screen.getCursorScreenPoint();
    win.setPosition(
      Math.round(c2.x - dragOffset.x),
      Math.round(c2.y - dragOffset.y)
    );
  }, 16);
});

ipcMain.on('pet:dragEnd', () => { if (dragging) stopDrag(); });

ipcMain.on('pet:resize', (_e, size) => {
  if (!win || win.isDestroyed() || !size) return;
  const b = win.getBounds();
  const w = Math.round(size[0]), h = Math.round(size[1]);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const area = screen.getDisplayNearestPoint({ x: Math.round(cx), y: Math.round(cy) }).workArea;
  // 保持中心不动，但不许超出显示器工作区
  const x = Math.min(Math.max(Math.round(cx - w / 2), area.x), area.x + area.width - w);
  const y = Math.min(Math.max(Math.round(cy - h / 2), area.y), area.y + area.height - h);
  win.setBounds({ width: w, height: h, x, y });
  saveState();
  setTimeout(() => { if (win && !win.isDestroyed()) win.webContents.send('pet:resized'); }, 60);
  setTimeout(() => { if (win && !win.isDestroyed()) win.webContents.send('pet:resized'); }, 200);
});

ipcMain.on('pet:topmost', (_e, flag) => {
  if (!win || win.isDestroyed()) return;
  win.setAlwaysOnTop(!!flag, 'screen-saver');
});

ipcMain.on('pet:autostart', (_e, flag) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: !!flag,
      path: process.execPath
    });
  } catch (e) { /* ignore */ }
});

ipcMain.on('pet:quit', () => app.quit());

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { win.show(); win.setAlwaysOnTop(true, 'screen-saver'); }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('com.xixing.seasondial');
    createWindow();
    createTray();
  });

  app.on('window-all-closed', () => app.quit());
}
