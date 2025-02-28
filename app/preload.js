// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startDownload: (data) => ipcRenderer.send('start-download', data),
  cancelDownload: (downloadId) => ipcRenderer.send('cancel-download', downloadId),
  onProgress: (callback) => ipcRenderer.on('download-progress', callback),
  onComplete: (callback) => ipcRenderer.on('download-complete', callback),
  onError: (callback) => ipcRenderer.on('download-error', callback),
});
