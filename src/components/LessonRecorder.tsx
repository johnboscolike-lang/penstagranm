import { useEffect, useRef, useState } from "react";

import {
  detectRecorderSupport,
  getSpeechRecognitionConstructor,
  type BrowserSpeechRecognition,
  type BrowserSpeechRecognitionEvent,
} from "@/utils/recorder-support";

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

  const [supportState, setSupportState] = useState(
    detectRecorderSupport(typeof window === "undefined" ? undefined : window),
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState("브라우저 지원 여부를 확인하는 중입니다.");

  useEffect(() => {
    transcriptRef.current = value.trim();
  }, [value]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const support = detectRecorderSupport(window);
    setSupportState(support);
    setStatusMessage(
      support.canRecordAudio && support.canTranscribeKorean
        ? "녹음을 시작하면 한국어 전사가 textarea에 누적됩니다."
        : "이 브라우저는 녹음 또는 한국어 전사를 완전히 지원하지 않습니다. 텍스트는 직접 편집할 수 있습니다.",
    );
  }, []);

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
    if (!supportState.canRecordAudio) {
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
    } catch (_error: unknown) {
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
    <section className="recorder-panel">
      <div className="section-heading">
        <div>
          <p className="section-heading__eyebrow">LIVE RECORDER</p>
          <h3>수업 녹음과 한글 전사</h3>
        </div>
        <div className="recorder-panel__buttons">
          <button className="primary-button" onClick={startRecording} type="button">
            녹음 시작
          </button>
          <button
            className="ghost-button"
            disabled={!isRecording}
            onClick={stopRecording}
            type="button"
          >
            녹음 종료
          </button>
        </div>
      </div>
      <p className="helper-text">{statusMessage}</p>
      <textarea
        className="text-area"
        onChange={(event) => onChange(event.target.value)}
        placeholder="브라우저 전사가 되지 않아도 이곳에 수업 핵심 내용을 직접 정리할 수 있습니다."
        rows={6}
        value={value}
      />
      {previewUrl ? (
        <audio className="recorder-panel__audio" controls src={previewUrl}>
          오디오 미리듣기를 지원하지 않는 브라우저입니다.
        </audio>
      ) : null}
    </section>
  );
}
