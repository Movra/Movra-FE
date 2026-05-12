# Phase 10. Analytics Event Boundary

## 완료 범위

- Analytics Event API 경계를 Phase 10 명세 전체 이벤트 타입으로 확장했다.
- `POST /analytics/events` 기록 함수와 안전 기록 helper를 유지하고, `GET /analytics/events` 조회 함수를 추가했다.
- Analytics 기록 실패가 주요 사용자 흐름을 막지 않도록 모든 화면 연결은 `recordAnalyticsEventSafely`를 통해 처리했다.
- 온보딩 시작/스킵, Behavior Profile 생성, Future Vision 생성, TopPick 선택, Timetable Slot 생성, Focus Session 시작/완료/중단, Daily Reflection 생성, Tiny Win 생성, Recovery Card 조회/액션, 시험 일정 등록, Web Push opt-in, 학교 시간 무음 토글, Accountability 이벤트를 주요 성공 경계에 연결했다.
- 테스트 공통 MSW handler에 Analytics Event 기본 응답을 추가해 페이지 테스트가 analytics 호출 때문에 깨지지 않도록 했다.

## 명세 근거

- PRD: Activation Funnel, Appendix B Analytics Event Schema
- 기능명세: 17. Analytics
- API: Analytics Event 19-1~19-2

## 변경 파일

- `src/features/analytics/api.ts`
- `src/features/analytics/api.test.ts`
- `src/test/handlers.ts`
- `src/pages/OnboardingPage.tsx`
- `src/pages/FutureVisionPage.tsx`
- `src/pages/PlanningPage.tsx`
- `src/pages/TimetablePage.tsx`
- `src/pages/FocusPage.tsx`
- `src/features/core-loop/CoreLoopDashboard.tsx`
- `src/pages/ReflectionPage.tsx`
- `src/pages/ExamSchedulesPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/FocusPage.test.tsx`

## 검증

- focused test: `npm test -- src/features/analytics/api.test.ts src/pages/FocusPage.test.tsx src/pages/OnboardingPage.test.tsx src/pages/ReflectionPage.test.tsx src/pages/PlanningPage.test.tsx src/pages/SettingsPage.test.tsx src/pages/ExamSchedulesPage.test.tsx src/pages/FutureVisionPage.test.tsx src/pages/TimetablePage.test.tsx`, `9 passed`, `67 passed`
- test: `npm test`, `35 passed`, `182 passed`
- typecheck: `npm run typecheck` 통과
- lint: `npm run lint` 통과
- build: `npm run build` 통과. Vite chunk size warning만 발생했다.

## 제외한 범위

- 외부 분석 SDK
- Analytics 대시보드 시각화
- 이벤트 재전송 큐
- 인증 토큰이 없는 local signup 직후의 클라이언트 직접 기록. Local signup은 API 응답에 token이 없으므로 프론트에서는 임의 무인증 기록을 만들지 않았다.
- MorningTask 생성 이벤트 연결. 현재 노출된 화면에서 MorningTask 생성 흐름이 없어 잘못된 MindSweep 이벤트로 대체하지 않았다.

## 남은 위험

- Analytics properties는 화면 성공 경계에서 구성하므로, 백엔드 property validation 정책이 더 엄격해지면 일부 key 이름 조정이 필요할 수 있다.
- Recovery Card viewed 이벤트는 Focus 화면에서 카드 조회 성공 기준으로 1회 기록한다. 서버가 카드 식별자를 제공하지 않아 카드별 중복 제거는 하지 않는다.
- Web Push opt-in은 브라우저 권한 허용 및 subscription 등록 성공 후 기록한다. 권한 거부 이벤트는 현재 Phase 10 범위에 포함하지 않았다.
