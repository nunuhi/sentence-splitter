export interface SegmentData {
  text: string;
  start: number;
  end: number;
}

export interface ProcessedSegment extends SegmentData {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING', // Sending to Gemini
  PROCESSING = 'PROCESSING', // Cutting audio files
  READY = 'READY',
  ERROR = 'ERROR'
}
