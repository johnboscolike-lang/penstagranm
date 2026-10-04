# pen스타그램 · 우리반 퀘스트

수업 준비, 수업 목표, 필기, 과제를 **네 컷**으로 올리고 댓글과 일정, 한국어 전사를 함께 관리하던 교실형 인스타그램 데모를,
**아기자기한 도트 RPG 세계**로 다시 묶은 프로젝트입니다.

> 학교 소식을 확인하러 들어와, 내가 정한 작은 약속을 실천하고, 친구들과 도전하며 내 공간을 키운다.
> 경쟁은 매주 새 출발, XP·집·학습 진도는 계속 누적.

## 화면

`/login`에서 **학생**은 이름을 눌러, **선생님**은 이름과 교실 PIN으로 입장합니다.

| 역할 | 공간 | 경로 | 내용 |
|---|---|---|---|
| 학생 | 학교 | `/` | 오늘의 학교: 다음 수업·급식·공지·일정, 그리고 **이번 주 학급 보스** |
| 학생 | 주간도전 | `/challenge` | 오늘 약속 3칸, **선생님 퀘스트(사진 인증·제출)**, 주간 퀘스트, 이번 주 순위·보상 |
| 학생 | 대결 | `/arena` | **퀴즈 대결**(수학·영어), 리그와 교실 순위표, 받은 도전장, 이번 주 팀 승수 |
| 학생 | 내공간 | `/myroom` | 아바타·레벨, 지난주 성장 소식, **옷장(모자·펫)**, 앞마당 꾸미기, 네 컷 성장 기록과 댓글 |
| 학생 | 오늘 기록하기 | `/record` | 4개 사진 슬롯을 모두 채워 올리고 한국어 전사를 함께 저장 |
| 선생님 | 확인함 | `/teacher` | 제출된 퀘스트를 사진과 함께 보고 수행 확인 / 다시 시도 / 도움 필요 + 피드백, **학급 보스 난이도**, **대결장 열기/닫기** |
| 선생님 | 퀘스트 편성 | `/teacher/quests` | 학생별 **일일 반복·주간 목표** 퀘스트 만들기·멈추기·지우기 |
| 공통 | 일정 달력 | `/calendar` | 날짜 선택과 일정 등록을 한 페이지에서 |

화면이 어려우면 상단 **간단히 보기**로 장면을 끄고 같은 기능을 목록으로만 볼 수 있습니다.

## 선생님 퀘스트 흐름

1. 선생님이 `퀘스트 편성`에서 학생(여러 명 가능)을 고르고 과목·분량·반복 요일·기간·**사진 인증 필수** 여부를 정해 퀘스트를 냅니다. 일일 반복은 고른 요일마다 학생의 "오늘 약속"에 자동으로 나타나고(학생당 요일마다 최대 3개), 주간 목표는 한 주 동안 채우는 카드로 나타납니다.
2. 학생은 칸을 채우고 **휴대폰 카메라 또는 앨범**으로 인증 사진을 올린 뒤 **선생님께 제출**합니다. 사진은 브라우저에서 줄여서 올립니다.
3. 선생님은 `확인함`에서 사진을 보고 **수행 확인 / 다시 시도 / 도움 필요**를 정하고 피드백을 남깁니다. 결과와 피드백은 학생 화면과 주간도전 장면의 부엉이 말풍선에 나타납니다.

## 주요 기능

- 네 개의 고정 사진 슬롯으로 게시글(성장 기록) 업로드
- 게시글별 댓글 (교과 선생님 댓글은 배지로 구분)
- 브라우저 기반 오디오 녹음 + 한국어 전사 (미지원 브라우저에서는 직접 입력 폴백)
- 월간 캘린더 일정 관리
- 자기 약속 3칸 → 일간 점수·도장·XP·코인, 주간 평균 점수, 공동 순위, 팀 점수
- 서로 다른 3일 실천하면 받는 주간 보상권, 폭풍성장/다시 시작/첫걸음/꾸준한 도전 배지
- 코인으로 앞마당 꾸미기 (XP·레벨은 줄지 않음)
- **소리**: 공간마다 다른 배경음악 5곡(코드로 합성)과 효과음 24종, 소리 설정(음악·효과음 켜기/끄기, 볼륨)
- **대결장(PvP)**: 같은 문제 5개를 각자 풀어 겨루는 비동기 퀴즈 대결. Elo 점수와 씨앗~별 5단계 리그, 하루 횟수 제한, 참여 보상
- **학급 보스 레이드**: 교실 전체가 채운 칸과 끝낸 대결이 이번 주 보스의 체력을 깎고, 쓰러뜨리면 보상과 함께 그 몬스터가 펫이 된다
- **옷장**: 코인으로 산 모자 7종을 아바타에 씌우고, 만난 펫을 데리고 다닌다 (겉모습만 바뀌고 점수에는 영향 없음)
- 레벨 업·코인 도착·연속 실천 알림과 상단의 연속 실천 표시
- Prisma + SQLite 기반 로컬 데이터 저장

계산 규칙은 `docs/specs/05-quest-game-ui.md`, 코드는 `src/utils/quest-rules.ts`에 있습니다.

## 실행 방법

```bash
npm install
cp .env.example .env   # 없어도 기본값(file:./dev.db)으로 실행됩니다
npm run db:push
npm run db:seed
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 입장 화면이 보입니다. 개발 환경의 교사 PIN은 `1234`입니다.
`db:seed`는 오늘 날짜를 기준으로 최근 5주 기록과 일정을 만들므로, 며칠 뒤 다시 실행하면 화면이 최신 상태로 맞춰집니다.

## 테스트와 빌드

```bash
npm run test
npm run lint
npm run build
```

## 배포 (Vercel + PostgreSQL)

서버리스에서는 파일과 SQLite를 저장할 수 없어서 배포에서는 PostgreSQL과 "사진을 DB에 저장" 모드를 씁니다. 로컬 개발은 그대로 SQLite와 `public/uploads`입니다.

| 환경 변수 | 설명 |
|---|---|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `UPLOAD_STORAGE=db` | 사진을 DB(`UploadedFile`)에 저장하고 `/api/uploads/…`로 제공 |
| `TEACHER_PIN` | 교사 입장 PIN (운영에서는 필수) |
| `SESSION_SECRET` | 쿠키 서명 비밀값 (선택, 없으면 `DATABASE_URL`에서 파생) |

`npm run vercel-build`가 SQLite 스키마를 PostgreSQL 공급자로 바꾼 사본(`prisma/schema.postgres.prisma`)을 만들고, 테이블을 만든 뒤(`prisma db push`), 데이터가 비어 있을 때만 데모 데이터를 넣고, 앱을 빌드합니다. 요청 크기 제한(4.5MB)에 맞추려고 사진은 브라우저에서 긴 변 1280px로 줄여 올립니다.

## 홍보 영상 (`/promo/`)

배포 주소의 `/promo`(가로)와 `/promo/shorts`(세로)에서 40초짜리 홍보 영상을 소리와 함께 볼 수 있다. 두 주소는 `public/promo`의 정적 HTML로 보내는 리다이렉트다(`next.config.ts`). 영상은 HyperFrames(npm `hyperframes`)의 HTML 컴포지션이며, 별도 촬영 없이 게임 화면 캡처와 도트 스프라이트로 만들었다.

| 파일 | 내용 |
|---|---|
| `public/promo/index.html` | 가로 16:9 (1920×1080) 컴포지션. `/promo`에서 바로 재생 |
| `public/promo/shorts.html` | 세로 9:16 (1080×1920) 쇼츠용 컴포지션. 글자·스프라이트를 키우고 구도를 세로로 다시 짰다. `/promo/shorts` |
| `public/promo/penstagranm-promo.mp4` | 가로판 MP4 (소리 포함) |
| `public/promo/penstagranm-shorts.mp4` | 세로판 MP4 (소리 포함) |

- **음악**: 외부 음원 없이 코드로 합성한 120 BPM 칩튠 비트 (`scripts/promo/make-beat.mjs` → `public/promo/beat.mp3`). 킥·스네어·하이햇·베이스·아르페지오·멜로디로 구성하고, 드롭 직전 정적과 마지막 한 방을 넣었다.
- **박자 맞춤**: 20마디(마디당 2초). 장면 전환·글자 등장·화면 흔들림이 모두 박자표(`scripts/promo/beat-grid.mjs`)의 박 위에 놓인다.
- **재생기**: 브라우저에서 열면 `player.js`가 소리 시계에 맞춰 재생·되감기·전체 화면을 맡는다. HyperFrames 스튜디오·렌더러 안에서는 동작하지 않는다.

```bash
node scripts/promo/make-beat.mjs public/promo/beat.mp3      # 음악 다시 만들기 (ffmpeg 필요)
npx hyperframes check public/promo                          # 규칙·레이아웃·대비 점검
npx hyperframes render public/promo -o /tmp/promo.mp4       # 가로판 MP4로 뽑기

# 세로판은 index.html이 있어야 해서 임시 폴더에 복사해 렌더한다
tmp=$(mktemp -d) && cp -r public/promo/assets public/promo/beat.mp3 public/promo/player.js "$tmp" \
  && cp public/promo/shorts.html "$tmp/index.html" \
  && npx hyperframes render "$tmp" -o /tmp/shorts.mp4

# 올리기 전에 용량을 줄인다 (소리는 그대로)
ffmpeg -i /tmp/promo.mp4 -c:v libx264 -crf 25 -pix_fmt yuv420p -movflags +faststart -c:a copy public/promo/penstagranm-promo.mp4
```

## 도트 아트와 소리

- 글꼴 [갈무리](https://github.com/quiple/galmuri)(OFL)는 `public/fonts`에 포함되어 있습니다.
- 캐릭터·아이콘·모자는 코드 안의 ASCII 격자, 건물·나무·소품은 `src/utils/art`에서 절차적으로 그려 `/api/sprites/이름.svg`로 제공합니다.
- 보스·펫·대결 상대는 [Kenney](https://kenney.nl)의 **CC0(공개 도메인)** 16×16 도트(`public/game/kenney`)를 씁니다. 효과음 24종도 같은 곳의 CC0 소리를 다듬은 것입니다. 출처는 `public/game/CREDITS.md`에 적혀 있습니다.
- 배경음악 5곡은 외부 음원 없이 `scripts/audio/make-bgm.mjs`가 코드로 합성합니다. 곡을 바꾸려면 `scripts/audio/tracks.mjs`의 악보를 고치고 아래처럼 다시 만듭니다.
- MapleStory 같은 상용 게임의 캐릭터·이미지는 저작권 때문에 쓰지 않았습니다. 대신 자유롭게 쓸 수 있는 공개 에셋을 썼습니다.

```bash
node scripts/audio/make-bgm.mjs                 # 배경음악 다시 만들기 (ffmpeg 필요)
node scripts/assets/import-kenney.mjs <Kenney 팩을 풀어 둔 폴더>   # 도트·효과음 다시 가져오기
```

## 빠른 커밋/푸시

앞으로는 아래 명령으로 현재 변경사항을 한 번에 `add + commit + push` 할 수 있습니다.

```bash
npm run publish -- -Message "한글 커밋 메시지"
```

테스트를 건너뛰고 바로 올리고 싶다면:

```bash
npm run publish -- -Message "빠른 저장" -SkipTests
```

## 폴더 구조

```text
src/
├── components/    # 게임 셸, 장면(scenes), 도트 스프라이트(pixel), 피드·달력·녹음 UI
├── pages/         # 화면과 API 라우트 (학교 / 주간도전 / 내공간 / 기록 / 달력)
├── utils/         # 규칙 계산, 데이터, 날짜(KST), 업로드, 로거, 도트 아트 생성(art)
├── styles/        # 전역·레이아웃·기능별 스타일
└── tests/         # Vitest
```

## 공업교육론 압축 특강 영상 (`lecture/`)

같은 저장소 안에 임용 대비 **공업교육론 D-30 압축 특강** HTML 강의 플레이어 프로젝트가 있습니다(영상 렌더 없이 음성에 맞춰 화면을 그림).
Next.js 앱과는 별도 패키지이며, 기획은 `docs/lecture/01-기획서.md`, 제작 방법은 `lecture/README.md`를 보세요.
