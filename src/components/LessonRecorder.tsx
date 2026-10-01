import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import clsx from "clsx";

import { PixelIcon } from "@/components/pixel/PixelSprite";
import {
  detectRecorderSupport,
  getSpeechRecognitionConstructor,
  type BrowserSpeechRecognition,
  type BrowserSpeechRecognitionEvent,
} from "@/utils/recorder-support";

type SupportKey = "unknown" | "full" | "audio-only" | "none";

/**
 * The support check never changes while the page is open, so there is nothing to subscribe to.
 */
function subscribeNothing(): () => void {
  return () => undefined;
}

/**
 * Reads browser support as a stable string so React can compare snapshots cheaply.
 */
function readSupportKey(): SupportKey {
  const support = detectRecorderSupport(window);

  if (support.canRecordAudio && support.canTranscribeKorean) {
    return "full";
  }

  return support.canRecordAudio ? "audio-only" : "none";
}

/**
 * Explains what the current browser can do, including the manual-typing fallback.
 */
function describeSupport(key: SupportKey): string {
  if (key === "unknown") {
    return "브라우저 지원 여부를 확인하는 중이에요.";
  }

  if (key === "full") {
    return "녹음을 시작하면 한국어 전사가 아래 칸에 쌓여요.";
  }

  return "이 브라우저는 녹음 또는 한국어 전사를 완전히 지원하지 않아요. 아래 칸에 직접 적어도 돼요.";
}

interface LessonRecorderProps {
  value: string;
  onChange(nextValue: string): void;
}

/**
 * Streams browser speech recognition into a Korean transcript field while recording audio.
 */
export function LessonRecorder({ value, onChange }: LessonRecorderProps) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const transcriptRef = useRef(value);
  const chunksRef = useRef<Blob[]>([]);

  const supportKey = useSyncExternalStore<SupportKey>(subscribeNothing, readSupportKey, () => "unknown");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [statusOverride, setStatusOverride] = useState<string | null>(null);
  const canRecordAudio = supportKey === "full" || supportKey === "audio-only";
  const statusMessage = statusOverride ?? describeSupport(supportKey);

  /**
   * Keeps status updates in one place so they replace the default support message.
   */
  function setStatusMessage(message: string): void {
    setStatusOverride(message);
  }

  useEffect(() => {
    transcriptRef.current = value.trim();
  }, [value]);

  useEffect(() => {
    return () => {
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.stop();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  /**
   * Starts audio recording and Korean speech recognition together.
   */
  async function startRecording(): Promise<void> {
    if (!canRecordAudio) {
      setStatusMessage("현재 브라우저에서는 오디오 녹음을 시작할 수 없습니다.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const RecognitionConstructor = getSpeechRecognitionConstructor(window);

      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }
        previewUrlRef.current = URL.createObjectURL(audioBlob);
        setPreviewUrl(previewUrlRef.current);
      };

      if (RecognitionConstructor) {
        const recognition = new RecognitionConstructor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "ko-KR";
        recognition.onresult = handleRecognitionResult;
        recognition.onerror = () => {
          setStatusMessage("음성 인식이 중단되었습니다. 필요하면 아래 텍스트를 직접 수정하세요.");
        };
        recognition.onend = () => {
          setStatusMessage("녹음이 종료되었습니다.");
        };
        recognition.start();
        recognitionRef.current = recognition;
      }

      recorder.start();
      setIsRecording(true);
      setStatusMessage("녹음 중입니다. 말한 내용이 한국어 텍스트로 입력됩니다.");
    } catch {
      setStatusMessage("마이크 권한을 허용해야 녹음을 시작할 수 있습니다.");
    }
  }

  /**
   * Stops the current audio/transcription session.
   */
  function stopRecording(): void {
    recognitionRef.current?.stop();
    recorderRef.current?.stop();
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    setIsRecording(false);
    setStatusMessage("녹음을 마쳤습니다. 전사 결과를 검토한 뒤 저장하세요.");
  }

  /**
   * Merges interim and final speech-recognition chunks into the transcript textarea.
   */
  function handleRecognitionResult(event: BrowserSpeechRecognitionEvent): void {
    const finalParts: string[] = [];
    const interimParts: string[] = [];

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result[0]?.transcript?.trim() ?? "";

      if (!transcript) {
        continue;
      }

      if (result.isFinal) {
        finalParts.push(transcript);
      } else {
        interimParts.push(transcript);
      }
    }

    if (finalParts.length > 0) {
      transcriptRef.current = [transcriptRef.current, finalParts.join(" ").trim()]
        .filter(Boolean)
        .join(" ")
        .trim();
    }

    onChange(
      [transcriptRef.current, interimParts.join(" ").trim()]
        .filter(Boolean)
        .join(" ")
        .trim(),
    );
  }

  return (
    <section aria-labelledby="recorder-title" className="recorder card pf">
      <div className="recorder__head">
        <h3 id="recorder-title">
          <PixelIcon name="bell" /> 말하면 글이 되는 전사
        </h3>
        <div className="recorder__buttons">
          <button className="btn btn--small" disabled={isRecording} onClick={startRecording} type="button">
            녹음 시작
          </button>
          <button className="btn btn--small btn--cream" disabled={!isRecording} onClick={stopRecording} type="button">
            녹음 종료
          </button>
        </div>
      </div>
      <p className={clsx("recorder__status muted", isRecording && "recorder__status--live")} role="status">
        {isRecording ? "● " : ""}
        {statusMessage}
      </p>
      <label className="sr-only" htmlFor="lesson-transcript">
        전사 내용
      </label>
      <textarea
        className="textarea"
        id="lesson-transcript"
        onChange={(event) => onChange(event.target.value)}
        placeholder="전사가 안 되는 브라우저에서도 여기에 오늘 배운 핵심을 직접 정리할 수 있어요."
        rows={5}
        value={value}
      />
      {previewUrl ? (
        <audio className="recorder__audio" controls src={previewUrl}>
          오디오 미리듣기를 지원하지 않는 브라우저예요.
        </audio>
      ) : null}
    </section>
  );
}
