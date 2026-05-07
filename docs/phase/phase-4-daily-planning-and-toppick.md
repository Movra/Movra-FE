# Phase 4. Daily Planning And TopPick

## 완료 범위

- `/planning` placeholder를 실제 Daily Planning 화면으로 교체했다.
- 계획 화면의 사용자 흐름을 `MindSweep -> TopPick 선정` 단계형 UX로 구성했다.
- 홈과 계획 화면의 사이드바가 서로 달라지지 않도록 공통 `AppSidebar` 컴포넌트를 도입했다.
- MindSweep 단계에서 할 일 목록 조회, 추가, 수정, 삭제, 완료, 완료 취소를 연결했다.
- MindSweep 할 일 추가는 서버 응답을 기다리지 않고 먼저 화면에 표시되도록 낙관적 업데이트를 적용했다.
- MindSweep 입력창은 고정된 위치를 유지하고, 목록 영역만 스크롤되도록 조정했다.
- TopPick 단계에서 MindSweep 항목 기반 선택, 예상 시간 선택, 메모 입력, 선택 해제 흐름을 구현했다.
- TopPick 선정 화면에서 텍스트 겹침과 스크롤 불가 문제를 수정했다.
- 토스트 알림은 1초 유지 후 페이드아웃되도록 변경했다.
- 홈의 `TopPick 추가` 링크가 실제 `/planning` 화면으로 이어지도록 연결했다.
- MorningTask API 경계와 계약 테스트는 추가했으나, 최종 UX 피드백에 따라 TopPick 선정 화면의 `내일 아침 첫 행동` 영역은 제거했다.

## 명세 근거

- PRD: Hero Story #0
- 기능명세: 7. Daily Plan
- API: Daily Plan 2-1~2-3, Mind Sweep 3-1~3-6, Top Picks 4-1~4-3, Morning Task 5-1~5-6
- 디자인: 사용자가 제공한 MindSweep 참고 이미지, TopPick 선정 참고 이미지, `docs/phase/Phase-추가적사항.md`

## 변경 파일

- `src/app/AppRoutes.tsx`
- `src/features/core-loop/AppSidebar.tsx`
- `src/features/core-loop/AppSidebar.module.css`
- `src/features/core-loop/CoreLoopDashboard.tsx`
- `src/features/core-loop/CoreLoopDashboard.module.css`
- `src/features/core-loop/api.ts`
- `src/features/core-loop/api.test.ts`
- `src/pages/PlanningPage.tsx`
- `src/pages/PlanningPage.module.css`
- `src/pages/PlanningPage.test.tsx`
- `vite.config.ts`

## 검증

- test: `npm test`, `11 passed`, `31 passed`
- typecheck: `npm run typecheck` 통과
- build: `npm run build` 통과
- lint: `npm run lint` 통과
- full: `.\scripts\agent-verify.ps1 -Mode full` 통과, warning 0
- manual: Vite dev server `http://127.0.0.1:5173` 응답 확인

## 제외한 범위

- Timetable Slot 배정
- Future Vision
- 시험 일정 CRUD
- Focus 상세 화면
- Reflection, Statistics, Study Room, Settings 실제 화면
- Analytics Event 기록
- 서버의 MindSweep 조회 순서 정렬 보장

## 남은 위험

- MindSweep 목록 순서가 서버 조회 응답 순서에 따라 섞이는 문제가 확인되었다. 프론트에는 입력 직후 순서를 보정하는 임시 처리가 있으나, 서버에서 생성 순서 또는 명시적 정렬 기준을 보장하는 것이 최종 해결책이다.
- MorningTask는 API 함수와 계약 테스트가 추가되어 있지만, 현재 `/planning` 최종 UX에서는 노출하지 않는다. MorningTask 화면을 다시 포함할지는 별도 UX 결정이 필요하다.
- 사용자 프로필 이름은 아직 실제 프로필 API가 아닌 임시 표시를 사용한다.
- TopPick은 현재 UX 요구에 맞춰 하루 1개 선택 흐름으로 제한했다. 서버 정책이 여러 개 선택을 허용하는 경우 정책 재확인이 필요하다.
- 모바일/짧은 화면에서는 자연 스크롤을 허용하도록 조정했지만, 실제 기기 QA는 Phase 16에서 별도 수행해야 한다.
