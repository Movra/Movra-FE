# Phase 9. Exam Cycle And Recovery Hardening

## 완료 범위

- 다음 시험 일정 단건 조회용 `getNextExamSchedule` API 클라이언트 함수를 추가했고, 404 응답을 `null`로 매핑한다 (`getDailyReflection`과 동일한 패턴).
- 현재 시즌 모드 조회용 `getSeasonMode` API 클라이언트 함수와 응답 타입 `SeasonModeResponse`를 추가했다. `SeasonMode` 유니언(`SUNUNG_INTENSIVE`, `NAESIN_INTENSIVE`, `MOPYUNG_FOCUSED`, `BASELINE_MODE`)을 도입했다.
- 시험 일정 단건 조회용 `getExamSchedule({ examScheduleId, token })` API 클라이언트 함수를 추가했다. 기존 단일 시험 PATCH/DELETE와 동일하게 raw `${examScheduleId}` interpolation을 사용한다.
- `queryKeys.nextExamSchedule()`, `queryKeys.seasonMode()`, `queryKeys.examSchedule(id)` 키 팩토리를 추가했다.
- FocusPage Recovery 모달에 시험 직후(`postExamMode === true`) 정보를 렌더링한다. 표시 필드는 시험명, 과목, 시험일, 경과(`daysSinceRecentExam`)이며, `recentExamTitle`/`recentExamDate`가 없을 때는 블록 자체를 렌더링하지 않는다.
- `daysSinceRecentExam` 표시 규칙: `null → "-"`, `0 → "오늘"`, `n → "${n}일 전"`. `recentExamSubject`가 null이면 `-`로 표시한다.

## 명세 근거

- API: Exam Schedule 16-3 (다음 시험), 16-4 (시즌 모드), 16-5 (시험 단건), Recovery Card 7-4 응답의 `postExamMode`/`recentExam*` 필드
- 기능명세: 5-2 시험 일정, 10. Recovery Card (POST_EXAM_RECOVERY)
- PRD: Phase 2 시험 사이클, B5
- 디자인: 기존 FocusPage Recovery 모달 레이아웃, `.recoveryMetrics` 카드 패턴

## 변경 파일

- `src/shared/queryKeys.ts`
- `src/shared/queryKeys.test.ts`
- `src/features/core-loop/types.ts`
- `src/features/planning-support/api.ts`
- `src/features/planning-support/api.test.ts`
- `src/pages/FocusPage.tsx`
- `src/pages/FocusPage.module.css`
- `src/pages/FocusPage.test.tsx`
- `docs/phase/phase-9-exam-cycle-recovery-hardening.md` (신규)
- `docs/phase/phase-plan.md`
- `docs/phase/README.md`

## 검증

- lint: `npm run lint` 통과
- typecheck: `npm run typecheck` 통과
- test: `npm test`, `24 passed`, `114 passed`
- build: `npm run build` 통과
- manual: 미실행

## 제외한 범위

- `getNextExamSchedule` / `getSeasonMode` UI 소비자 (홈/대시보드 노출은 Phase 9 범위 외, 사용자 승인 결정 a)
- `ExamSchedulesPage` UI 변경 (`getExamSchedule(id)`는 클라이언트 함수만 추가, 페이지는 기존 목록 조회 유지)
- CoreLoopDashboard의 시험 일정/Recovery 카드 변경
- `ExamSchedule.seasonMode` / `HomeToday.seasonMode` 타입을 `SeasonMode` 유니언으로 좁히는 작업 (백엔드 응답 검증 전이라 `string` 유지)
- `recentExamDate`의 표시 형식 보정 (`YYYY-MM-DD` 원문 그대로 노출)
- 캘린더 월간 뷰, 시험별 과목 세부 시간표, AI 시험 분석

## 남은 위험

- `getNextExamSchedule`, `getSeasonMode`, `getExamSchedule(id)`는 호출 코드가 아직 없다. 컴포넌트 통합 시 캐싱 키와 invalidate 시점을 별도 설계해야 한다.
- `SeasonMode` 유니언이 백엔드 enum과 어긋나면 `SeasonModeResponse` 파싱 후 사용자 코드에서 fallback이 필요할 수 있다. 현재는 응답 타입에서만 좁히고 기존 `seasonMode: string` 필드는 유지한다.
- Recovery 모달 post-exam 블록은 `recentExamTitle`과 `recentExamDate`가 모두 있을 때만 렌더링한다. 한쪽만 누락되어 들어오면 표시되지 않으니, 백엔드 응답 정합성에 의존한다.
- `daysSinceRecentExam` 한국어 라벨(`오늘`, `n일 전`)은 디자인 문서에 명시 라벨이 없어 합의된 임시값이다. 디자인 확정 시 라벨/포맷을 일괄 정렬해야 한다.
