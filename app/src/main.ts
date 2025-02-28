// src/main.ts

import { app, BrowserWindow, ipcMain, net, Notification, IpcMainEvent, ClientRequest, IncomingMessage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Enable contextIsolation
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

let win: BrowserWindow;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true, // Consider setting to false for security
      contextIsolation: true,
      allowRunningInsecureContent: true, // Consider setting to false for security
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'electron-downloader/browser/index.html'));
}

app.whenReady().then(() => {
  createWindow();
});

// Handle app closure on all platforms
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Download management

let activeDownloads = 0;
const maxDownloads = 2;
const downloadQueue: Array<{ event: IpcMainEvent; args: DownloadArgs }> = [];
const downloadItems: { [key: string]: ClientRequest } = {};

// Define the structure of download arguments
interface DownloadArgs {
  downloadId: string;
  url: string;
  destination: string;
}

// Handle IPC events for starting downloads
ipcMain.on('start-download', (event: IpcMainEvent, args: DownloadArgs) => {
  const { downloadId } = args;
  // Add to the queue
  downloadQueue.push({ event, args });
  // Update status to 'queued'
  event.reply('download-status', { downloadId, status: 'queued' });
  processQueue();
});

// Handle IPC events for cancelling downloads
ipcMain.on('cancel-download', (event: IpcMainEvent, downloadId: string) => {
  if (downloadItems[downloadId]) {
    downloadItems[downloadId].abort();
  } else {
    // If download is in the queue but not started yet
    const index = downloadQueue.findIndex((item) => item.args.downloadId === downloadId);
    if (index !== -1) {
      downloadQueue.splice(index, 1);
      event.reply('download-cancelled', downloadId);
    }
  }
});

// Process the download queue
function processQueue() {
  while (activeDownloads < maxDownloads && downloadQueue.length > 0) {
    const item = downloadQueue.shift();
    if (item) {
      const { event, args } = item;
      initiateDownload(event, args);
    }
  }
}

function initiateDownload(event: IpcMainEvent, { url, destination, downloadId }: DownloadArgs) {
  // Ensure destination directory exists
  const destinationPath = path.join(__dirname, destination);
  const destinationDir = path.dirname(destinationPath);

  try {
    fs.mkdirSync(destinationDir, { recursive: true });
  } catch (error) {
    const errorMessage = (error as Error).message;
    event.reply('download-error', {
      downloadId,
      error: `Failed to create destination directory: ${errorMessage}`,
    });
    return;
  }

  activeDownloads++;
  console.log('initiateDownload', { url, destinationPath, downloadId });
  const request = net.request(url);
  downloadItems[downloadId] = request;

  const fileStream = fs.createWriteStream(destinationPath);

  request.on('response', (response: IncomingMessage) => {
    const contentLength = response.headers['content-length'];
    const totalBytes = typeof contentLength === 'string' ? parseInt(contentLength) : 0;
    let receivedBytes = 0;

    response.on('data', (chunk: Buffer) => {
      receivedBytes += chunk.length;
      const progress = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0;
      console.log('progress:', progress);
      event.reply('download-progress', { downloadId, progress });
    });

    response.on('end', () => {
      fileStream.close();
      event.reply('download-complete', downloadId);
      console.log('download done:', downloadId);
      activeDownloads--;
      delete downloadItems[downloadId];
      new Notification({ title: 'Download Complete', body: `File saved to ${destination}` }).show();
      processQueue();
    });

    response.on('data', (chunk: Buffer) => {
      fileStream.write(chunk);
    });

    response.on('end', () => {
      fileStream.end();
    });
  });

  request.on('error', (error: Error) => {
    console.log('error', error);
    event.reply('download-error', { downloadId, error: error.message });
    activeDownloads--;
    delete downloadItems[downloadId];
    processQueue();
  });

  request.end();
}
