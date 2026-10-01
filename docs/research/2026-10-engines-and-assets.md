# 게임 엔진·라이브러리·에셋 조사 (2026-10-01)

우리반 퀘스트(Next.js 16 Pages Router + React 19 + Prisma, Vercel 서버리스)에 붙일 만한 공개 엔진·시스템·에셋을 병렬로 조사하고, 채택/제외한 이유를 남긴다.
**검증 한계**: 이 환경에서 GitHub REST API가 막혀 있어 별 수·최근 커밋일은 github.com 페이지 요약과 npm 정보로 확인했다(반올림·요약 오차 가능). 라이선스는 설치한 npm 패키지나 내려받은 팩 안의 LICENSE 파일로 확인했다. 소리는 귀로 듣지 않았다.

## 채택

| 이름 | 쓰임 | 라이선스 | 이유 |
|---|---|---|---|
| Kaplay 3001.0.19 | 몬스터 사냥 미니게임 | MIT | 67KB(gzip)로 가볍고 물리·입력이 내장. 정확한 버전 고정, 눌렀을 때만 불러옴. 다음 버전 태그가 4000.0.0-alpha라 breaking change가 예정되어 있다 |
| ts-fsrs 5.4.2 | 단어 간격 반복 | MIT | 의존성 없음, 6.7KB. 최신 간격 반복 알고리즘(FSRS)을 순수 함수로 쓸 수 있어 서버리스·테스트에 알맞다 |
| Tiny Creatures | 동물 펫 | CC0 (Clint Bellanger) | 기존 Kenney Tiny Dungeon과 같은 16×16 도트 |
| Kenney Emotes Pack | 응원 이모트 | CC0 | 16×16, 말풍선 포함 |
| The Ninja Adventure Asset Pack (Items만) | 업적 아이콘 | CC0 | 팩의 LICENSE.txt가 CC0 1.0 전문. 글꼴·음악은 따로 출처를 확인하지 못해 가져오지 않음 |
| OpenGameArt CC0 곡 2개 | 대결 로비·미니게임 음악 | CC0 | 반복 곡으로 올라온 것. OGA 페이지 License 필드가 CC0. 곡마다 근거 수준이 다르다(`public/game/CREDITS.md`) |

## 검토했지만 지금은 제외

| 이름 | 이유 |
|---|---|
| Phaser 4 (MIT, ~356KB gzip) | 모바일에 무겁고 SSR에서 `window`를 요구한다. 지금 규모에는 과하다 |
| PixiJS 8 (+@pixi/react) | 장면 전체를 갈아엎을 때나 필요. `@pixi/particle-emitter`는 Pixi 8과 호환되지 않는다 |
| Excalibur, melonJS, LittleJS | Kaplay보다 무겁거나 이 앱에 이점이 없다 |
| boardgame.io, Colyseus | 멀티플레이에 상시 Node 서버가 필요해 Vercel 서버리스와 맞지 않는다. 비동기 대결은 DB로 충분 |
| Howler, Tone, ZzFX | 우리 WebAudio 엔진이 이미 디코딩·무끊김 반복·덕킹을 한다. Howler는 코드 개발이 멈춰 있다 |
| NES.css, RPGUI, Pixelact UI, 8bitcn, nes-ui-react | 직접 만든 border-image 프레임과 충돌하거나(NES.css는 전역 리셋 포함), Tailwind/shadcn을 새로 들여야 하거나, React 19와 맞지 않는다 |
| motion, lottie, tsparticles | 용량이 크고 픽셀 룩과 어긋난다. 필요한 효과는 CSS로 충분 |
| canvas-confetti, auto-animate | 작고 안전하지만 지금 직접 쓴 코드와 큰 차이가 없다 |
| bitECS | MPL-2.0 |
| glicko2-lite / OpenSkill | 쓸 수 있으나 Elo를 바꾸면 기존 점수와 리그 기준을 다시 잡아야 한다. 신규 학생이 빨리 수렴하는 이점은 있어서, 대결이 많이 쌓이면 다시 검토할 만하다 |
| Pixel Frog Tiny Swords, Cup Nooble Sprout Lands | 재배포 금지 또는 비상업·크레딧 필수 |
| OGA "496 pixel art icons" | CC0 표기지만 과거 CC-BY/GPL 표기 이력이 있어 위험 |
| Pixabay 음악 | CC0가 아닌 자체 라이선스, 단독 재배포 금지 |
| MapleStory 등 상용 게임 에셋 | 저작권 때문에 쓸 수 없다 |

## 다음에 해 볼 만한 것

- 주간 대결 시즌과 시즌 보상(Postgres 윈도 함수로 충분)
- 팀 대항 대결(2:2)에 OpenSkill 검토
- 펫 키우기(먹이는 코인이 아니라 단어 복습으로)
- 교사용 학급 단어 목록 편집(지금은 초등 필수 영어 약 100개 고정)
