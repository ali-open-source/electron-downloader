import { IpcMainEvent, ClientRequest } from 'electron';

export interface DownloadArgs {
  url: string;
  destination: string;
  downloadId: string;
}

export interface QueueItem {
  event: IpcMainEvent;
  args: DownloadArgs;
}

export interface DownloadItems {
  [key: string]: ClientRequest;
}

export type DownloadStatus = 'pending' | 'queued' | 'downloading' | 'completed' | 'cancelled' | 'error';

export interface DownloadProgress {
  downloadId: string;
  progress: number;
}

export interface DownloadError {
  downloadId: string;
  error: string;
}
