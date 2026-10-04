# 공업교육론 D-30 압축 특강 · 영상 제작

Remotion으로 만드는 강의 영상 프로젝트. 기획은 [`docs/lecture/01-기획서.md`](../docs/lecture/01-기획서.md).

- 이론 4시간(4강) + 기출 패턴 문풀 4시간(4강)
- 현재 완성: **이론 1강 · 왜 기르고, 무엇을 가르치나** (약 37분, 55장면)

## 구조

```
src/content/        대본 데이터 (장면마다 발화 + 화면 데이터)
  types.ts          장면 종류와 데이터 형식
  parse.ts          발화 문법 해석: {큐}, [화면|소리]
  l01/ch1~8.ts      이론 1강 8묶음
src/timeline.ts     음성 타임라인 → 장면별 절대 시간표
src/Lesson.tsx      아이리스 · 모프 패널 · 장면 · HUD · 자막
src/scenes/         장면 레이아웃 (statement, map, metaphor, chunks, table, grid, list, timeline, exam, recap)
src/components/     Panel(유리/종이), Iris(마침표 오프닝·클로징), Pointer(강사 시선 커서), Captions, Hud, Icon, Reveal
scripts/            음성·효과음·믹스·스틸·렌더·검사
tests/              해석기·시간표 테스트
```

## 대본 문법

```ts
say: "공업교육은 {c1}공업 분야에서, {c2}처음 직업에 들어가려는 사람이나 …"
```

- `{c1}` 큐: 바로 뒤 글자가 **들리는 순간**. 화면 요소는 `at: "c1"`로 그 순간에 나타난다.
- `[1823|천팔백이십삼]`: 자막·화면은 앞쪽, 음성은 뒤쪽.
- `at: "zz…"`: 이번 장면에서는 켜지지 않는 요소(연표에서 앞뒤 사건을 흐리게 둘 때).

타이밍을 바꾸고 싶으면 대본의 큐 위치만 옮기면 된다. 음성 타임스탬프가 다시 계산해 준다.

## 제작 순서

```bash
npm install
echo "ELEVENLABS_API_KEY=..." > .env   # 커밋되지 않음

npm run check      # 큐 누락, 지문 표시 문구, 금지 표현(멈추기·원문·쪽수 등), 분량 검사
npm run voice      # ElevenLabs(Anna Kim, eleven_v4) 장면별 음성 + 글자별 타임스탬프 → public/voice/t01/timeline.json
npm run qa:voice   # 음성을 다시 받아쓰기해 대본과 비교 (.cache/qa-voice.json)
npm run sfx        # 효과음·음악 생성, 피크 위치 측정 (public/sfx/peaks.json)
npm run mix        # 내레이션 + 효과음(피크 정렬) + 배경음(덕킹) → -14 LUFS (out/t01/master.m4a)
npm run still -- c2s1 c4s3b@0.5   # 정지 화면 확인 (out/stills/sheet.jpg)
npm run render     # 묶음별 렌더 → 이어 붙이기 → 오디오 합치기 (out/t01/이론1강.mp4)
npm run qa -- out/t01/video.mp4   # 한 프레임만 튀는 곳 찾기
npm test
npm run studio     # Remotion Studio 미리보기 (음성 포함)
```

같은 문장·목소리·설정의 음성은 `.cache/voice`에서 재사용해 다시 과금하지 않는다.

## 화면 규칙

- 모든 모프·이동: `cubic-bezier(.45,0,.15,1)` 0.8초. 스프링·바운스·파티클·글로우·하드컷 없음.
- 장면이 바뀌어도 패널은 하나다. 자리·크기·모서리·재질(유리↔종이)이 모프된다.
- 아이리스는 반지름이 아니라 면적으로 이징한다. 마지막 프레임 = 첫 프레임(워드마크).
- 기출 지문에서는 강사 시선 커서가 결정 단서로 가서 표시를 남기고, 빈칸이 답으로 바뀐다.
- 렌더는 프레임 시각만으로 결정되는 순수 함수다(타이머·프레임 간 상태 없음).
