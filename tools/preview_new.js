const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

for (const stream of [process.stdout, process.stderr]) {
  if (stream && typeof stream.on === 'function') stream.on('error', () => {});
}
function log(...args) {
  try { process.stdout.write(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ') + '\n'); } catch (e) {}
}

const OUT = path.join(__dirname, 'out');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { name: 'n1-spring', q: 'season=spring&part=day', size: [500, 352], wait: 3200 },
  { name: 'n2-summer', q: 'season=summer&part=day', size: [500, 352], wait: 3200 },
  { name: 'n3-autumn', q: 'season=autumn&part=day', size: [500, 352], wait: 3600 },
  { name: 'n4-winter', q: 'season=winter&part=day', size: [500, 352], wait: 3200 },
  { name: 'n5-winter-walk', q: 'season=winter&part=dusk', size: [500, 352], wait: 14000 },
  { name: 'n6-spring-large', q: 'season=spring&part=day', size: [650, 458], wait: 3200 },
  { name: 'n7-autumn-small', q: 'season=autumn&part=day', size: [380, 268], wait: 3600 }
];

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 500, height: 352,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      offscreen: true,
      backgroundThrottling: false
    }
  });

  win.webContents.on('console-message', (evt, level, msg) => {
    if (typeof msg === 'string' && msg.length && msg.indexOf('Security Warning') < 0) {
      log('[log]', msg.slice(0, 200));
    }
  });

  for (const s of SHOTS) {
    const size = s.size || [500, 352];
    win.setContentSize(size[0], size[1]);
    try {
      await win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'), { search: s.q });
    } catch (e) {
      log('LOAD ERR', s.name, e && e.message);
      continue;
    }
    await new Promise(r => setTimeout(r, s.wait || 2600));
    try {
      const img = await win.webContents.capturePage();
      const buf = img.toPNG();
      fs.writeFileSync(path.join(OUT, s.name + '.png'), buf);
      log('saved', s.name, img.getSize(), buf.length);
    } catch (e) {
      log('CAP ERR', s.name, e && e.message);
    }
  }
  win.destroy();
  app.quit();
});
