const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const w = new BrowserWindow({
    width: 380,
    height: 508,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await w.loadFile(path.join(__dirname, '..', 'renderer', 'donate.html'));
  await new Promise((r) => setTimeout(r, 900));

  const img = await w.webContents.capturePage();
  const out = path.join(__dirname, 'out', 'donate_preview.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, img.toPNG());
  console.log('saved', out, JSON.stringify(img.getSize()));

  app.quit();
});
