# Phase 11. Settings, Notification, And Web Push

## 완료 범위

- `/settings` placeholder를 실제 설정 화면으로 교체했다.
- 단일 페이지에 알림 / 행동 프로필 / Web Push 세 섹션을 배치했다.
- Notification Preference 조회/수정 (PATCH)을 구현했다. 저장 버튼으로만 전송하며, 전체 객체를 보낸다.
- 수면 시간 무음은 UI에서 disabled checked 상태로 렌더링하고, PATCH body에서도 항상 `true`로 보낸다.
- 클라이언트에서 학교 시간 시작 < 종료, 0 ≤ 하루 최대 푸시 수 ≤ 10 검증을 수행하고, 실패 시 PATCH를 호출하지 않는다.
- 행동 프로필 섹션은 `home.behaviorProfile` 값을 한국어 라벨로 보여주고, "수정하기" 링크는 `/onboarding?mode=edit`로 이동한다.
- OnboardingPage에 `mode=edit` 분기를 추가했다. 진입 시 `GET /behavior-profiles/me`로 기존 프로필을 가져와 폼에 prefill하고, 완료 시 `PUT /behavior-profiles/me`로 저장한 뒤 `/settings`로 이동한다. 편집 모드에서는 "건너뛰기" 버튼을 숨긴다.
- Web Push 섹션은 브라우저 지원 여부, `Notification.permission` 상태에 따라 버튼 활성/비활성과 안내 문구를 다르게 보여준다.
- Web Push 등록 클릭 시: 권한 요청 → `/sw.js` 등록 (`navigator.serviceWorker.register("/sw.js", { scope: "/" })`) → `serviceWorker.ready` 대기 → `getVapidPublicKey()` (인증 헤더 없음) → `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` → `subscribeWebPush(...)`로 endpoint, keys, contentEncoding `aes128gcm`, userAgent 전송 → 성공 시 `localStorage["movra:webPushEndpoint"]`에 endpoint 저장.
- `subscribeBrowserToWebPush`는 기존 구독이 있으면 재사용한다. localStorage endpoint와 일치하는 기존 구독이 있을 때 버튼 라벨이 "다시 등록"으로 바뀐다.
- `public/sw.js`는 install/activate/push/notificationclick 이벤트만 처리한다. fetch 핸들러는 추가하지 않았다.
- `urlBase64ToUint8Array` VAPID base64url 디코더와 단위 테스트를 추가했다.
- API 클라이언트에 4종 (`getNotificationPreference`, `updateNotificationPreference`, `getVapidPublicKey`, `subscribeWebPush`)을 추가했다. `getVapidPublicKey`는 인증 토큰을 받지 않는다.
- `queryKeys.notificationPreference`, `queryKeys.behaviorProfileMe` 키 팩토리를 추가했다.

## 명세 근거

- PRD: 학교 시간/수면 시간 알림 정책, B4
- 기능명세: 14. Notification (613~674), 5-1. 행동 프로필 (185~201)
- API: Notification Preference 17-1, 17-2, Web Push 18-1, 18-2 (`docs/API-specification.md` 2089~2218)
- 디자인: 기존 AppSidebar, 모달, CSS token, ReflectionPage 패턴

## 변경 파일

- `src/shared/queryKeys.ts`
- `src/shared/queryKeys.test.ts`
- `src/features/notification/api.ts` (신규)
- `src/features/notification/api.test.ts` (신규)
- `src/features/notification/types.ts` (신규)
- `src/features/notification/vapidKey.ts` (신규)
- `src/features/notification/vapidKey.test.ts` (신규)
- `src/features/notification/registerServiceWorker.ts` (신규)
- `src/features/notification/webPush.ts` (신규)
- `src/pages/SettingsPage.tsx` (신규)
- `src/pages/SettingsPage.module.css` (신규)
- `src/pages/SettingsPage.test.tsx` (신규)
- `src/pages/OnboardingPage.tsx`
- `src/pages/OnboardingPage.test.tsx`
- `src/app/AppRoutes.tsx`
- `eslint.config.js`
- `public/sw.js` (신규)
- `docs/phase/phase-11-settings-notification-web-push.md` (신규)
- `docs/phase/phase-plan.md`
- `docs/phase/README.md`

## 검증

- lint: `npm run lint` 통과
- typecheck: `npm run typecheck` 통과
- test: `npm test`, `27 passed`, `143 passed`
- build: `npm run build` 통과
- manual: 미실행

## 제외한 범위

- Web Push opt-in / school-hours toggle Analytics Event 기록 (Phase 10에서 공통 처리 예정)
- Web Push 구독 해제 UI
- 만료 endpoint 자동 재등록
- 알림 미리보기/테스트 발송 UI
- 수면 시간 시작/종료 시간 사용자 설정 (현재 정책상 항상 켜짐만 표시)
- PWA manifest 정비 (sw.js만 추가)

## 남은 위험

- jsdom 기반 테스트는 실제 브라우저의 Push API 동작을 완전히 검증하지 못한다. 실제 브라우저 권한 거부/허용 흐름은 수동 확인이 필요하다.
- `lastRegisteredAt` 등 18-2 응답 필드는 현재 UI에 노출하지 않는다. 추후 디버깅을 위해 필요할 수 있다.
- Web Push subscribe POST는 매 클릭마다 idempotent하게 호출되며 endpoint만 localStorage에 저장한다. 서버가 동일 endpoint 중복 등록을 거부하지 않는다는 가정에 의존한다.
- 학교 시간 시작/종료가 자정을 넘어가는 입력은 검증하지 않는다. 현재 UI는 단순 문자열 비교 (`HH:MM < HH:MM`)만 수행한다.
