# Movrara Frontend Phase Plan

최종 재정리일: 2026-05-06

기준 문서:
- `docs/prd.md`
- `docs/API-specification.md`
- `docs/FEATURE-SPECIFICATION.md`
- `docs/frontend-conventions.md`
- `docs/design.md`

기준 환경:
- API base URL: `http://localhost:8080`
- Frontend stack: React + TypeScript + Vite

## 계획 원칙

- Phase는 사용자가 실제로 접근 가능한 기능 단위로 나눈다.
- "API 함수가 있다" 또는 "컴포넌트 파일이 있다"만으로 완료 처리하지 않는다.
- 완료 기준은 라우트, 화면, API 호출, 상태 처리, 테스트가 모두 연결된 상태다.
- 기존 완료 기록은 `docs/phase/phase-legacy.md`에 보존한다. 현재 실행 계획은 이 문서를 기준으로 한다.
- 과거 기록과 현재 코드가 다르면 현재 코드가 우선이다.
- `API-specification.md`와 `FEATURE-SPECIFICATION.md`에 없는 기능은 임의 API나 mock-only UX로 만들지 않는다.
- Phase 종료 전에는 관련 테스트와 `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`를 실행한다.
- 검증을 실행하지 못한 항목은 성공 증거가 아니라 제한사항으로 기록한다.

## 상태 기준

- 완료: 사용자가 접근 가능한 화면과 주요 동작이 구현되어 있고 테스트/빌드 검증이 끝난 상태.
- 현재: 지금 바로 처리해야 하는 Phase.
- 미구현: 라우트가 placeholder이거나 화면/API 흐름이 없는 상태.
- 부분 구현: 파일, 타입, API 함수, 과거 컴포넌트는 있으나 사용자가 접근할 수 없는 상태.
- 차단: 명세나 운영 정책이 부족해 구현하면 안 되는 상태.

## 현재 코드 기준 스냅샷

사용자가 접근 가능한 화면:
- `/login`
- `/signup`
- `/oauth/profile-setup`
- `/onboarding`
- `/`
- `/planning`
- `/timetable`
- `/future-vision`
- `/exam-schedules`

현재 제품 기능 상태:
- App Foundation, Auth, Onboarding은 구현되어 있다.
- 홈 대시보드는 구현되어 있다. Home Today 조회, 요약 카드, TopPick 표시, Future Vision/다음 시험 CTA, 시간표 요약 표시, 알림/친구 상태 요약 표시, Focus 시작/종료 CTA가 있다.
- Daily Planning과 TopPick 선정 화면은 구현되어 있다. MindSweep 기반 입력/정리 후 TopPick 하나를 선택하는 단계형 흐름이다.
- Timetable 화면은 구현되어 있다. TopPick/일반 할 일/직접 입력 Slot 배정, Slot 시간 수정/삭제, 빈 timetable 계약 확인 상태가 있다.
- Future Vision과 Exam Schedule 화면은 구현되어 있다. Future Vision canvas 작성/수정과 시험 일정 목록/생성/수정/삭제 흐름이 있다.
- 그 외 제품 기능 화면은 아직 미구현이다.

현재 placeholder 라우트:
- `/focus`
- `/reflection`
- `/statistics`
- `/friends`
- `/settings`

부분 구현이지만 완료가 아닌 것:
- `src/features/core-loop/api.ts`에는 Recovery Card action API 함수가 있으나 현재 홈 UI에서 직접 사용되지 않는다.
- `src/features/planning-support/PlanningSupportPanel.tsx`는 존재하지만 현재 라우트나 홈에서 렌더링되지 않는다. `api.ts`의 Timetable 함수는 `/timetable`에서 사용한다.
- Home Today 타입에는 `notificationPreference`, `friendAccountability`, 시험 후 Recovery 필드, `showFocusTimingCard`가 반영되어 있으나 독립 기능 화면과 mutation은 없다.

현재 작업 순서:
- 다음 구현 대상은 Phase 7 `Focus And Recovery`이다.
- 이후 Phase 8 `Feedback Loop` 순서로 홈의 링크와 실제 기능을 연결한다.

## Phase 0. App Foundation

상태: 완료

레거시 기록:
- `docs/phase/phase-legacy.md`의 `Legacy Phase 0. App Foundation`

목표:
- 기능 구현 전에 React 앱 골격, 검증 스크립트, 디자인 토큰, API 통신 경계를 만든다.

완료 범위:
- Vite React TypeScript 프로젝트 구성
- React Router, TanStack Query, Vitest, Testing Library, MSW 구성
- CSS Modules와 전역 토큰 기반 스타일 구성
- 공통 API client, ErrorResponse 처리, Bearer 인증 헤더 처리
- 기본 앱 shell과 라우팅

완료 조건:
- 기본 앱이 로컬에서 실행된다.
- `test`, `typecheck`, `build`, `lint` 스크립트가 존재한다.
- 공통 API client가 `http://localhost:8080`을 기본 대상으로 사용한다.

## Phase 1. Auth And Session

상태: 완료

레거시 기록:
- `docs/phase/phase-legacy.md`의 `Legacy Phase 1. Auth And Session`

목표:
- 인증이 필요한 기능을 위해 회원가입, 로그인, OAuth 프로필 설정, 토큰 보관, 보호 라우팅을 구현한다.

완료 범위:
- 로컬 회원가입: `POST /auth/signup`
- 로그인: `POST /auth/login`
- OAuth 프로필 설정: `POST /auth/oauth/profile-setup?pendingToken=...`
- 토큰 재발급: `POST /auth/reissue`
- Access Token과 Refresh Token 저장/조회/삭제
- Access Token 만료 시 refresh token 재발급 후 원 요청 재시도
- 재발급 실패 시 토큰 삭제와 `/login` 이동
- 보호 라우트와 비인증 라우트 분리

남은 보강:
- 사용자 프로필 조회 API가 생기면 실제 사용자 이름/프로필 표시 연동
- OAuth 시작 URL이 백엔드 실제 경로와 다르면 조정

완료 조건:
- 유효한 계정으로 로그인하면 보호 화면에 진입한다.
- 로그인 실패 시 API ErrorResponse 기반 오류가 표시된다.
- 인증 요청에 Bearer 헤더가 붙는다.
- 만료된 access token 요청은 재발급 후 1회 재시도된다.

## Phase 2. Onboarding And Behavior Profile

상태: 완료

레거시 기록:
- `docs/phase/phase-legacy.md`의 `Legacy Phase 1 Refactor. Onboarding Design`

목표:
- 첫 진입 장벽을 낮추기 위해 온보딩 컨텍스트와 Behavior Profile을 회원가입/로그인 직후 흐름에 연결한다.

완료 범위:
- `/onboarding` 보호 라우트
- 온보딩 컨텍스트 조회: `GET /auth/onboarding-context`
- Behavior Profile 생성/조회/수정 API 경계
  - `POST /behavior-profiles`
  - `GET /behavior-profiles/me`
  - `PUT /behavior-profiles/me`
- Home Today 응답의 `behaviorProfile`이 `null`이면 온보딩 이동
- 6단계 온보딩 UI와 기본값 기반 건너뛰기
- 실제 Movra 캐릭터 이미지 기반 온보딩 디자인

남은 보강:
- 로그인 직후 Home Today 조회 실패와 Behavior Profile 없음 상태 분리
- 기존 사용자가 Behavior Profile을 수정할 수 있는 설정 화면
- 온보딩 시작/완료/스킵 Analytics Event 기록

완료 조건:
- Behavior Profile이 없는 인증 사용자는 홈 대신 온보딩으로 이동한다.
- 사용자는 온보딩 답변 또는 기본값으로 Behavior Profile을 생성할 수 있다.
- 생성 성공 후 홈으로 이동한다.

## Phase 3. Home Dashboard

상태: 완료

레거시 기록:
- `docs/phase/phase-legacy.md`의 `Legacy Phase 2. Home Today And Core Loop`

정정:
- 과거 기록에는 MindSweep/TopPick/Recovery Card action까지 완료된 것처럼 남아 있으나, 현재 사용자 관점에서는 홈 대시보드가 중심이다.
- 현재 완료로 보는 범위는 홈 표시와 Focus 시작/종료 CTA까지다.
- Planning, Timetable, Focus 상세, Reflection 등 홈에서 이동하는 기능은 아직 placeholder다.

목표:
- 사용자가 로그인 후 오늘 상태를 한 화면에서 보고 다음 행동으로 이동할 수 있는 홈 대시보드를 제공한다.

완료 범위:
- `GET /home/today` 기반 홈 조회
- Home Today 응답의 주요 필드 표시
- TopPick 카드 표시
- 오늘 시간표 요약 표시
- Recovery 안내 카드 표시
- 알림 설정/친구 Accountability 요약 표시
- Focus Session 시작/종료 CTA
- loading/error/empty/success 상태 일부 처리
- 실제 Movra 로고와 캐릭터를 홈 화면에 반영

남은 보강:
- 홈의 각 링크가 실제 기능 화면으로 이동하도록 연결
- Recovery Card action 기록 UI 연결
- Focus 진행 중 실시간 타이머
- 사용자 프로필 기반 실제 이름 표시
- 핵심 행동별 Analytics Event 기록

완료 조건:
- 인증 사용자가 `/`에서 오늘 상태를 볼 수 있다.
- Focus 시작/종료 CTA를 사용할 수 있다.
- 미구현 기능은 placeholder로 분리되어 있고 홈 자체는 깨지지 않는다.

## Phase 4. Daily Planning And TopPick

상태: 완료

완료 기록:
- `docs/phase/phase-4-daily-planning-and-toppick.md`

목표:
- `/planning` placeholder를 실제 계획 화면으로 교체하고, 핵심 행동 선택 흐름을 완성한다.

기존 Phase와의 관계:
- 과거 `Legacy Phase 2. Home Today And Core Loop`의 MindSweep/TopPick 항목을 현재 코드 기준으로 다시 구현 완료 처리해야 한다.
- 과거 `Legacy Phase 3. Planning Support`에 섞여 있던 MorningTask는 이 Phase에서 다룬다.

포함 범위:
- `/planning` 실제 화면 구현
- 오늘 DailyPlan 조회 또는 Home Today 데이터 재사용
- MindSweep 목록/추가/수정/삭제/완료/완료 취소
- MorningTask API 함수와 계약 테스트
- TopPick 조회/선택/해제
- TopPick 예상 시간과 메모 입력
- 홈의 `TopPick 추가` 링크를 실제 `/planning` 화면으로 연결
- loading/error/empty/success 상태

제외 범위:
- Timetable Slot 배정
- Future Vision
- 시험 일정 CRUD
- MorningTask UI 노출. 최종 UX 피드백에 따라 TopPick 선정 화면의 `내일 아침 첫 행동` 영역은 제거했다.
- Analytics Event 기록은 Phase 10에서 공통 처리

명세 근거:
- API: Daily Plan 2-1~2-3, Mind Sweep 3-1~3-6, Top Picks 4-1~4-3, Morning Task 5-1~5-6
- 기능명세: 7. Daily Plan
- PRD: Hero Story #0

완료 조건:
- 사용자는 `/planning`에서 오늘 떠오른 일을 적고 정리할 수 있다.
- 사용자는 오늘의 TopPick을 선택/해제할 수 있다.
- 홈의 TopPick 카드가 mutation 후 최신 상태를 반영한다.

검증:
- MindSweep API 계약 테스트
- MorningTask API 계약 테스트
- TopPick 선택/해제 테스트
- `/planning` 사용자 흐름 테스트
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Phase 5. Timetable

상태: 완료

목표:
- `/timetable` placeholder를 실제 시간표 화면으로 교체하고, TopPick과 할 일을 시간 블록에 배정할 수 있게 한다.

기존 Phase와의 관계:
- 과거 `Legacy Phase 3. Planning Support`의 Timetable 부분을 별도 기능 Phase로 분리한다.

포함 범위:
- `/timetable` 실제 화면 구현
- Timetable 조회: `GET /timetables?dailyPlanId=...`
- TopPick Slot 배정
- 일반 Task Slot 배정
- 직접 Slot 추가
- Slot 시간 수정
- Slot 삭제
- 홈의 `오늘의 시간표` 전체 보기 링크 연결
- Timetable이 `null`일 때 빈 상태와 백엔드 계약 확인 메시지 처리

제외 범위:
- 캘린더 월간 뷰
- 시험별 세부 시간표
- Analytics Event 기록은 Phase 10에서 공통 처리

명세 근거:
- API: Timetable 6-1~6-6
- 기능명세: 8. Timetable
- PRD: Hero Story #0-1

완료 조건:
- 사용자는 TopPick 또는 일반 할 일을 시간 블록에 배정할 수 있다.
- 사용자는 직접 시간 블록을 만들고 수정/삭제할 수 있다.
- 홈 시간표 요약이 최신 Slot 상태를 반영한다.

검증:
- Timetable API 계약 테스트
- Slot 배정/수정/삭제 UI 테스트
- 빈 timetable 상태 테스트

## Phase 6. Future Vision And Exam Schedule

상태: 완료

완료 기록:
- `docs/phase/phase-6-future-vision-and-exam-schedule.md`

목표:
- 계획 보조 기능 중 Future Vision과 Exam Schedule을 실제 접근 가능한 화면으로 구현한다.

기존 Phase와의 관계:
- 과거 `Legacy Phase 3. Planning Support`의 Future Vision과 Exam Schedule 부분을 별도 기능 Phase로 분리한다.

포함 범위:
- Future Vision 생성/조회/주간 수정/연간 수정
- Future Vision 이미지 업로드 FormData 연결
- Exam Schedule 목록 조회
- Exam Schedule 생성/수정/삭제
- 다음 시험 일정 표시
- 시즌 모드 표시
- Home Today의 `futureVision`, `seasonMode`, `nextExamSchedule` 표시와 연결

제외 범위:
- 시험 일정 단건 상세 독립 화면
- 시험 직후 Recovery 강화는 Phase 9에서 처리
- AI 시험 분석

명세 근거:
- API: Future Vision 12-1~12-6, Exam Schedule 16-1~16-7, Home Today 20-1
- 기능명세: 5-2. 시험 일정, 6. Future Vision, 16. Home Today
- PRD: Hero Story #0-1

완료 조건:
- 사용자는 Future Vision을 만들고 수정할 수 있다.
- 사용자는 시험 일정을 만들고 수정/삭제할 수 있다.
- 홈과 계획 흐름에 다음 시험과 Vision 상태가 표시된다.

검증:
- Future Vision API 계약 테스트
- Exam Schedule API 계약 테스트
- 이미지 업로드 FormData 테스트
- 홈 반영 테스트

## Phase 7. Focus And Recovery

상태: 미구현

목표:
- `/focus` placeholder를 실제 집중 화면으로 교체하고, 홈 CTA 수준을 넘는 Focus Session과 Recovery 흐름을 구현한다.

포함 범위:
- `/focus` 실제 화면 구현
- 오늘 Focus Session 조회
- Focus Session 시작/종료
- 진행 중 세션 표시
- 실시간 또는 주기 갱신 타이머
- Recovery Card 조회
- Recovery Card action 기록: `START`, `REFLECT`, `DISMISS`
- Recovery Card START를 Focus 시작으로 연결할지 정책 반영
- 홈 Focus CTA와 `/focus` 화면 상태 동기화

제외 범위:
- Tiny Win 작성
- Daily Reflection 작성
- Focus Statistics

명세 근거:
- API: Focus Session 7-1~7-5
- 기능명세: 9. Focus Session, 10. Recovery Card
- PRD: Hero Story #2

완료 조건:
- 사용자는 `/focus`에서 집중을 시작/종료하고 진행 상태를 볼 수 있다.
- Recovery Card action이 기록된다.
- 홈과 `/focus`의 진행 상태가 서로 어긋나지 않는다.

검증:
- Focus Session API 계약 테스트
- 진행 중/종료 상태 UI 테스트
- Recovery Card action 테스트

## Phase 8. Feedback Loop

상태: 미구현

목표:
- `/reflection` placeholder를 실제 회고 화면으로 교체하고, 실행 직후 보상과 회고 루프를 완성한다.

포함 범위:
- Tiny Win 생성/목록/상세/제목 수정/내용 수정/삭제
- Daily Reflection 생성/조회/수정
- Focus Session 종료 후 Tiny Win 작성 진입점
- Recovery Card REFLECT 후 Daily Reflection 진입점
- 같은 날짜 중복 회고 오류 표시
- loading/error/empty/success 상태

제외 범위:
- AI If-Then 자동 추천
- 주간 미니 리포트
- Analytics Event 기록은 Phase 10에서 공통 처리

명세 근거:
- API: Tiny Win 10-1~10-6, Daily Reflection 11-1~11-3
- 기능명세: 11. Feedback
- PRD: Hero Story #2

완료 조건:
- 사용자가 Focus 이후 작은 성취를 남길 수 있다.
- 사용자가 특정 날짜의 회고와 If-Then 계획을 생성/수정할 수 있다.
- 중복 회고 오류가 명확히 표시된다.

검증:
- Tiny Win API 계약 테스트
- Daily Reflection API 계약 테스트
- Focus 종료 후 Tiny Win 진입 테스트
- Recovery REFLECT 후 Daily Reflection 진입 테스트

## Phase 9. Exam Cycle And Recovery Hardening

상태: 미구현

목표:
- 시험 일정과 Recovery Card를 시험 사이클에 맞게 보강한다.

포함 범위:
- 다음 시험 일정 조회: `GET /exam-schedules/next`
- 현재 시즌 모드 조회: `GET /exam-schedules/season-mode`
- 시험 일정 단건 조회: `GET /exam-schedules/{examScheduleId}`
- 시험 직후 Recovery Card 필드 표시
  - `postExamMode`
  - `recentExamTitle`
  - `recentExamDate`
  - `recentExamSubject`
  - `daysSinceRecentExam`
- 시험 일정 관련 404와 empty 상태 처리

제외 범위:
- 캘린더 월간 뷰
- 시험별 과목 세부 시간표
- AI 시험 분석

명세 근거:
- API: Exam Schedule 16-3~16-5, Recovery Card 7-4
- 기능명세: 5-2. 시험 일정, 10. Recovery Card
- PRD: Phase 2 시험 사이클, B5

완료 조건:
- 사용자는 다음 시험과 시즌 모드를 확인할 수 있다.
- 시험 직후 Recovery Card가 최근 시험 정보를 반영한다.
- 시험 일정 관련 빈 상태와 404 상태가 안정적으로 처리된다.

검증:
- Next Exam/Season Mode API 계약 테스트
- 시험 직후 Recovery Card UI 테스트
- 404/empty 상태 테스트

## Phase 10. Analytics Event Boundary

상태: 미구현

목표:
- 주요 기능 성공 시 Analytics Event를 남기되, 이벤트 실패가 본 기능을 막지 않는 경계를 만든다.

포함 범위:
- 공통 Analytics Event API 함수: `POST /analytics/events`
- 이벤트 조회 API 함수: `GET /analytics/events`
- 주요 사용자 행동 이벤트 연결
  - 회원가입
  - 온보딩 시작/완료/스킵
  - Behavior Profile 생성
  - Future Vision 생성
  - MorningTask 생성
  - TopPick 선택
  - Timetable Slot 생성
  - Focus Session 시작/완료/중단
  - Tiny Win 생성
  - Daily Reflection 생성
  - Recovery Card 조회/액션
  - 시험 일정 등록

제외 범위:
- 외부 분석 SDK
- 대시보드 시각화
- 이벤트 재전송 큐

명세 근거:
- API: Analytics Event 19-1~19-2
- 기능명세: 17. Analytics
- PRD: Activation Funnel, Appendix B Analytics Event Schema

완료 조건:
- Analytics 기록 실패가 주요 사용자 흐름을 깨지 않는다.
- 핵심 이벤트 호출은 테스트에서 검증된다.

검증:
- Analytics API 계약 테스트
- 주요 mutation 성공 시 이벤트 호출 테스트
- Analytics 실패 시 본 기능 성공 유지 테스트

## Phase 11. Settings, Notification, And Web Push

상태: 미구현

목표:
- `/settings` placeholder를 실제 설정 화면으로 교체하고, 알림 정책과 Web Push 구독을 구현한다.

포함 범위:
- Notification Preference 조회/수정
- 수면 시간 무음 해제 불가 UI
- 학교 시간 무음과 주말 학교 시간 무음 설정
- 하루 최대 푸시 수 설정
- VAPID 공개키 조회
- Web Push 브라우저 권한 요청
- Web Push subscription 등록
- Web Push opt-in과 school-hours toggle Analytics Event 기록
- 기존 사용자가 Behavior Profile을 수정할 수 있는 설정 진입점

제외 범위:
- 백엔드 NotificationGateway 구현
- 백엔드 D-Day/Timing Push 스케줄러
- 네이티브 앱 push

명세 근거:
- API: Notification Preference 17-1~17-2, Web Push 18-1~18-2, Analytics Event 19-1
- 기능명세: 14. Notification, 5-1. 행동 프로필
- PRD: 학교 시간/수면 시간 알림 정책, B4

완료 조건:
- 사용자는 알림 타입별 설정을 조회/수정할 수 있다.
- 수면 시간 무음은 UI에서 끌 수 없고 API 요청에서도 false로 보내지 않는다.
- 브라우저 권한이 허용된 경우 Web Push subscription을 등록할 수 있다.
- 권한 거부/미지원 브라우저 상태가 빈 화면으로 남지 않는다.

검증:
- Notification Preference API 계약 테스트
- Web Push VAPID/subscription API 계약 테스트
- 권한 허용/거부 수동 검증 기록

## Phase 12. Focus Statistics And Timing Recommendation

상태: 미구현

목표:
- `/statistics` placeholder를 실제 통계 화면으로 교체하고, 집중 통계와 추천 시간대를 보여준다.

포함 범위:
- 일별 집중 통계 조회
- 주별 집중 통계 조회
- 월별 집중 통계 조회
- 시간대별 집중 분포 조회
- 순공 타이밍 추천 조회
- Home Today의 `showFocusTimingCard` 기반 추천 카드 노출
- Behavior Profile fallback 추천 상태 표시

제외 범위:
- 주간 미니 리포트
- AI 리포트 분석 화면
- 차트 라이브러리 추가가 필요한 복잡한 시각화

명세 근거:
- API: Focus Statistics 13-1~13-5
- 기능명세: 15. Focus Statistics, 16. Home Today
- PRD: Hero Story #3

완료 조건:
- 사용자는 일/주/월 집중 요약과 시간대별 분포를 볼 수 있다.
- 데이터가 부족할 때도 빈 상태 또는 프로필 기반 fallback이 명확히 표시된다.
- 추천 시간대가 학교/수면 정책과 충돌하지 않도록 안내한다.

검증:
- Focus Statistics API 계약 테스트
- 데이터 있음/없음/fallback UI 테스트
- Home Today 추천 카드 노출 조건 테스트

## Phase 13. Study Room REST

상태: 미구현

목표:
- `/friends` placeholder를 실제 소셜/스터디룸 화면으로 교체하고, Study Room REST 기능을 구현한다.

포함 범위:
- 공개/비공개 방 생성
- 공개 방 목록 조회
- 방 상세 조회
- 공개/비공개 방 참여
- 방 퇴장
- 리더 전용 참여자 강퇴
- 참여자 목록 조회
- 내 참여 현황 조회
- 참여자 집중/휴식 상태 전환

제외 범위:
- STOMP 채팅
- Accountability
- 랭킹, 공개 경쟁, DM

명세 근거:
- API: StudyRoom 8-1~8-10
- 기능명세: 12-1~12-4
- PRD: Hero Story #2-1

완료 조건:
- 사용자는 방을 만들고 참여/퇴장할 수 있다.
- 리더는 다른 참여자를 내보낼 수 있고 자신은 강퇴할 수 없다.
- 참여자는 집중/휴식 상태를 전환할 수 있다.
- 비공개 방 초대 코드 오류가 명확히 표시된다.

검증:
- Study Room REST API 계약 테스트
- 공개/비공개 입장 흐름 테스트
- 리더 권한 오류 테스트
- 참여자 상태 전환 테스트

## Phase 14. Study Room Chat

상태: 미구현

목표:
- Study Room의 실시간 채팅을 STOMP 계약에 맞춰 연결한다.

포함 범위:
- `/ws` STOMP 연결
- `/topic/rooms/{roomId}/chat` 구독
- `/app/rooms/{roomId}/chat` 메시지 발송
- `/user/queue/errors` 에러 구독
- REST 상태에서만 채팅 가능한 UI
- FOCUS/WAITING/ENDED 상태의 채팅 차단 표현

제외 범위:
- DM
- 파일 첨부
- 메시지 영구 목록 조회

명세 근거:
- API: StudyRoom Chat 9-1
- 기능명세: 12-5. 채팅
- PRD: 친구 스터디룸, 랭킹 없는 소셜

완료 조건:
- REST 상태 참여자는 채팅을 보낼 수 있다.
- FOCUS 상태에서는 채팅 입력 또는 전송이 차단된다.
- 서버 에러 큐 메시지가 사용자에게 표시된다.

검증:
- STOMP 연결 수동 검증 절차 문서화
- 채팅 가능/불가 상태 컴포넌트 테스트
- 에러 큐 메시지 표시 테스트

## Phase 15. Accountability

상태: 미구현

목표:
- 친구 감시 기능을 랭킹 없이 동의 기반 요약 조회로 구현한다.

포함 범위:
- 친구 감시 관계 생성
- 초대 코드 참여
- 초대 코드 재발급
- 초대 코드 상태 조회
- 친구 감시 관계 상태 조회
- 공개 범위 수정
- watcher 연결 해제
- watching 관계 해제
- 감시자용 Focus Session 요약 조회
- 감시자용 TopPick 요약 조회
- 감시자용 Timetable Task 요약 조회
- Home Today의 `friendAccountability` 상태 반영
- Accountability 관련 Analytics Event 기록

제외 범위:
- 부모/교사 대시보드
- 친구 랭킹
- 공개 피드
- DM

명세 근거:
- API: Accountability 15-1~15-14
- 기능명세: 13. Accountability
- PRD: Hero Story #2-1, Anti-stories

완료 조건:
- 사용자는 감시 대상 공개 범위를 직접 고를 수 있다.
- 초대받은 친구는 코드로 참여할 수 있다.
- 허용되지 않은 감시 대상은 조회할 수 없다.
- 사용자는 watcher 또는 watching 관계를 끊을 수 있다.

검증:
- Accountability API 계약 테스트
- 초대 코드 만료/중복/자기 참여 오류 테스트
- 공개 범위 변경 테스트
- 허용되지 않은 요약 조회 차단 테스트

## Phase 16. PWA And Release Hardening

상태: 미구현

목표:
- 모바일/태블릿 웹 출시를 위해 PWA, 접근성, 성능, 회귀 검증을 마무리한다.

포함 범위:
- PWA manifest
- Service Worker 기본 구성
- 모바일/태블릿 주요 뷰포트 QA
- 키보드 접근성, focus, label, role/name 검증
- reduced-motion과 터치 타깃 확인
- 핵심 사용자 흐름 e2e smoke
- Web Push 실제 브라우저 구독 재검증
- 릴리스 전 Phase 완료 기록 정리

제외 범위:
- 네이티브 앱
- 백엔드 스케줄러 구현
- AI 성장 리포트 결제/생성

명세 근거:
- 기능명세: 19-2. 프론트엔드/PWA, 20. 비기능 요구사항
- PRD: 모바일/태블릿 웹, PWA/Web Push

완료 조건:
- 모바일/태블릿에서 핵심 루프가 안정적으로 사용 가능하다.
- 접근성 기본 규칙 위반이 주요 흐름에 남아 있지 않다.
- 릴리스 전 검증 기록이 `docs/phase/`에 남는다.

검증:
- 주요 뷰포트 브라우저 스모크
- 접근성 수동 점검 기록
- e2e smoke 또는 대체 수동 검증 기록
- `.\scripts\agent-verify.ps1 -Mode full`

## Phase 17. AI Growth Report Gate

상태: 차단

목표:
- PRD Phase 3의 AI 성장 리포트 검증 목표를 유지하되, API와 결제 명세가 확정되기 전까지 구현하지 않는다.

차단 범위:
- AI 성장 리포트 구매 CTA
- 결제 시도/완료
- 환불 요청
- 가격 A/B
- 리포트 생성 요청/상태/결과 조회
- PDF 다운로드
- 재구매

차단 해제 조건:
- `API-specification.md`에 결제, 환불, 리포트 생성/상태/조회, 가격 variant, eligibility 엔드포인트가 추가된다.
- `FEATURE-SPECIFICATION.md`에 AI 리포트 권한, 30일 데이터 조건, 환불 정책, 실패/재시도 정책, 개인정보 처리 기준이 추가된다.
- 프론트에서 표시할 리포트 섹션과 PDF 다운로드 정책이 확정된다.

완료 조건:
- 차단 해제 전에는 실제 결제 또는 리포트 생성이 가능한 것처럼 보이는 UI를 만들지 않는다.
- PRD 문구만 근거로 임의 API 타입, mock-only 결제 흐름, 가짜 리포트 결과 화면을 만들지 않는다.

## Deferred

- 주간 미니 리포트: PRD Phase 2에 있으나 별도 API 계약이 없다.
- AI 성장 리포트 상세 구현: Phase 17의 차단 해제 전까지 대기한다.
- 가격 A/B와 결제 전환 대시보드: 백엔드 계약과 운영 정책이 없다.
- 네이티브 앱: PRD상 Web Push 한계 도달 시 검토 항목이다.
- B2B 학원 라이선스: Phase 3 결제 검증 실패 후 검토하는 사업 분기다.
