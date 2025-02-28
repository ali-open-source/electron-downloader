const { app, BrowserWindow, ipcMain, net, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// Enable contextIsolation
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      allowRunningInsecureContent: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  win.loadFile(path.join(__dirname, '../dist/electron-downloader/browser/index.html'));
}

app.whenReady().then(() => {
  createWindow();
});

// Handle app closure on all platforms
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


// trying download here

let activeDownloads = 0;
const maxDownloads = 2;
const downloadQueue = [];
const downloadItems = {};

// Handle IPC events for starting downloads
ipcMain.on('start-download', (event, args) => {
  const { downloadId } = args;
  // Add to the queue
  downloadQueue.push({ event, args });
  // Update status to 'queued'
  event.reply('download-status', { downloadId, status: 'queued' });
  processQueue();
});

// Handle IPC events for cancelling downloads
ipcMain.on('cancel-download', (event, downloadId) => {
  if (downloadItems[downloadId]) {
    downloadItems[downloadId].abort();
  } else {
    // If download is in the queue but not started yet
    const index = downloadQueue.findIndex(item => item.args.downloadId === downloadId);
    if (index !== -1) {
      downloadQueue.splice(index, 1);
      event.reply('download-cancelled', downloadId);
    }
  }
});
// Cleanup after download completes or fails
function cleanupDownload(downloadId) {
  activeDownloads--;
  delete downloadItems[downloadId];
  processQueue();
}
// Process the download queue
function processQueue() {
  while (activeDownloads < maxDownloads && downloadQueue.length > 0) {
    const { event, args } = downloadQueue.shift();
    initiateDownload(event, args);
  }
}

function initiateDownload(event, { url, destination, downloadId }) {

  // Ensure destination directory exists
  const destinationPath = path.join(__dirname, destination);
  const destinationDir = path.dirname(destinationPath);
  try {
    fs.mkdirSync(destinationDir, { recursive: true });
  } catch (error) {
    event.reply('download-error', {
      downloadId,
      error: `Failed to create destination directory: ${error.message}`
    });
    return;
  }
  activeDownloads++;
  console.log('initiateDownload', { url, destinationPath, downloadId });
  const request = net.request(url);
  downloadItems[downloadId] = request;

  const fileStream = fs.createWriteStream(destinationPath);

  request.on('response', (response) => {
    const totalBytes = parseInt(response.headers['content-length']) || 0;
    let receivedBytes = 0;

    response.on('data', (chunk) => {
      receivedBytes += chunk.length;
      const progress = Math.round((receivedBytes / totalBytes) * 100);
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

    response.pipe(fileStream);
  });

  request.on('error', (error) => {
    console.log('error', error);
    event.reply('download-error', { downloadId, error: error.message });
    activeDownloads--;
    delete downloadItems[downloadId];
    processQueue();
  });

  request.end();
}

