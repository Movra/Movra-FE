# Phase 8. Feedback Loop

## 완료 범위

- `/reflection` placeholder를 실제 회고 화면으로 교체했다.
- 단일 페이지에 하루 회고 편집 영역과 작은 성취(Tiny Win) 목록 패널을 함께 배치했다.
- 하루 회고는 오늘 날짜로 기본 로드하고, 날짜 입력으로 다른 날짜의 회고를 조회·저장·수정할 수 있다.
- 같은 날짜에 회고가 이미 존재하면 409 응답을 폼 인라인 메시지로 표시하고, "다시 불러오기" 버튼으로 회고 query를 invalidate한다. 자동 PATCH는 하지 않는다.
- 작은 성취는 빈 상태 안내, 추가 모달, 수정 모달, 삭제 확인 모달을 제공한다. 제목과 내용은 별도 PATCH 엔드포인트로 변경된 값만 호출한다.
- Tiny Win 목록은 `localDate` 내림차순, 동일 날짜 내에서는 `tinyWinId`를 보조 키로 정렬한다.
- 입력 길이 제한은 API 명세대로 적용한다 (Tiny Win 제목 30, 내용 3000, Daily Reflection 잘한 점/If/Then 500, 무너진 지점 1000).
- Focus Session을 서버 프리셋으로 종료하면 성공 알림 아래에 `방금 집중을 잘 끝냈어요. 작은 성취 남기기 →` 링크와 닫기 버튼을 노출한다. 새 Focus 시작 시 자동으로 사라진다.
- `계속 Focus` 종료(로컬 타이머)에서는 Tiny Win 진입 링크를 노출하지 않는다.
- Recovery 모달에 `전체 회고 보기 →` 링크를 추가해 ReflectionPage로 이동할 수 있다.
- ReflectionPage가 `?focus=new` 쿼리 파라미터를 가지고 진입하면 Tiny Win 추가 모달이 자동으로 열리고 제목 입력에 포커스된다.
- API 클라이언트에 Tiny Win CRUD 6종 (`createTinyWin`, `getTinyWins`, `getTinyWin`, `updateTinyWinTitle`, `updateTinyWinContent`, `deleteTinyWin`)을 추가했다.
- `queryKeys.tinyWins`, `queryKeys.tinyWin` 키 팩토리를 추가했다.
- Daily Reflection 409 응답이 `ApiClientError` (`status: 409`)로 전달됨을 보장하는 계약 테스트를 추가했다.

## 명세 근거

- PRD: Hero Story #2 (실행 후 회고 루프)
- 기능명세: 11. Feedback (11-1 Tiny Win, 11-2 Daily Reflection)
- API: Tiny Win 10-1~10-6, Daily Reflection 11-1~11-3
- 디자인: 기존 AppSidebar, 모달, CSS token, ExamSchedulesPage/FocusPage 패턴

## 변경 파일

- `src/shared/queryKeys.ts`
- `src/shared/queryKeys.test.ts`
- `src/features/feedback/api.ts`
- `src/features/feedback/api.test.ts`
- `src/pages/ReflectionPage.tsx` (신규)
- `src/pages/ReflectionPage.module.css` (신규)
- `src/pages/ReflectionPage.test.tsx` (신규)
- `src/pages/FocusPage.tsx`
- `src/pages/FocusPage.module.css`
- `src/pages/FocusPage.test.tsx`
- `src/app/AppRoutes.tsx`
- `docs/phase/phase-8-feedback-loop.md` (신규)
- `docs/phase/phase-plan.md`
- `docs/phase/README.md`

## 검증

- lint: `npm run lint` 통과
- typecheck: `npm run typecheck` 통과
- test: `npm test`, `24 passed`, `108 passed`
- build: `npm run build` 통과
- manual: 미실행

## 제외한 범위

- AI 기반 If-Then 자동 추천
- 주간 미니 리포트
- Analytics Event 기록 (Phase 10에서 공통 처리 예정)
- Tiny Win 정렬/필터/검색 UI
- 회고 작성 후 알림(Push/STOMP) 연동

## 남은 위험

- 백엔드가 동일 날짜에 회고 중복 생성 시 409 외 다른 코드(예: 400)로 응답하면 별도 분기 매핑이 필요하다.
- Tiny Win 제목/내용 PATCH는 두 호출이 순차로 일어난다. 한쪽이 실패하면 부분 갱신 상태가 남으므로, 향후 통합 PATCH 또는 트랜잭션 보강이 필요할 수 있다.
- 날짜 변경 시 회고 query를 즉시 다시 가져오지만, `tinyWins` 목록은 전체 목록이라 큰 데이터에서 페이지네이션이 필요해질 수 있다.
- `?focus=new` 자동 모달은 진입 후 1회만 동작한다. 같은 페이지에서 쿼리 파라미터를 다시 set하더라도 재실행하지 않으니, 추후 흐름 추가 시 검토가 필요하다.
