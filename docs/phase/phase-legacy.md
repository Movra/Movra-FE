# Movrara Frontend Legacy Phase Records

이 문서는 과거에 개별 파일로 작성했던 Phase 완료 기록을 한곳에 모은 레거시 기록이다.

현재 실행 계획은 `docs/phase/phase-plan.md`를 기준으로 한다. 이 파일의 기록은 과거 완료 증거와 의사결정 맥락을 보존하기 위한 것이며, 현재 코드 상태와 다를 수 있다.

통합 대상:
- Legacy Phase 0. App Foundation
- Legacy Phase 1. Auth And Session
- Legacy Phase 1 Refactor. Onboarding Design
- Legacy Phase 2. Home Today And Core Loop
- Legacy Phase 3. Planning Support

## Legacy Phase 0. App Foundation

통합 전 기록: Phase 0 App Foundation

### 완료 범위

- React + TypeScript + Vite 앱 골격을 추가했다.
- React Router와 TanStack Query provider 경계를 구성했다.
- Vitest, Testing Library, MSW 테스트 환경을 구성했다.
- ESLint, TypeScript, build/test/lint 스크립트를 구성했다.
- `docs/design.md` 기반 색상, 간격, radius, 타이포그래피 CSS 토큰을 추가했다.
- 기본 앱 shell, 홈 placeholder, 새싹 SVG 마크를 추가했다.
- `http://localhost:8080`을 기본 base URL로 사용하는 fetch 기반 API client를 추가했다.
- API ErrorResponse 형식과 Bearer 인증 헤더 처리를 테스트로 고정했다.
- Vite/Vitest 계열 의존성을 최신 호환 버전으로 올려 `npm audit` 취약점 0건을 확인했다.

### 명세 근거

- PRD: `docs/prd.md` 7-1 시스템 구성, 7-2 모바일/태블릿 웹 Critical Path
- 기능명세: `docs/FEATURE-SPECIFICATION.md` 20. 비기능 요구사항
- API: `docs/API-specification.md` 공통 사항, 인증 헤더, ErrorResponse 형식
- 디자인: `docs/design.md` Colors, Typography, Layout, Character System, Accessibility
- Phase: `docs/phase/phase-plan.md` Phase 0. App Foundation

### 변경 파일

- `.env.example`
- `.gitignore`
- `eslint.config.js`
- `index.html`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `src/app/App.tsx`
- `src/app/AppProviders.tsx`
- `src/app/AppRoutes.tsx`
- `src/app/AppRoutes.module.css`
- `src/app/App.test.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/HomePage.module.css`
- `src/shared/api/client.ts`
- `src/shared/api/client.test.ts`
- `src/shared/api/types.ts`
- `src/shared/config/env.ts`
- `src/shared/ui/SproutMark.tsx`
- `src/styles/global.css`
- `src/styles/tokens.css`
- `src/test/handlers.ts`
- `src/test/server.ts`
- `src/test/setup.ts`
- `src/vite-env.d.ts`

### 검증

- `npm run lint`: 통과
- `npm run typecheck`: 통과
- `npm test`: 통과, 2 files / 3 tests
- `npm run build`: 통과
- `npm audit --audit-level=moderate`: 통과, 0 vulnerabilities
- `.\scripts\agent-verify.ps1 -Mode full`: 통과, 0 warnings

### 제외한 범위

- 로그인, 회원가입, 토큰 재발급 UI
- Home Today 실제 API 조회
- MindSweep, TopPick, Focus Session 기능 구현
- Web Push, Service Worker, PWA 설치 흐름
- STOMP/WebSocket 연결
- 완성형 새싹 캐릭터 아트워크와 애니메이션

### 남은 위험

- 샌드박스 기본 실행에서는 하네스 내부 Vitest가 Vite 하위 프로세스를 만들 때 `spawn EPERM`으로 실패할 수 있다. 동일 명령은 승인 실행에서 통과했다.
- `@vitejs/plugin-react` 갱신은 npm resolver 충돌 때문에 `--force`로 적용했다. 갱신 후 lint/typecheck/test/build/audit/full harness는 모두 통과했다.
- 현재 홈 화면은 Phase 0 상태 확인용 placeholder이며 제품 기능 화면이 아니다.

## Legacy Phase 1. Auth And Session

통합 전 기록: Phase 1 Auth And Session

### 완료 범위

- 로그인 API 경계 `POST /auth/login`을 유지하고, 로그인 화면을 새 Movra 브랜드/캐릭터 기준으로 리디자인했다.
- 회원가입 API 경계 `POST /auth/signup`을 추가하고, 이메일/계정 ID/프로필 이름/프로필 이미지/비밀번호 multipart 전송 UI를 구현했다.
- OAuth 프로필 설정 API 경계 `POST /auth/oauth/profile-setup?pendingToken=...`을 추가했다.
- OAuth 프로필 설정 성공 시 발급된 Access Token과 Refresh Token을 저장하고 보호 홈 화면으로 진입하게 했다.
- 로그인 화면에 Google/Naver OAuth 시작 버튼을 추가했다. 프론트 버튼은 백엔드 OAuth 시작 경로 `/oauth2/authorization/{provider}`로 이동한다.
- Access Token과 Refresh Token을 `localStorage`에 저장/조회/삭제하는 세션 저장소를 유지했다.
- 인증 상태를 제공하는 `AuthProvider`와 `useAuth` hook에 OAuth 프로필 설정 완료 흐름을 연결했다.
- 비인증 사용자를 `/login`으로 보내는 보호 라우팅을 유지하고, `/signup`, `/oauth/profile-setup` 라우트를 추가했다.
- 로그인/회원가입/OAuth 프로필 설정 화면에서 loading/error/success 또는 차단 상태를 표시한다.
- 사용자가 제공한 Movra 로고와 기본/집중/MindSweep 캐릭터 이미지를 인증 화면 자산으로 반영했다.

### 명세 근거

- PRD: `docs/prd.md` Phase 1 Activation 흐름
- 기능명세: `docs/FEATURE-SPECIFICATION.md` 4-1. 로컬 회원가입, 4-2. 로그인, 4-3. OAuth 프로필 설정
- API: `docs/API-specification.md` 1-1. 회원가입, 1-2. 로그인, 1-3. OAuth 프로필 설정, 1-4. 토큰 재발급
- 디자인: `docs/design.md` Forms & Tags, Buttons, Character System
- 추가 디자인 기록: `docs/phase/Phase-추가적사항.md`
- Phase: `docs/phase/phase-plan.md` Phase 1. Auth And Session

### 변경 파일

- `src/app/AppProviders.tsx`
- `src/app/AppRoutes.tsx`
- `src/app/AppRoutes.module.css`
- `src/app/App.test.tsx`
- `src/assets/auth/character-default.png`
- `src/assets/auth/character-focus.png`
- `src/assets/auth/character-mindsweep.png`
- `src/assets/auth/movra-logo.png`
- `src/assets/auth/movra-logo-cropped.png`
- `src/features/auth/api.ts`
- `src/features/auth/api.test.ts`
- `src/features/auth/AuthContext.ts`
- `src/features/auth/AuthProvider.tsx`
- `src/features/auth/RequireAuth.tsx`
- `src/features/auth/sessionStorage.ts`
- `src/features/auth/useAuth.ts`
- `src/pages/AuthLayout.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/LoginPage.module.css`
- `src/pages/LoginPage.test.tsx`
- `src/pages/OAuthProfileSetupPage.tsx`
- `src/pages/OAuthProfileSetupPage.test.tsx`
- `src/pages/SignupPage.tsx`
- `src/pages/SignupPage.test.tsx`
- `src/styles/tokens.css`
- `src/test/setup.ts`

### 검증

- `npm run lint`: 통과
- `npm run typecheck`: 통과
- `npm test`: 통과, 7 files / 19 tests
- `npm run build`: 통과
- `.\scripts\agent-verify.ps1 -Mode full`: 통과, 0 warnings

### 제외한 범위

- 온보딩 전체 플로우
- refresh token 자동 재발급 interceptor
- 사용자 프로필 조회와 이름 표시
- 비밀번호 찾기/재설정
- OAuth provider 인증 처리와 callback 처리 자체는 백엔드 책임으로 남긴다.

### 남은 위험

- Google/Naver OAuth 시작 URL은 API 명세에 직접 적혀 있지 않아 Spring Security OAuth에서 일반적으로 쓰는 `/oauth2/authorization/{provider}` 경로로 연결했다. 백엔드 실제 경로가 다르면 프론트 링크를 맞춰야 한다.
- 현재 인증 상태는 토큰 존재 여부로만 판단한다. 사용자 프로필 API가 Phase 범위에 없으므로 사용자 식별 정보는 표시하지 않는다.
- 자동 토큰 재발급은 API 경계만 유지했고 실제 만료 시 재시도 흐름은 후속 Phase에서 필요할 때 연결한다.
- 인증 화면 이미지는 프로젝트 내부 자산으로 복사했지만, 최종 이미지 압축/용량 최적화는 별도 작업으로 남아 있다.

## Legacy Phase 1 Refactor. Onboarding Design

통합 전 기록: Phase 1 Refactor Onboarding Design

완료일: 2026-05-05

### 완료 범위

- `docs/phase/Phase-추가적사항.md`에 기록된 실제 Movra 캐릭터 이미지를 온보딩에 반영했다.
- 온보딩 단계별로 기본, MindSweep, TopPick, Recovery, 작은 성공 캐릭터를 연결했다.
- 데스크톱 온보딩 화면이 한 화면 안에 들어오도록 사이드바, 중앙 질문 카드, 하단 이동 버튼의 높이와 간격을 재조정했다.
- 선택 카드 상단에 질문 성격에 맞는 이모티콘을 추가했다.
- 선택된 답변에는 초록 체크 표시와 연녹색 강조 상태를 제공했다.
- 모바일에서는 사이드바를 숨기고 캐릭터를 중앙 카드 안에 축약 노출하도록 유지했다.

### 명세 근거

- Phase 계획: `docs/phase/phase-plan.md`의 `Phase 1-refactor. Onboarding And Behavior Profile`
- 추가 디자인 기준: `docs/phase/Phase-추가적사항.md`
- 디자인 기준: `docs/design.md`의 Character System, Forms & Tags, Responsive Behavior
- API 계약: `docs/API-specification.md`의 Auth 1-5, Behavior Profile 14-1~14-3
- 기능명세: `docs/FEATURE-SPECIFICATION.md`의 4-4. 온보딩 컨텍스트, 5-1. 행동 프로필

### 변경 파일

- `src/pages/OnboardingPage.tsx`
- `src/pages/OnboardingPage.module.css`
- `src/assets/auth/character-toppick.png`
- `src/assets/auth/character-recovery.png`
- `src/assets/auth/character-success.png`

### 검증

- `.\scripts\agent-verify.ps1 -Mode full`: 통과
- `lint`, `typecheck`, `test`, `build` 전체 통과

### 제외 범위

- 온보딩 시작/완료/스킵 Analytics Event 기록
- 기존 사용자가 Behavior Profile을 수정하는 설정 화면
- 로그인 직후 Home Today 조회 실패와 Behavior Profile 없음 상태의 분리
- 백엔드 실서버 연동 수동 검증

### 남은 위험

- 실제 브라우저 뷰포트별 시각 QA가 필요하다.
- 제공된 로고 파일 용량이 크므로 릴리스 전 이미지 최적화를 별도 검토할 수 있다.

## Legacy Phase 2. Home Today And Core Loop

통합 전 기록: Phase 2 Home Today And Core Loop

### 완료 범위

- `GET /home/today` 기반 오늘 홈 통합 조회를 구현했다.
- Home Today 응답의 `todayDailyPlan.tasks`, `topPicks`, `focusSessions`, `activeFocusSession`, `recoveryCard`를 화면에 연결했다.
- MindSweep 추가, 수정, 삭제, 완료, 완료 취소 액션을 구현했다.
- TopPick 선택과 해제 액션을 구현했다.
- Focus Session 3/5/10/25분 프리셋 선택, 시작, 종료 액션을 구현했다.
- Recovery Card 노출과 `START`, `REFLECT`, `DISMISS` 액션 기록을 구현했다.
- 핵심 루프 화면의 loading, error, empty, success 상태를 추가했다.
- 모바일/태블릿 대응을 위해 핵심 패널을 반응형 그리드로 구성했다.
- 2026-05-06 보강: 홈 패널 고정 높이로 인한 텍스트 겹침을 방지하고, 사이드바 아이콘/텍스트 크기를 축소했다.
- 2026-05-06 보강: 깨질 수 있는 장식 기호를 SVG 아이콘으로 교체하고, Home Today의 알림 설정/친구 Accountability 상태를 헤더와 사이드바에 표시했다.

### 명세 근거

- PRD: `docs/prd.md` Hero Story #0, Hero Story #1, Hero Story #2
- 기능명세: `docs/FEATURE-SPECIFICATION.md` 7. Daily Plan, 9. Focus Session, 10. Recovery Card, 16. Home Today
- API: `docs/API-specification.md` 2. Daily Plan, 3. Mind Sweep, 4. Top Picks, 7. Focus Session, 20. Home Today
- 디자인: `docs/design.md` Colors, Forms & Tags, Buttons, Cards, Character System, Responsive Behavior
- Phase: `docs/phase/phase-plan.md` Phase 2. Home Today And Core Loop

### 변경 파일

- 인증 Phase 완료 기록
- `src/app/App.test.tsx`
- `src/features/core-loop/api.ts`
- `src/features/core-loop/CoreLoopDashboard.module.css`
- `src/features/core-loop/CoreLoopDashboard.test.tsx`
- `src/features/core-loop/CoreLoopDashboard.tsx`
- `src/features/core-loop/types.ts`
- `src/pages/HomePage.tsx`
- `src/pages/HomePage.module.css` 삭제
- `src/pages/LoginPage.test.tsx`
- `src/test/fixtures.ts`

### 검증

- `npm run lint`: 통과
- `npm run typecheck`: 통과
- `npm test`: 통과, 5 files / 10 tests
- `npm run build`: 통과
- `.\scripts\agent-verify.ps1 -Mode full`: 통과, 0 warnings
- 2026-05-06 보강 후 `CoreLoopDashboard` 단일 테스트, `lint`, `typecheck` 통과

### 제외한 범위

- Timetable 세부 슬롯 편집
- Tiny Win, Daily Reflection
- Study Room, Accountability
- Web Push 알림
- Recovery Card의 START 액션과 Focus Session 시작을 자동으로 연결하는 복합 동작
- Focus Session 진행 시간의 실시간 타이머 표시

### 남은 위험

- 현재 MindSweep/TopPick 목록은 별도 목록 API가 아니라 `GET /home/today` 응답을 단일 read source로 사용한다. mutation 후에는 Home Today를 invalidate해 최신 상태를 다시 가져온다.
- Recovery Card 액션은 명세대로 기록만 수행한다. 실제 집중 시작은 Focus Session 패널에서 별도로 누르는 흐름이다.
- 백엔드가 실행 중이지 않은 상태에서는 실제 수동 API 연동 검증은 하지 못했고, MSW 기반 계약 테스트로 대체했다.

## Legacy Phase 3. Planning Support

통합 전 기록: Phase 3 Planning Support

완료일: 2026-05-04

현재 주의:
- 이 기록은 과거 완료 증거로 보존한다.
- 현재 코드에서는 `PlanningSupportPanel`이 라우트나 홈에 렌더링되지 않으므로, 사용 가능한 완료 상태로 보지 않는다.
- 현재 실행 계획에서는 이 기록을 기능별로 나눠 `Daily Planning And TopPick`, `Timetable`, `Future Vision And Exam Schedule` Phase에 반영한다.

### 완료 범위

- Home Today 하단에 Planning Support 섹션을 추가했다.
- Future Vision 생성/조회/수정 UI를 연결했다.
- MorningTask 추가/수정/삭제/완료 전환 UI를 연결했다.
- Timetable 조회 결과를 표시하고 TopPick, 일반 할 일, 직접 입력 블록을 시간표 Slot에 배정할 수 있게 했다.
- Slot 시간 수정과 삭제 UI를 연결했다.
- Exam Schedule 목록 조회, 생성, 수정, 삭제 UI를 연결했다.
- Home Today의 `seasonMode`, `nextExamSchedule`, `futureVision`, `timetable` 정보를 계획 흐름에 표시했다.

### 명세 근거

- Phase 계획: `docs/phase/phase-plan.md`의 Phase 3 Planning Support
- API 계약: `docs/API-specification.md`
  - `GET/POST/PATCH /future-vision`
  - `GET/POST/PUT/DELETE/PATCH /morning-tasks`
  - `GET/POST/PATCH/DELETE /timetables`
  - `GET/POST/PATCH/DELETE /exam-schedules`
- 기능 범위: `docs/FEATURE-SPECIFICATION.md`
- 디자인 기준: `docs/design.md`

### 변경 파일

- `src/features/core-loop/CoreLoopDashboard.tsx`
- `src/features/core-loop/CoreLoopDashboard.test.tsx`
- `src/features/core-loop/types.ts`
- `src/features/planning-support/api.ts`
- `src/features/planning-support/PlanningSupportPanel.tsx`
- `src/features/planning-support/PlanningSupportPanel.module.css`
- `src/test/fixtures.ts`
- `src/test/handlers.ts`

### 검증

- `npm run lint`: 통과
- `npm run typecheck`: 통과
- `npm test`: 5 files / 12 tests 통과
- `npm run build`: 통과
- `.\scripts\agent-verify.ps1 -Mode full`: 통과, 0 warnings

메모: sandbox 기본 실행에서는 Vite/Vitest 설정 로딩 중 `spawn EPERM`이 발생해 하네스 전체 검증만 권한 상승으로 재실행했다. 동일 명령은 권한 상승 실행에서 통과했다.

### 제외 범위

- StudyRoom, Web Push, AI Growth Report는 Phase 3 범위에서 제외했다.
- 서버가 실행 중이지 않은 상태에서도 API 계약 기준으로 프론트엔드 호출 경계와 MSW 기반 사용자 흐름 테스트를 검증했다.
- Future Vision 파일 입력은 API 명세의 multipart 필드명 기준으로 연결했으며, 이미지 업로드의 실제 저장 결과는 백엔드 실행 환경에서 확인해야 한다.

### 남은 위험

- 실제 백엔드의 Home Today 응답이 `futureVision`, `timetable`, `nextExamSchedule`을 항상 명세와 같은 shape으로 내려주는지 통합 실행에서 확인해야 한다.
- Timetable 생성 자체는 백엔드 DailyPlan 흐름에 의존한다. Home Today에 timetable이 없으면 프론트엔드는 빈 상태를 표시한다.
