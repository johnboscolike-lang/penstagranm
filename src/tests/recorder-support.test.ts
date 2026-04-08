import { detectRecorderSupport } from "@/utils/recorder-support";

describe("detectRecorderSupport", () => {
  it("reports support when media and speech APIs are available", () => {
    const fakeWindow = {
      MediaRecorder: class FakeMediaRecorder {},
      SpeechRecognition: class FakeRecognition {},
      navigator: {
        mediaDevices: {
          getUserMedia: async () => new MediaStream(),
        },
      },
    } as unknown as Window;

    expect(detectRecorderSupport(fakeWindow)).toEqual({
      canRecordAudio: true,
      canTranscribeKorean: true,
    });
  });

  it("reports missing support when required browser APIs are absent", () => {
    const fakeWindow = {
      navigator: {},
    } as Window;

    expect(detectRecorderSupport(fakeWindow)).toEqual({
      canRecordAudio: false,
      canTranscribeKorean: false,
    });
  });
});
