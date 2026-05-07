# Phase 5. Timetable

## 완료 범위

- `/timetable` placeholder를 실제 Timetable 화면으로 교체했다.
- Home Today로 오늘 DailyPlan을 확인한 뒤 `GET /timetables?dailyPlanId=...`와 `GET /daily-plans/{dailyPlanId}/top-picks`로 시간표와 TopPick 목록을 조회한다.
- TopPick Slot 배정, 일반 Task Slot 배정, 직접 Slot 추가를 연결했다.
- MindSweep/TopPick 작업을 우측 Drag & Drop 패널에서 시간표로 배치할 수 있게 했다.
- 시간축은 00:00부터 24:00까지 고정 표시한다.
- Slot 이동, 시작/종료 리사이즈, 겹침 방지 검증을 연결하고, pointer 이동 중에는 React 상태 갱신 없이 DOM 위치만 갱신해 드래그 반응 지연을 줄였다.
- Slot 배치/이동/삭제/재배정/완료 상태는 서버 응답 전에 React Query 캐시에 먼저 반영하고, 실패 시 이전 상태로 롤백한다.
- 시간 블록 직접 추가는 인라인 폼 대신 모달에서 입력하도록 바꿨다.
- 시간 블록 추가 버튼은 우측 Drag & Drop 작업 패널 하단에 배치했다.
- Slot 시간 수정, 삭제, 재배정, MindSweep 완료/완료 취소를 연결했다.
- mutation 성공 후 `home-today`와 `timetable` query를 갱신해 홈의 시간표 요약이 최신 Slot 상태를 반영하도록 했다.
- 성공/오류 토스트는 표시 후 1.5초 뒤 페이드아웃되며 DOM에서 제거된다.
- 일반 할 일 카드는 TopPick 배정 상태와 무관하게 드래그/선택할 수 있고, TopPick 우선 배정 검증은 서버 응답을 최종 기준으로 처리한다.
- TopPick 배정 직후 일반 할 일을 바로 배치하는 경우에는 TopPick 슬롯 배정 요청이 끝난 뒤 일반 할 일 배정 요청을 보내도록 순서를 보장한다.
- `home/today`의 TopPick 요약이 늦거나 누락될 수 있어, 시간표 화면의 배치 목록은 DailyPlan TopPick 전용 조회 결과를 우선 사용한다.
- `timetable: null`일 때 DailyPlan-Timetable 백엔드 계약 확인 메시지를 표시한다.
- 사용자가 제공한 시간표 참고 이미지에 맞춰 사이드바 + 날짜 바 + 시간 축/블록 중심 UI로 구성하고, 계획된 총 시간은 헤더의 간결한 배지로 표시한다.

## 명세 근거

- PRD: Hero Story #0-1
- 기능명세: 8. Timetable
- API: Timetable 6-1~6-6

## 변경 파일

- `src/app/AppRoutes.tsx`
- `src/features/planning-support/api.test.ts`
- `src/pages/TimetablePage.tsx`
- `src/pages/TimetablePage.module.css`
- `src/pages/TimetablePage.test.tsx`
- `docs/phase/phase-plan.md`

## 검증

- focused test: `npx vitest run src/pages/TimetablePage.test.tsx src/features/planning-support/api.test.ts`, `2 passed`, `3 passed`
- lint: `npm run lint` 통과
- typecheck: `npm run typecheck` 통과
- test: `npm test`, `13 passed`, `34 passed`
- build: `npm run build` 통과

## 제외한 범위

- 캘린더 월간 뷰
- 다른 날짜의 실제 조회/이동
- 시험별 세부 시간표
- 계획 복사 기능
- Analytics Event 기록

## 남은 위험

- 날짜 이동과 `다른 날짜` 버튼은 Phase 범위 밖이라 UI affordance만 남겨두었다.
- Home Today의 `timetable`이 `null`이어도 별도 Timetable 조회가 성공할 가능성은 열어두었지만, 기본 화면은 명세대로 백엔드 계약 확인 메시지를 우선 보여준다.
- TopPick 우선 배정 제한은 백엔드 에러 계약을 최종 기준으로 처리한다. 프론트는 일반 할 일 드래그 자체를 막지 않는다.
