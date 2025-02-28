// src/app/services/download.service.ts

import { Injectable, NgZone } from '@angular/core';
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
  providedIn: 'root',
})
export class DownloadService {
  private progressSubject = new Subject<DownloadProgress>();
  private completionSubject = new Subject<string>();
  private errorSubject = new Subject<{ downloadId: string; error: string }>();
  private statusSubject = new Subject<DownloadStatus>();

  constructor(private zone: NgZone) {
    // Listen for progress updates
    window.electronAPI.onProgress((_event, data: DownloadProgress) => {
      this.zone.run(() => {
        this.progressSubject.next(data);
      });
    });

    // Listen for completion
    window.electronAPI.onComplete((_event, downloadId: string) => {
      this.zone.run(() => {
        this.completionSubject.next(downloadId);
      });
    });

    // Listen for errors
    window.electronAPI.onError((_event, data: { downloadId: string; error: string }) => {
      this.zone.run(() => {
        this.errorSubject.next(data);
      });
    });

    // Listen for status updates
    window.electronAPI.onStatus((_event, data: DownloadStatus) => {
      this.zone.run(() => {
        this.statusSubject.next(data);
      });
    });

    // Listen for cancellations
    window.electronAPI.onCancelled((_event, downloadId: string) => {
      this.zone.run(() => {
        this.statusSubject.next({ downloadId, status: 'cancelled' });
      });
    });
  }

  startDownload(url: string, destination: string, downloadId: string) {
    window.electronAPI.startDownload({ url, destination, downloadId });
  }

  cancelDownload(downloadId: string) {
    window.electronAPI.cancelDownload(downloadId);
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

  onStatus(): Observable<DownloadStatus> {
    return this.statusSubject.asObservable();
  }
}
