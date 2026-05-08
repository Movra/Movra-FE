# Phase 6. Future Vision And Exam Schedule

## 완료 범위

- `/future-vision` 보호 라우트를 추가하고, 기존 미사용 Planning Support 흐름의 Future Vision 기능을 실제 접근 가능한 화면으로 분리했다.
- Future Vision은 연간 목표와 주간 목표를 하나의 그림판 영역에서 탭으로 전환하며 작성하도록 구현했다.
- 탭별 canvas 상태, dirty 상태, undo stack을 분리해 연간/주간 그림을 독립적으로 편집할 수 있게 했다.
- 펜, 지우개, 색상 swatch, 굵기 slider, 되돌리기, 전체 지우기, 이미지 불러오기 도구를 제공했다.
- 생성 시 `weeklyVisionImageUrl`, `yearlyVisionImageUrl`, `yearlyVisionDescription` FormData 필드 계약을 유지했다.
- 기존 Vision이 있을 때 서버 이미지 preview와 주간/연간 수정 흐름을 제공했다.
- `/exam-schedules` 보호 라우트를 추가하고 시험 일정 목록, 생성, 수정, 삭제 UI를 구현했다.
- Exam Schedule은 현재 API 계약대로 `examType`, `title`, `subject`, `examDate` 단일 날짜 필드만 사용했다.
- 시험 목록을 `daysUntil >= 0` 다가오는 시험과 `daysUntil < 0` 지난 시험으로 분리하고, 지난 시험은 접을 수 있게 했다.
- 시험 카드에 시험 유형, 제목, 과목, 날짜, D-Day, 진행 bar, season mode를 표시했다.
- 생성/수정/삭제 성공 시 `exam-schedules`와 `home-today` query를 invalidate하도록 연결했다.
- Home Dashboard에 Future Vision 상태/CTA와 다음 시험 CTA를 추가했다.
- `AppSidebar`에 `비전`, `시험 일정` 메뉴를 추가했다.
- Phase 6 구현 이후 발견된 레이아웃 회귀를 수정했다.
  - 사이드바 하단 프로필/Accountability/로그아웃 카드가 nav와 겹치지 않도록 sidebar 높이와 nav 내부 스크롤을 조정했다.
  - Home Dashboard의 고정 row 높이 계산을 제거해 카드 잘림과 콘텐츠 스크롤 불능 문제를 수정했다.

## 명세 근거

- PRD: Hero Story #0-1
- 기능명세: 5-2. 시험 일정, 6. Future Vision, 16. Home Today
- API: Future Vision 12-1~12-6, Exam Schedule 16-1~16-7, Home Today 20-1
- 디자인: 사용자 제공 Future Vision/Exam Schedule 참고 이미지, 기존 CSS token 및 AppSidebar 패턴

## 변경 파일

- `src/app/AppRoutes.tsx`
- `src/features/core-loop/AppSidebar.tsx`
- `src/features/core-loop/AppSidebar.module.css`
- `src/features/core-loop/CoreLoopDashboard.tsx`
- `src/features/core-loop/CoreLoopDashboard.module.css`
- `src/features/core-loop/CoreLoopDashboard.test.tsx`
- `src/features/planning-support/api.test.ts`
- `src/pages/FutureVisionPage.tsx`
- `src/pages/FutureVisionPage.module.css`
- `src/pages/FutureVisionPage.test.tsx`
- `src/pages/ExamSchedulesPage.tsx`
- `src/pages/ExamSchedulesPage.module.css`
- `src/pages/ExamSchedulesPage.test.tsx`
- `docs/phase/phase-plan.md`
- `docs/phase/README.md`

## 검증

- API 계약 테스트: Future Vision FormData 필드명, Exam Schedule CRUD endpoint/method/body/Authorization header 검증
- UI 테스트: Future Vision 생성/수정 흐름, Exam Schedule 목록/생성/수정/삭제 흐름, Home Dashboard CTA 표시 검증
- focused test: `npm test -- src/pages/FutureVisionPage.test.tsx src/pages/ExamSchedulesPage.test.tsx src/features/planning-support/api.test.ts src/features/core-loop/CoreLoopDashboard.test.tsx`, `4 passed`, `10 passed`
- home regression test: `npm test -- src/features/core-loop/CoreLoopDashboard.test.tsx`, `1 passed`, `3 passed`
- test: `npm test`, `15 passed`, `52 passed`
- lint: `npm run lint` 통과
- typecheck: `npm run typecheck` 통과
- build: `npm run build` 통과
- agent verify: `.\scripts\agent-verify.ps1 -Mode quick` 통과, `0 warning(s)`
- manual: 사용자 캡처 기반으로 sidebar footer overlap과 Home Dashboard card clipping/scroll regression을 확인하고 CSS를 수정했다.

## 제외한 범위

- Exam Schedule 기간형 시험 표기
- 시험 일정 월간/캘린더 뷰
- 시험별 세부 과목 시간표
- AI 시험 분석
- Future Vision 이미지 저장 이후 서버 이미지 처리 방식 변경
- Analytics Event 기록

## 남은 위험

- Future Vision canvas는 브라우저 canvas 구현에 의존하므로 실제 기기별 pointer/이미지 업로드 상호작용은 추가 수동 QA가 필요하다.
- Exam Schedule은 백엔드의 단일 `examDate` 계약을 따른다. 기간형 시험 UX가 필요해지면 API 계약 변경이 먼저 필요하다.
- Home Dashboard는 카드 수가 늘어난 상태라 향후 Phase에서 카드가 더 추가되면 대시보드 정보 밀도와 접힘/섹션 분리 기준을 다시 조정해야 한다.
