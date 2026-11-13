const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
for (const stream of [process.stdout, process.stderr]) {
  if (stream && typeof stream.on === 'function') stream.on('error', () => {});
}
function log(...a) { try { process.stdout.write(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ') + '\n'); } catch (e) {} }
const OUT = path.join(__dirname, 'out');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const Q = process.argv[2] || 'season=winter&part=dusk&footdebug=1';
const NAME = process.argv[3] || 'dbg';
const WAIT = parseInt(process.argv[4] || '16000', 10);

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 500, height: 352, show: false, frame: false, transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, nodeIntegration: false, offscreen: true, backgroundThrottling: false }
  });
  win.webContents.on('console-message', (evt, level, msg) => {
    if (typeof msg === 'string' && msg.length && msg.indexOf('Security Warning') < 0) log('[log]', msg.slice(0, 300));
  });
  win.setContentSize(500, 352);
  await win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'), { search: Q });
  await new Promise(r => setTimeout(r, WAIT));
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(OUT, NAME + '.png'), img.toPNG());
  log('saved', NAME);
  win.destroy(); app.quit();
});
