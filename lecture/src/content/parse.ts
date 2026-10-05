/**
 * 대본 문법 해석기. Remotion(브라우저)과 Node 스크립트가 함께 쓴다.
 *
 * - `{cue}`: 바로 뒤 글자가 들리는 순간을 큐로 등록한다.
 * - `[화면|소리]`: 자막·화면에는 앞쪽, 음성에는 뒤쪽을 쓴다.
 */

export type Parsed = {
  /** TTS에 보낼 문장 */
  spoken: string;
  /** 자막에 쓸 문장 */
  display: string;
  /** 큐 이름 → spoken 안의 글자 위치 */
  cues: Record<string, number>;
  /** display 글자 위치 → spoken 글자 위치 (자막 하이라이트용) */
  displayToSpoken: number[];
};

/**
 * 발화 문자열을 TTS용·자막용 문장과 큐 위치로 나눈다.
 * @param say 대본 발화
 * @returns 해석 결과
 */
export function parseSay(say: string): Parsed {
  let spoken = "";
  let display = "";
  const cues: Record<string, number> = {};
  const displayToSpoken: number[] = [];
  let i = 0;
  while (i < say.length) {
    const ch = say[i];
    if (ch === "{") {
      const end = say.indexOf("}", i);
      if (end < 0) throw new Error(`닫히지 않은 큐: ${say.slice(i, i + 20)}`);
      const name = say.slice(i + 1, end);
      if (name in cues) throw new Error(`중복 큐 '${name}'`);
      cues[name] = spoken.length;
      i = end + 1;
      continue;
    }
    if (ch === "[") {
      const end = say.indexOf("]", i);
      const bar = say.indexOf("|", i);
      if (end < 0 || bar < 0 || bar > end) throw new Error(`잘못된 표기: ${say.slice(i, i + 20)}`);
      const disp = say.slice(i + 1, bar);
      const sound = say.slice(bar + 1, end);
      const start = spoken.length;
      for (let k = 0; k < disp.length; k++) displayToSpoken.push(start + Math.floor((k * sound.length) / Math.max(1, disp.length)));
      display += disp;
      spoken += sound;
      i = end + 1;
      continue;
    }
    displayToSpoken.push(spoken.length);
    display += ch;
    spoken += ch;
    i++;
  }
  return { spoken, display, cues, displayToSpoken };
}
