# pen스타그램

수업 준비, 수업 목표, 필기, 과제를 네 컷으로 올리고 댓글과 일정, 한국어 전사를 함께 관리하는 교실형 인스타그램 데모입니다.

## 주요 기능

- 네 개의 고정 사진 슬롯으로 게시글 업로드
- 게시글별 댓글 작성
- 브라우저 기반 오디오 녹음 + 한국어 전사
- 월간 캘린더 일정 관리
- Prisma + SQLite 기반 로컬 데이터 저장

## 실행 방법

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 피드 페이지가, `http://localhost:3000/calendar`를 열면 일정 페이지가 보입니다.

## 테스트와 빌드

```bash
npm run test
npm run build
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
├── components/    # 피드, 댓글, 캘린더, 녹음 UI 컴포넌트
├── pages/         # 페이지 및 API 라우트
├── utils/         # 데이터, 날짜, 업로드, 로거 유틸리티
└── styles/        # 전역 스타일
```
