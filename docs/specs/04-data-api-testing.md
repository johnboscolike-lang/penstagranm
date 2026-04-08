# 상세 명세서 04: 데이터, API, 테스트

## 데이터 계층

- ORM: Prisma
- DB: SQLite
- 시드 데이터: 1개 게시글 + 댓글 2개 + 일정 3개

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

## 테스트 범위

- 달력 42칸 생성 로직
- 4개 슬롯 업로드 검증 로직
- 녹음/전사 브라우저 지원 감지 로직

## 품질 규칙

- 함수마다 JSDoc 추가
- `logger` 유틸리티로만 로그 출력
- 타입 안정성 유지
