let activeDownloads = 0;
const maxDownloads = 2;
const downloadQueue = [];
const downloadItems = {};

// IPC Events
ipcMain.on('start-download', (event, args) => {
  downloadQueue.push({ event, args });
  processQueue();
});

ipcMain.on('cancel-download', (event, downloadId) => {
  if (downloadItems[downloadId]) {
    downloadItems[downloadId].abort();
  }
});


// Process Download Queue
function processQueue() {
  if (activeDownloads < maxDownloads && downloadQueue.length > 0) {
    const { event, args } = downloadQueue.shift();
    initiateDownload(event, args);
  }
}

function initiateDownload(event, { url, destination, downloadId }) {
  activeDownloads++;

  const request = net.request(url);
  downloadItems[downloadId] = request;

  const fileStream = fs.createWriteStream(destination);

  request.on('response', (response) => {
    const totalBytes = parseInt(response.headers['content-length']) || 0;
    let receivedBytes = 0;

    response.on('data', (chunk) => {
      receivedBytes += chunk.length;
      const progress = Math.round((receivedBytes / totalBytes) * 100);
      event.reply('download-progress', { downloadId, progress });
    });

    response.on('end', () => {
      fileStream.close();
      event.reply('download-complete', downloadId);
      activeDownloads--;
      delete downloadItems[downloadId];
      processQueue();
    });

    response.pipe(fileStream);
  });

  request.on('error', (error) => {
    event.reply('download-error', { downloadId, error: error.message });
    activeDownloads--;
    delete downloadItems[downloadId];
    processQueue();
  });

  request.end();
}
