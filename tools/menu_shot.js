const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
for (const s of [process.stdout, process.stderr]) if (s && typeof s.on === 'function') s.on('error', () => {});
function log(...a) { try { process.stdout.write(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ') + '\n'); } catch (e) {} }

const OUT = path.join(__dirname, 'out');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 500, height: 352, show: false, frame: false, transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, nodeIntegration: false, offscreen: true, backgroundThrottling: false }
  });
  win.webContents.on('console-message', (evt, level, msg) => {
    if (typeof msg === 'string' && msg.indexOf('Security Warning') < 0) log('[log]', msg.slice(0, 200));
  });
  await win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'), { search: 'season=spring&part=day' });
  await new Promise(r => setTimeout(r, 2500));
  // 打开右键菜单并勾上加速轮转，看菜单项是否在可视范围内
  const info = await win.webContents.executeJavaScript(`(() => {
    showMenu(16, 16);
    const el = document.querySelector('#menu');
    const items = [...el.querySelectorAll('.item')].map(i => i.textContent.trim());
    const turbo = [...el.querySelectorAll('.item')].find(i => i.textContent.indexOf('加速轮转') >= 0);
    const r = turbo ? turbo.getBoundingClientRect() : null;
    return JSON.stringify({ items, menuH: el.offsetHeight, scrollH: el.scrollHeight, maxH: el.style.maxHeight,
      turboRect: r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) } : null });
  })()`);
  log(info);
  await new Promise(r => setTimeout(r, 800));
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(OUT, 'menu-new.png'), img.toPNG());
  log('saved menu-new');
  win.destroy(); app.quit();
});
