const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pet', {
  send: (channel, payload) => ipcRenderer.send(channel, payload),
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
  on: (channel, cb) => ipcRenderer.on(channel, (_e, data) => cb(data))
});
