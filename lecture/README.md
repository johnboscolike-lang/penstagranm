# 공업교육론 D-30 압축 특강 · HTML 강의

영상 파일을 렌더하지 않는 **HTML 강의 플레이어**. 브라우저가 음성의 재생 시각 하나로 모든 화면을 실시간으로 그린다.
대본이나 음성이 바뀌면 다시 빌드만 하면 되고(수 초), MP4 렌더 병목이 없다. 기획은 [`docs/lecture/01-기획서.md`](../docs/lecture/01-기획서.md).

- 이론 4시간(4강) + 기출 패턴 문풀 4시간(4강)
- 현재 완성: **이론 1강 · 왜 기르고, 무엇을 가르치나** (약 37분, 55장면)

## 구조

```
src/content/        대본 데이터 (장면마다 발화 + 화면 데이터)
  types.ts          장면 종류와 데이터 형식
  parse.ts          발화 문법 해석: {큐}, [화면|소리]
  l01/ch1~8.ts      이론 1강 8묶음
src/timeline.ts     음성 타임라인 → 장면별 절대 시간표
src/Stage.tsx       1920×1080 무대: 아이리스 · 모프 패널 · 장면 · HUD · 자막 (t의 순수 함수)
src/player/         플레이어: 묶음별 오디오 재생, 진행 막대, 묶음 이동, 속도, 자막, 전체 화면
src/scenes/         장면 레이아웃 (statement, map, metaphor, chunks, table, grid, list, timeline, exam, recap)
src/components/     Panel(유리/종이), Iris(마침표 오프닝·클로징), Pointer(강사 시선 커서), Captions, Hud, Icon, Reveal
scripts/            음성·효과음·믹스·빌드·스틸 캡처·검사
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
npm run build      # HTML 플레이어 → dist/t01 (index.html, app.js, assets/)
npm run still -- c2s1 c4s3b@0.5 t=12   # 플레이어 화면 캡처 (out/stills/sheet.jpg)
npm run serve      # 로컬에서 열기 (--lesson 으로 강 선택)
npm test
```

플레이어 단축키: 스페이스 재생/정지, ←/→ 5초, [ / ] 묶음 이동, c 자막.
주소 뒤에 `?t=초`를 붙이면 그 시각부터, `?cap=0`이면 자막 없이 연다.

같은 문장·목소리·설정의 음성은 `.cache/voice`에서 재사용해 다시 과금하지 않는다.

## 화면 규칙

- 모든 모프·이동: `cubic-bezier(.45,0,.15,1)` 0.8초. 스프링·바운스·파티클·글로우·하드컷 없음.
- 장면이 바뀌어도 패널은 하나다. 자리·크기·모서리·재질(유리↔종이)이 모프된다.
- 아이리스는 반지름이 아니라 면적으로 이징한다. 마지막 프레임 = 첫 프레임(워드마크).
- 기출 지문에서는 강사 시선 커서가 결정 단서로 가서 표시를 남기고, 빈칸이 답으로 바뀐다.
- 무대는 재생 시각 t만으로 결정되는 순수 함수다(타이머·프레임 간 상태 없음). 어느 지점으로 이동해도 같은 화면이 나온다.
