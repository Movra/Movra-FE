# Phase 7. Focus And Recovery

## 완료 범위

- `/focus` placeholder를 실제 Focus 화면으로 교체했다.
- Focus 화면을 큰 타이머 중심 UX로 구성하고, 프리셋 선택, Focus 시작, Focus 멈추기 흐름을 연결했다.
- `3/5/10/25분` Focus는 기존 서버 Focus Session API로 기록하고, `계속` Focus는 서버 요청 없이 임시 로컬 타이머로 동작한다.
- 오늘 Focus Session 조회 결과를 기준으로 진행 중 세션, 총 집중 시간, 최근 세션 목록을 표시했다.
- 진행 중 세션은 `queriedAt`과 `elapsedSeconds`를 기준으로 00:00부터 증가하는 화면 타이머를 1초 단위로 갱신한다.
- 임시 `계속` Focus는 00:00부터 증가하며, 잠시 멈춤, 다시 흐르게, 시간 초기화를 제공한다.
- Recovery Card는 Focus 본문을 차지하지 않도록 보조 진입 카드와 모달로 구성했다.
- Recovery `START`는 모달에서 action 기록 후 추천 시간으로 Focus를 즉시 시작한다. 허용 프리셋이 아니면 5분으로 시작한다.
- Recovery `REFLECT`는 모달 안에서 Daily Reflection 생성 API로 회복 기록을 실제 저장하고, 저장 후 같은 날짜 기록을 다시 조회해 모달에 표시하며 수정할 수 있다.
- Recovery `DISMISS`는 action 기록 후 모달을 닫고 해당 카드를 현재 화면에서 숨긴다.
- Focus 시작/종료/Recovery action 성공 시 `home-today`, `focus-sessions/today`, `recovery-card` query를 갱신해 홈 CTA와 `/focus` 상태가 어긋나지 않게 했다.

## 명세 근거

- PRD: Hero Story #2, 3/5/10/25분 Focus Session, Recovery Card
- 기능명세: 9. Focus Session, 10. Recovery Card
- API: Focus Session 7-1~7-5, Daily Reflection 11-1~11-3
- 디자인: 기존 AppSidebar, 캐릭터 이미지, CSS token 기반 대시보드 패턴

## 변경 파일

- `src/app/AppRoutes.tsx`
- `src/features/core-loop/CoreLoopDashboard.tsx`
- `src/features/core-loop/api.ts`
- `src/features/core-loop/api.test.ts`
- `src/features/feedback/api.ts`
- `src/features/feedback/api.test.ts`
- `src/pages/FocusPage.tsx`
- `src/pages/FocusPage.module.css`
- `src/pages/FocusPage.test.tsx`
- `src/shared/queryKeys.ts`
- `src/shared/queryKeys.test.ts`
- `docs/phase/README.md`
- `docs/phase/phase-plan.md`

## 검증

- focused test: `npm test -- src/pages/FocusPage.test.tsx src/features/feedback/api.test.ts src/shared/queryKeys.test.ts`, `3 passed`, `12 passed`
- previous focused test: `npm test -- src/pages/FocusPage.test.tsx src/features/core-loop/api.test.ts src/shared/queryKeys.test.ts`, `3 passed`, `11 passed`
- lint: `npm run lint` 통과
- typecheck: `npm run typecheck` 통과
- test: `npm test`, `23 passed`, `86 passed`
- build: `npm run build` 통과
- manual: 미실행

## 제외한 범위

- Tiny Win 작성
- Daily Reflection 전체 화면
- 서버에 기록되는 `계속` Focus Session
- Focus Statistics
- Web Push opt-in
- Focus 시작 API 실패 시 로컬 오프라인 타이머 fallback
- 서버 polling 기반 자동 동기화

## 남은 위험

- Focus 진행 중 장시간 탭을 열어둔 경우 서버 재조회 없이 클라이언트 표시만 증가한다. 정확한 서버 기준 재동기화 정책은 별도 Phase에서 정해야 한다.
- `계속` Focus는 현재 임시 로컬 타이머라 새로고침하거나 화면을 벗어나면 기록이 사라지고, 오늘 기록/홈 CTA에도 반영되지 않는다. 서버 API가 추가되면 실제 Focus Session으로 교체해야 한다.
- 실제 모바일 기기에서 타이머 화면의 thumb-zone과 캐릭터/텍스트 밀도는 추가 수동 QA가 필요하다.
