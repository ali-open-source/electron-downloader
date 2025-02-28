// src/types.d.ts

export {};

declare global {
  interface Window {
    electronAPI: {
      startDownload: (data: any) => void;
      cancelDownload: (downloadId: string) => void;
      onProgress: (callback: (event: any, data: any) => void) => void;
      onComplete: (callback: (event: any, downloadId: string) => void) => void;
      onError: (callback: (event: any, data: any) => void) => void;
      onStatus: (callback: (event: any, data: any) => void) => void;
      onCancelled: (callback: (event: any, downloadId: string) => void) => void;
    };
  }
}
