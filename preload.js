const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ibra', {
  quit: () => ipcRenderer.send('quit'),
  fullscreen: () => ipcRenderer.send('fullscreen'),
  open: (url) => ipcRenderer.send('open', url),
});
