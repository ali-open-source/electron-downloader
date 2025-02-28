// app.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DownloadService } from './services/download.service';
import { v4 as uuidv4 } from 'uuid';
import { NgFor, NgIf } from '@angular/common';

interface FileItem {
  id: string;
  name: string;
  url: string;
  destination: string;
  isDownloading: boolean;
  progress: number;
  error?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [NgFor,NgIf],
})
export class AppComponent implements OnInit {
  files: FileItem[] = [];

  constructor(private downloadService: DownloadService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Initialize files with sample data
    console.log('Initializing files');
    this.files = [
      {
        id: uuidv4(),
        name: 'Sample100mb',
        url: 'https://fsn1-speed.hetzner.com/100MB.bin',
        destination: 'data/100.bin',
        isDownloading: false,
        progress: 0,
      },
      {
        id: uuidv4(),
        name: 'Sample1001mb',
        url: 'https://fsn1-speed.hetzner.com/100MB.bin',
        destination: 'data/1001.bin',
        isDownloading: false,
        progress: 0,
      },
      {
        id: uuidv4(),
        name: 'Sample1002mb',
        url: 'https://fsn1-speed.hetzner.com/100MB.bin',
        destination: 'data/1002.bin',
        isDownloading: false,
        progress: 0,
      },
      {
        id: uuidv4(),
        name: 'Sample1003mb',
        url: 'https://fsn1-speed.hetzner.com/100MB.bin',
        destination: 'data/1003.bin',
        isDownloading: false,
        progress: 0,
      },
      {
        id: uuidv4(),
        name: 'Sample50mb',
        url: 'https://fsn1-speed.hetzner.com/50MB.bin',
        destination: 'data/50.bin',
        isDownloading: false,
        progress: 0,
      },
      {
        id: uuidv4(),
        name: 'Sample10gb',
        url: 'https://fsn1-speed.hetzner.com/10GB.bin',
        destination: 'data/10GB.bin',
        isDownloading: false,
        progress: 0,
      },
      {
        id: uuidv4(),
        name: 'Sample11gb',
        url: 'https://fsn1-speed.hetzner.com/10GB.bin',
        destination: 'data/11GB.bin',
        isDownloading: false,
        progress: 0,
      },
      {
        id: uuidv4(),
        name: 'Sample12gb',
        url: 'https://fsn1-speed.hetzner.com/10GB.bin',
        destination: 'data/12GB.bin',
        isDownloading: false,
        progress: 0,
      },
      {
        id: uuidv4(),
        name: 'Sample13gb',
        url: 'https://fsn1-speed.hetzner.com/10GB.bin',
        destination: 'data/13GB.bin',
        isDownloading: false,
        progress: 0,
      },
      {
        id: uuidv4(),
        name: 'Sample14gb',
        url: 'https://fsn1-speed.hetzner.com/10GB.bin',
        destination: 'data/14GB.bin',
        isDownloading: false,
        progress: 0,
      },
      // Add more files as needed
    ];

    // Subscribe to download progress
    this.downloadService.onProgress().subscribe((data) => {
      const file = this.files.find((f) => f.id === data.downloadId);
      if (file) {
        file.progress = data.progress;
        this.cdr.detectChanges();
      }
    });

    // Subscribe to download completion
    this.downloadService.onComplete().subscribe((downloadId) => {
      const file = this.files.find((f) => f.id === downloadId);
      if (file) {
        file.isDownloading = false;
        file.progress = 100;
        this.cdr.detectChanges();
      }
    });

    // Subscribe to download errors
    this.downloadService.onError().subscribe((data) => {
      const file = this.files.find((f) => f.id === data.downloadId);
      if (file) {
        file.isDownloading = false;
        file.error = data.error;
        this.cdr.detectChanges();
      }
    });
  }

  startDownload(file: FileItem) {
    if (!file.isDownloading) {
      file.isDownloading = true;
      file.progress = 0;
      this.downloadService.startDownload(file.url, file.destination, file.id);
    }
  }

  cancelDownload(file: FileItem) {
    if (file.isDownloading) {
      this.downloadService.cancelDownload(file.id);
      file.isDownloading = false;
    }
  }
}
