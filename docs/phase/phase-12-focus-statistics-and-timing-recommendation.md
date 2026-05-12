# Phase 12. Focus Statistics And Timing Recommendation

## 완료 범위

- `/statistics` placeholder를 실제 Focus Statistics 화면으로 교체했다.
- 통계 화면은 Home Today를 먼저 조회해 인증 사용자 대시보드 레이아웃, AppSidebar, 온보딩 리다이렉트, 친구/시험 사이드바 문구를 기존 화면과 맞춘다.
- 기준일 `input type="date"`를 추가했다. 기본값은 Home Today의 `targetDate`이며, 날짜 변경 시 일간/주간/월간/시간대별 통계 API를 새 기준일로 다시 조회한다.
- Focus Statistics API 클라이언트를 추가했다.
  - `GET /focus-statistics/daily?targetDate=...`
  - `GET /focus-statistics/weekly?targetDate=...`
  - `GET /focus-statistics/monthly?targetDate=...`
  - `GET /focus-statistics/time-of-day?targetDate=...`
  - `GET /focus-statistics/timing-recommendation`
- 일간/주간/월간 요약 카드에 총 집중 시간, 일평균, 기간, 커버일, 집계 상태, 데이터 출처를 표시한다.
- 시간대별 집중 분포는 chart library 없이 CSS 막대 리스트로 구현했다. 데이터가 없으면 빈 상태를 보여준다.
- 순공 타이밍 추천 카드는 `basedOnData`에 따라 "최근 기록 기반" 또는 "프로필 기반"을 구분해서 보여준다.
- 추천 시간이 학교 시간 또는 22시 이후와 충돌하면 프론트에서 추천 목록에서 숨긴다.
  - `notificationPreference.schoolHoursQuietEnabled`가 켜져 있으면 서버가 내려준 `schoolHoursStart`/`schoolHoursEnd`를 사용한다.
  - 알림 설정이 없거나 학교 시간 무음이 꺼진 경우 기본 `08:00-15:00`을 학교 시간 정책으로 사용한다.
  - 22시 이후 시작 추천은 항상 숨긴다.
- 모든 추천이 정책과 충돌하거나 추천 데이터가 없으면 Behavior Profile 선호 집중 시간을 fallback 안내로 표시한다.
- Home Today의 `showFocusTimingCard`가 `true`일 때만 홈 대시보드에 "당신의 황금 시간대" CTA를 노출하고 `/statistics`로 연결한다.
- Focus Statistics용 React Query key factory를 추가했다.

## 명세 근거

- PRD: Hero Story #3, 학교 시간/수면 시간 추천 제외, 친구 비교 금지
- 기능명세: 15. Focus Statistics, 16. Home Today
- API: Focus Statistics 13-1~13-5 (`docs/API-specification.md`)
- 디자인: 기존 AppSidebar, Home/Settings dashboard layout, CSS token 기반 카드/상태 패턴

## 변경 파일

- `src/features/statistics/api.ts` (신규)
- `src/features/statistics/api.test.ts` (신규)
- `src/pages/StatisticsPage.tsx` (신규)
- `src/pages/StatisticsPage.module.css` (신규)
- `src/pages/StatisticsPage.test.tsx` (신규)
- `src/app/AppRoutes.tsx`
- `src/shared/queryKeys.ts`
- `src/features/core-loop/CoreLoopDashboard.tsx`
- `src/features/core-loop/CoreLoopDashboard.module.css`
- `src/features/core-loop/CoreLoopDashboard.test.tsx`
- `docs/phase/phase-12-focus-statistics-and-timing-recommendation.md` (신규)
- `docs/phase/phase-plan.md`
- `docs/phase/README.md`

## 검증

- focused test: `npx vitest run src/features/statistics/api.test.ts src/pages/StatisticsPage.test.tsx src/features/core-loop/CoreLoopDashboard.test.tsx`, `3 passed`, `14 passed`
- split unit/API test: `npx vitest run src/shared/queryKeys.test.ts src/shared/file/imageValidation.test.ts src/shared/api/client.test.ts src/features/auth/sessionStorage.test.ts src/features/auth/api.test.ts src/features/feedback/api.test.ts src/features/statistics/api.test.ts src/features/core-loop/api.test.ts src/features/core-loop/displayUtils.test.ts src/features/core-loop/topPickPolicy.test.ts src/features/notification/api.test.ts src/features/notification/vapidKey.test.ts src/features/onboarding/api.test.ts src/features/planning-support/api.test.ts src/features/planning-support/timetableUtils.test.ts`, `15 passed`, `71 passed`
- split app/page test: `npx vitest run src/app/App.test.tsx src/pages/LoginPage.test.tsx src/pages/SignupPage.test.tsx src/pages/OAuthProfileSetupPage.test.tsx src/pages/OnboardingPage.test.tsx src/pages/SettingsPage.test.tsx src/pages/StatisticsPage.test.tsx src/features/core-loop/CoreLoopDashboard.test.tsx`, `8 passed`, `41 passed`
- split page test: `npx vitest run src/pages/ExamSchedulesPage.test.tsx src/pages/FutureVisionPage.test.tsx src/pages/FocusPage.test.tsx src/pages/PlanningPage.test.tsx src/pages/ReflectionPage.test.tsx`, `5 passed`, `28 passed`
- split timetable test: `npx vitest run src/pages/TimetablePage.test.tsx`, `1 passed`, `14 passed`
- lint: `npm run lint` 통과
- typecheck: `npm run typecheck` 통과
- build: `npm run build` 통과
- full test: `npm test` 단일 실행은 6분 타임아웃으로 완료하지 못했다. 대신 위 split 실행으로 총 `29 passed`, `154 passed`를 확인했다.
- manual/server: Vite dev server가 `http://127.0.0.1:5173/statistics`에서 HTTP 200을 반환하는 것을 확인했다.

## 제외한 범위

- 주간 미니 리포트
- AI 리포트 분석 화면
- 차트 라이브러리 추가가 필요한 복잡한 시각화
- Web Push 추천 시간 예약 발송
- 익명 학년/지역 평균 또는 친구 비교 데이터
- Focus Statistics 관련 Analytics Event 기록
- Phase 완료 후 `phase-plan.md` 외 PRD/API/기능명세 본문 개정

## 남은 위험

- `timing-recommendation` API는 문서상 `targetDate` query가 없으므로 통계 화면의 기준일 선택과 독립적으로 현재 서버 기준 추천을 보여준다. 과거 날짜별 추천 탐색이 필요하면 API 확장이 필요하다.
- 학교 시간 충돌 필터는 프론트 방어 로직이다. 백엔드가 이미 정책을 지키더라도, 정책이 바뀌면 프론트의 기본값 `08:00-15:00`과 22시 이후 제외 기준도 같이 갱신해야 한다.
- CSS 막대 차트는 접근 가능한 텍스트 리스트와 함께 제공하지만, 복잡한 추세 분석이나 비교 시각화에는 한계가 있다.
- 실제 백엔드 서버와의 통합 연동은 문서 API shape을 기준으로 한 MSW/API 계약 테스트로 대체했다.
- `npm test` 전체 단일 실행은 이 환경에서 장시간 실행되어 타임아웃됐다. 회귀 검증은 split 실행 결과를 기준으로 남겼다.
