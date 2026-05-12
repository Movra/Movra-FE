# Phase 15. Accountability

## 완료 범위

- `/accountability` 보호 라우트를 추가하고 친구 감시 화면을 구현했다.
- 친구 감시 관계 생성, 초대 코드 상태 조회, 초대 코드 재발급, 초대 코드 참여, 공개 범위 수정, watcher/watching 관계 해제를 API 계약에 연결했다.
- 감시자용 Focus Session, TopPick, Timetable Task 단일 날짜/기간 요약 조회를 연결했다.
- 기간 요약 조회에서 시작일이 종료일보다 늦은 요청은 API 호출 전에 차단한다.
- API 문서에 요약 응답 필드가 없으므로, 서버가 내려주는 객체를 generic key/value 요약으로 표시하고 민감한 식별자 키는 숨겼다.
- `204 No Content` 요약 응답은 정상 empty 상태로 처리한다.
- `ACCOUNTABILITY_INVITE_SENT`, `ACCOUNTABILITY_FRIEND_JOINED` Analytics Event 기록 helper를 추가했고, analytics 실패가 주요 흐름을 막지 않게 했다.
- 사이드바에 기존 스터디룸과 별도로 "친구 감시" 진입점을 추가했다.

## 명세 근거

- PRD: 친구 Accountability opt-in, 랭킹/비교/부모 감시 금지
- 기능명세: 13. Accountability
- API: Accountability 15-1~15-14, Analytics Event 19-1
- 디자인: 기존 dashboard/AppSidebar 레이아웃과 green token 기반 화면

## 변경 파일

- `src/app/AppRoutes.tsx`
- `src/features/core-loop/AppSidebar.tsx`
- `src/features/accountability/api.ts`
- `src/features/accountability/api.test.ts`
- `src/features/accountability/types.ts`
- `src/features/analytics/api.ts`
- `src/features/analytics/api.test.ts`
- `src/pages/AccountabilityPage.tsx`
- `src/pages/AccountabilityPage.module.css`
- `src/pages/AccountabilityPage.test.tsx`
- `src/shared/queryKeys.ts`
- `src/shared/queryKeys.test.ts`
- `docs/phase/phase-15-accountability.md`
- `docs/phase/phase-plan.md`
- `docs/phase/README.md`

## 검증

- focused test: `npm test -- src/features/accountability/api.test.ts src/features/analytics/api.test.ts src/pages/AccountabilityPage.test.tsx src/shared/queryKeys.test.ts`, `4 passed`, `11 passed`
- test: `npm test`, `35 passed`, `179 passed`
- typecheck: `npm run typecheck` 통과
- lint: `npm run lint` 통과
- build: `npm run build` 통과

## 제외한 범위

- 부모/교사 대시보드
- 친구 랭킹, 공개 피드, DM
- 친구 이름/프로필 조회. 현재 API 응답에는 사용자 표시명이 없으므로 화면은 "연결된 친구" 중심으로 표시한다.
- 감시자 요약 응답의 전용 차트/도메인별 세부 UI. API 응답 필드가 확정되면 별도 보강한다.

## 남은 위험

- `DailyFocusSummaryView`, `DailyTopPicksSummaryView`, `DailyTimetableSummaryView`의 실제 JSON 필드가 API 문서에 없다. 현재는 generic summary로 안전하게 표시한다.
- 초대 코드 상태 조회는 문서상 `expiredAt`, 재발급 응답은 `expiresAt`를 사용한다. 프론트는 문서 그대로 분리해서 모델링했다.
- 전체 테스트는 로컬 샌드박스에서 Vite config 로딩 중 `spawn EPERM`이 발생해, 권한 상승 실행으로 검증했다.
