const { app, BrowserWindow } = require('electron');
const path = require('path');

for (const s of [process.stdout, process.stderr]) if (s && typeof s.on === 'function') s.on('error', () => {});
function log(...a) { try { process.stdout.write(a.join(' ') + '\n'); } catch (e) {} }

const Q = process.argv[2] || 'turbo=1&fps=60&part=day';
const TOTAL = parseInt(process.argv[3] || '24', 10);   // 采样多少秒
const STEP = 500;

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 500, height: 352, show: false, frame: false, transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true, nodeIntegration: false, offscreen: true, backgroundThrottling: false
    }
  });
  win.webContents.on('console-message', (evt, level, msg) => {
    if (typeof msg === 'string' && msg.indexOf('Security Warning') < 0) log('[log]', msg.slice(0, 200));
  });
  await win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'), { search: Q });
  await new Promise(r => setTimeout(r, 1200));

  const t0 = Date.now();
  while (Date.now() - t0 < TOTAL * 1000) {
    const s = await win.webContents.executeJavaScript(`(() => {
      const now = performance.now() / 1000;
      const st = { at: now.toFixed(2), phase: beamPhaseNow.toFixed(3), turbo: CFG.turbo,
        season, mode: CFG.seasonMode,
        wipeDur: wipe ? wipe.dur : 0,
        wipeP: wipe ? +((now - wipe.t0) / wipe.dur).toFixed(3) : -1 };
      return JSON.stringify(st);
    })()`);
    log(s);
    await new Promise(r => setTimeout(r, STEP));
  }
  win.destroy();
  app.quit();
});
