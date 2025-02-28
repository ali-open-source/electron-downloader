import { IpcMainEvent, net, Notification } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { DownloadArgs, DownloadItems, QueueItem } from './download.types';


export class DownloadManager {
  private activeDownloads: number = 0;
  private readonly maxDownloads: number = 2;
  private downloadQueue: QueueItem[] = [];
  private downloadItems: DownloadItems = {};

  public queueDownload(event: IpcMainEvent, args: DownloadArgs): void {
    this.downloadQueue.push({ event, args });
    event.reply('download-status', { downloadId: args.downloadId, status: 'queued' });
    this.processQueue();
  }

  public cancelDownload(event: IpcMainEvent, downloadId: string): void {
    if (this.downloadItems[downloadId]) {
      this.downloadItems[downloadId].abort();
    } else {
      const index = this.downloadQueue.findIndex(item => item.args.downloadId === downloadId);
      if (index !== -1) {
        this.downloadQueue.splice(index, 1);
        event.reply('download-cancelled', downloadId);
      }
    }
  }

  private cleanupDownload(downloadId: string): void {
    this.activeDownloads--;
    delete this.downloadItems[downloadId];
    this.processQueue();
  }

  private processQueue(): void {
    while (this.activeDownloads < this.maxDownloads && this.downloadQueue.length > 0) {
      const item = this.downloadQueue.shift();
      if (item) {
        this.initiateDownload(item.event, item.args);
      }
    }
  }

  private initiateDownload(event: IpcMainEvent, { url, destination, downloadId }: DownloadArgs): void {
    const destinationPath = path.join(__dirname, '..', destination);
    const destinationDir = path.dirname(destinationPath);

    try {
      fs.mkdirSync(destinationDir, { recursive: true });
    } catch (error) {
      event.reply('download-error', {
        downloadId,
        error: `Failed to create directory: ${(error as Error).message}`
      });
      return;
    }

    this.activeDownloads++;
    const request = net.request(url);
    this.downloadItems[downloadId] = request;

    const fileStream = fs.createWriteStream(destinationPath);

    request.on('response', (response) => {
      const contentLength = response.headers['content-length'];
      const totalBytes = parseInt(Array.isArray(contentLength) ? contentLength[0] : contentLength || '0', 10);
      let receivedBytes = 0;

      response.on('data', (chunk: Buffer) => {
        receivedBytes += chunk.length;
        const progress = Math.round((receivedBytes / totalBytes) * 100);
        event.reply('download-progress', { downloadId, progress });
      });

      response.on('end', () => {
        fileStream.end(() => {
          event.reply('download-complete', downloadId);
          this.activeDownloads--;
          delete this.downloadItems[downloadId];
          new Notification({
            title: 'Download Complete',
            body: `File saved to ${destination}`
          }).show();
          this.processQueue();
        });
      });

      response.on('data', (chunk: Buffer) => {
        fileStream.write(chunk);
      });
    });

    request.on('error', (error: Error) => {
      fileStream.end();
      fs.unlink(destinationPath, () => {
        event.reply('download-error', { downloadId, error: error.message });
        this.activeDownloads--;
        delete this.downloadItems[downloadId];
        this.processQueue();
      });
    });

    request.end();
  }
}
