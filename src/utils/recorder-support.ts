export interface RecorderSupportState {
  canRecordAudio: boolean;
  canTranscribeKorean: boolean;
}

export interface BrowserSpeechRecognitionResultItem {
  transcript: string;
}

export interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  0: BrowserSpeechRecognitionResultItem;
  length: number;
}

export interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
}

export interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}

export type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

interface RecorderAwareWindow extends Window {
  MediaRecorder?: typeof MediaRecorder;
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
}

/**
 * Detects whether the current browser can record audio and transcribe Korean speech.
 */
export function detectRecorderSupport(target?: Window): RecorderSupportState {
  const recorderWindow = target as RecorderAwareWindow | undefined;
  const canRecordAudio = Boolean(
    recorderWindow?.MediaRecorder && recorderWindow.navigator?.mediaDevices?.getUserMedia,
  );
  const canTranscribeKorean = Boolean(
    recorderWindow?.SpeechRecognition || recorderWindow?.webkitSpeechRecognition,
  );

  return {
    canRecordAudio,
    canTranscribeKorean,
  };
}

/**
 * Returns the browser speech-recognition constructor when available.
 */
export function getSpeechRecognitionConstructor(
  target?: Window,
): BrowserSpeechRecognitionConstructor | null {
  const recorderWindow = target as RecorderAwareWindow | undefined;

  return recorderWindow?.SpeechRecognition ?? recorderWindow?.webkitSpeechRecognition ?? null;
}
