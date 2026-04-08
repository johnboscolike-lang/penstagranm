## pen스타그램 프로젝트용 AGENTS.md

### 제품 성격

- 이 프로젝트는 교실형 인스타그램 데모다.
- 핵심은 4개의 고정 사진 슬롯, 댓글, 한국어 전사, 달력 일정이다.

### 기술 스택

- Next.js pages router
- TypeScript
- Prisma + SQLite
- Vitest

### 구현 원칙

- 게시글은 항상 4개의 사진 슬롯을 모두 채워야 한다.
- 함수에는 모두 JSDoc을 붙인다.
- `console.log` 대신 `src/utils/logger.ts`를 사용한다.
- 테스트 없는 로직 추가를 피한다.
- 커밋 메시지는 한국어를 기본으로 한다.

### 파일 가이드

- `src/pages/`: 화면과 API 라우트
- `src/components/`: UI 조합 컴포넌트
- `src/utils/`: 데이터, 날짜, 업로드, 로거
- `src/styles/`: 전역 스타일
- `prisma/`: 스키마와 시드
- `docs/`: PRD와 상세 명세

### 주의사항

- 녹음 전사는 브라우저 API 의존 기능이라 미지원 브라우저 폴백을 유지한다.
- 이미지 업로드는 `public/uploads`에 저장하고 DB에는 상대 경로를 저장한다.
- 달력은 날짜 선택과 일정 등록이 모두 한 페이지에서 되도록 유지한다.
