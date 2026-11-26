const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ibra', {
  asset: (name) => ipcRenderer.invoke('asset', name),
  quit: () => ipcRenderer.send('quit'),
  fullscreen: () => ipcRenderer.send('fullscreen'),
  open: (url) => ipcRenderer.send('open', url),
});
