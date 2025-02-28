import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

interface DownloadProgress {
  downloadId: string;
  progress: number;
}
interface DownloadStatus {
  downloadId: string;
  status: 'pending' | 'queued' | 'downloading' | 'completed' | 'cancelled' | 'error';
}
@Injectable({
  providedIn: 'root'
})
export class DownloadService {
  private progressSubject = new Subject<DownloadProgress>();
  private statusSubject = new Subject<DownloadStatus>();
  private completionSubject = new Subject<string>();
  private errorSubject = new Subject<{ downloadId: string; error: string }>();

  constructor() {
    // Listen for progress updates
    (<any>window).electronAPI.onProgress((_event: any, data: DownloadProgress) => {
      this.progressSubject.next(data);
    });

    // Listen for completion
    (<any>window).electronAPI.onComplete((_event: any, downloadId: string) => {
      this.completionSubject.next(downloadId);
    });

    // Listen for errors
    (<any>window).electronAPI.onError((_event: any, data: { downloadId: string; error: string }) => {
      this.errorSubject.next(data);
    });
  }

  startDownload(url: string, destination: string, downloadId: string) {
    (<any>window).electronAPI.startDownload({ url, destination, downloadId });
  }

  cancelDownload(downloadId: string) {
    (<any>window).electronAPI.cancelDownload(downloadId);
  }

  onProgress(): Observable<DownloadProgress> {
    return this.progressSubject.asObservable();
  }

  onComplete(): Observable<string> {
    return this.completionSubject.asObservable();
  }

  onError(): Observable<{ downloadId: string; error: string }> {
    return this.errorSubject.asObservable();
  }
}
