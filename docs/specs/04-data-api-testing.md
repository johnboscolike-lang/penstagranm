# 상세 명세서 04: 데이터, API, 테스트

## 데이터 계층

- ORM: Prisma
- DB: SQLite
- 시드 데이터: 3팀 12명(도토리가 데모 플레이어), 최근 5주 약속 기록, 게시글 4개 + 댓글, 오늘 기준 상대 날짜 일정 5개, 앞마당 아이템 2개

## API 라우트

- `POST /api/posts`
  - multipart form
  - 4개 사진과 텍스트 저장
- `POST /api/comments`
  - JSON body
  - 게시글 댓글 저장
- `POST /api/schedule`
  - JSON body
  - 캘린더 일정 저장
- `POST /api/promise-units`, `POST /api/shop`, `GET /api/sprites/[name].svg`
  - 우리반퀘스트 약속 칸 기록, 앞마당 구매, 도트 스프라이트 (명세 05 참고)

## 테스트 범위

- 달력 42칸 생성 로직
- 4개 슬롯 업로드 검증 로직
- 녹음/전사 브라우저 지원 감지 로직
- 점수·XP·코인·레벨·주간 순위·보상권·폭풍성장 계산 (`quest-rules`, `quest-board`)
- 날짜(Asia/Seoul 주차) 계산, 학교 정보 패널 데이터, 도트 캔버스·스프라이트 생성
- 임시 SQLite로 약속 칸 중복 방지, 지난 약속 잠금, 구매 시 XP 유지 (`quest-repository`)

## 품질 규칙

- 함수마다 JSDoc 추가
- `logger` 유틸리티로만 로그 출력
- 타입 안정성 유지
