# Phase 13-14. Study Room REST And Chat

## 완료 범위

- `/study-room` 실제 화면을 추가하고, 기존 `/friends` 접근은 `/study-room`으로 redirect하도록 분리했다.
- 스터디룸 화면에 기존 앱 사이드바를 복구하고, 사이드바 보조 문구를 스터디룸 맥락으로 표시할 수 있게 확장했다.
- Study Room REST API 클라이언트와 React Query key를 추가했다.
  - `POST /rooms`
  - `GET /rooms`
  - `GET /rooms/{roomId}`
  - `POST /rooms/{roomId}/join`
  - `POST /rooms/{roomId}/leave`
  - `DELETE /rooms/{roomId}/participants/{targetUserId}`
  - `GET /rooms/{roomId}/participants`
  - `PATCH /rooms/{roomId}/participants/focus`
  - `PATCH /rooms/{roomId}/participants/break`
  - `GET /my-participations`
- 공개/비공개 방 생성, 공개 방 목록, 내 참여 현황, 공개 방 참여, 비공개 방 참여, 퇴장, 리더 강퇴, 집중/휴식 상태 전환 UI를 구현했다.
- 공개 방의 비참여자 상세 조회 진입을 제거했다. 방 상세는 참여 중인 방에 한해 "내 방" 패널로 표시한다.
- 참여 후 화면에서 방 ID, 방장 ID, 참가자 ID를 노출하지 않고 방 이름, 참여자 이름, 상태, 입장 시간, 집중 시간을 중심으로 표시한다.
- "집중 시작" 후 현재 사용자의 로컬 타이머를 즉시 표시한다.
- 서버가 참가자 응답에 `focusStartedAt` 또는 `focusElapsedSeconds`를 내려주면 다른 참여자의 집중 시간도 표시할 수 있도록 타입과 표시 로직을 열어두었다.
- Study Room Chat STOMP 클라이언트를 추가했다.
  - `/ws` 연결
  - `/topic/rooms/{roomId}/chat` 구독
  - `/app/rooms/{roomId}/chat` 발송
  - `/user/queue/errors` 구독
- 채팅은 참여자가 `REST` 상태일 때만 연결/발송하도록 제한했다.
- `sockjs-client`가 Vite 8/Rolldown dev prebundle에서 `global is not defined`를 일으키는 문제를 `global -> globalThis` 치환 설정으로 보정했다.

## 명세 근거

- PRD: 친구 스터디룸, 랭킹 없는 소셜, 사회적 촉진 기반 협업 집중
- 기능명세: 12. Study Room, 12-5. 채팅
- API: StudyRoom 8-1~8-10, StudyRoom Chat 9-1 (`docs/API-specification.md`)
- 디자인: 기존 dashboard/AppSidebar 레이아웃, 경쟁/랭킹 없는 상태 표시 원칙

## 변경 파일

- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `src/app/AppRoutes.tsx`
- `src/features/core-loop/AppSidebar.tsx`
- `src/features/core-loop/CoreLoopDashboard.test.tsx`
- `src/features/study-room/api.ts` (신규)
- `src/features/study-room/api.test.ts` (신규)
- `src/features/study-room/chatClient.ts` (신규)
- `src/features/study-room/StudyRoomChatPanel.tsx` (신규)
- `src/features/study-room/StudyRoomChatPanel.module.css` (신규)
- `src/features/study-room/StudyRoomChatPanel.test.tsx` (신규)
- `src/features/study-room/types.ts` (신규)
- `src/pages/StudyRoomPage.tsx` (신규)
- `src/pages/StudyRoomPage.module.css` (신규)
- `src/pages/StudyRoomPage.test.tsx` (신규)
- `src/shared/queryKeys.ts`
- `src/shared/queryKeys.test.ts`
- `docs/phase/phase-13-14-study-room-rest-and-chat.md` (신규)
- `docs/phase/phase-plan.md`
- `docs/phase/README.md`

## 검증

- typecheck: `npm run typecheck` 통과
- lint: `npm run lint` 통과
- focused test: `npm test -- src/pages/StudyRoomPage.test.tsx src/features/core-loop/CoreLoopDashboard.test.tsx src/features/study-room/StudyRoomChatPanel.test.tsx`, `3 passed`, `19 passed`
- build: `npm run build` 통과
- manual/server: `http://127.0.0.1:5173/study-room` HTTP 200 응답 확인
- manual/bundle: `node_modules/.vite/deps/sockjs-client.js`에서 raw `global.crypto` 참조가 `globalThis.crypto`로 치환된 것을 확인

## 제외한 범위

- DM, 파일 첨부, 채팅 메시지 영구 목록 조회
- 랭킹, 공개 경쟁, 공개 피드
- Accountability 관계 생성/초대/감시 대상 요약 조회
- 초대 코드만으로 비공개 방에 참여하는 API. 현재 명세는 `POST /rooms/{roomId}/join`이므로 `roomId`가 필요하다.
- 서버 주도 실시간 집중 타이머 동기화. 프론트는 `focusStartedAt`/`focusElapsedSeconds` 필드를 지원하지만, 실제 정확도는 서버 응답 또는 STOMP 상태 이벤트에 의존한다.

## 남은 위험

- 다른 참여자의 집중 시간을 실시간으로 정확히 보여주려면 백엔드가 참가자 조회 또는 STOMP 이벤트에 `focusStartedAt` 또는 `focusElapsedSeconds`를 포함해야 한다. 현재 프론트는 필드가 없으면 "집중 시간 동기화 대기"로 표시한다.
- 비공개 방 참여 화면에서 방 ID 입력을 완전히 제거하려면 `inviteCode`만으로 방을 찾거나 참여하는 서버 API가 추가되어야 한다.
- Browser Use 직접 콘솔 확인은 로컬 Node `v22.15.0`이 런타임 요구 버전 `>= v22.22.0`보다 낮아 수행하지 못했다. 대신 dev server HTTP 200, Vite build, 관련 테스트, sockjs prebundle 치환 상태로 확인했다.
- STOMP 실제 서버 연결은 로컬 백엔드/브로커 상태에 따라 달라지므로, 통합 환경에서 `/ws` 연결과 `/topic/rooms/{roomId}/chat` 브로드캐스트를 별도 수동 확인해야 한다.
