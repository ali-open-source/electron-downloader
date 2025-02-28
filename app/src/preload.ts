// src-electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  startDownload: (data: any) => ipcRenderer.send('start-download', data),
  cancelDownload: (downloadId: string) => ipcRenderer.send('cancel-download', downloadId),
  onProgress: (callback: (event: any, data: any) => void) => ipcRenderer.on('download-progress', callback),
  onComplete: (callback: (event: any, downloadId: string) => void) => ipcRenderer.on('download-complete', callback),
  onError: (callback: (event: any, data: any) => void) => ipcRenderer.on('download-error', callback),
  onStatus: (callback: (event: any, data: any) => void) => ipcRenderer.on('download-status', callback),
  onCancelled: (callback: (event: any, downloadId: string) => void) => ipcRenderer.on('download-cancelled', callback),
});
