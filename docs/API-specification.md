# Movra API 명세서

> 최종 갱신: 2026-05-02
> 기준: 실제 구현 코드베이스 (컨트롤러 + DTO 기반)

## 공통 사항

### 인증

- **방식**: JWT Bearer Token
- **헤더**: `Authorization: Bearer {accessToken}`
- **비인증 엔드포인트**: `/auth/signup`, `/auth/login`, `/auth/oauth/profile-setup`, `/auth/reissue`, `/auth/onboarding-context`, `/web-push/vapid-public-key`, `/ws/**`
- 그 외 모든 요청은 인증 필수

### 공통 응답 형식

- 성공 시: HTTP 200 + JSON Body, Body 없는 명령 API는 HTTP 200 또는 명시된 경우 HTTP 204
- 실패 시: ErrorCode 기반 응답

```json
{
  "httpStatus": "BAD_REQUEST",
  "statusCode": 400,
  "message": "잘못된 요청입니다.",
  "timestamp": "2026-04-24T09:30:00"
}
```

### ID 형식

- 모든 ID는 `UUID` (v4) 형식

### 날짜/시간 형식

| 타입 | 형식 | 예시 |
|------|------|------|
| `LocalDate` | `yyyy-MM-dd` | `2026-04-24` |
| `LocalTime` | `HH:mm:ss` 또는 필드별 `HH:mm` | `09:30:00`, `09:30` |
| `LocalDateTime` | `yyyy-MM-ddTHH:mm:ss` | `2026-04-24T09:30:00` |
| `Instant` | ISO-8601 UTC | `2026-04-24T00:30:00Z` |

---

## 1. Auth (인증)

> BC: `account` / Controller: `AuthController`
> Base Path: `/auth`

---

### 1-1. 회원가입

```
POST /auth/signup
Content-Type: multipart/form-data
```

**Request** (form-data):

| 필드 | 타입 | 필수 | 제약 | 설명 |
|------|------|------|------|------|
| `email` | String | O | 이메일 형식, max 255 | 이메일 |
| `accountId` | String | O | max 20 | 계정 ID |
| `profileName` | String | O | max 20 | 프로필 이름 |
| `profileImage` | MultipartFile | O | 비어있지 않은 파일 | 프로필 이미지 |
| `password` | String | O | 8~20자 | 비밀번호 |

**Response**: 없음 (200 OK)

**에러**:
- `DUPLICATE_ACCOUNT_ID` (409): 이미 존재하는 계정 ID
- `DUPLICATE_EMAIL` (409): 이미 존재하는 이메일

---

### 1-2. 로그인

```
POST /auth/login
Content-Type: application/json
```

**Request**:

```json
{
  "accountId": "string (max 20)",
  "password": "string (8~20)"
}
```

**Response**:

```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

**에러**:
- `ACCOUNT_NOT_FOUND` (404): 계정 ID를 찾을 수 없음
- `PASSWORD_MISMATCH` (401): 비밀번호 불일치

---

### 1-3. OAuth 프로필 설정

```
POST /auth/oauth/profile-setup?pendingToken={pendingToken}
Content-Type: multipart/form-data
```

**Query Parameter**:

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `pendingToken` | String | O | OAuth 인증 후 발급된 임시 토큰 |

**Request** (form-data):

| 필드 | 타입 | 필수 | 제약 | 설명 |
|------|------|------|------|------|
| `accountId` | String | O | max 20 | 계정 ID |
| `profileName` | String | O | max 20 | 프로필 이름 |
| `profileImage` | MultipartFile | O | 비어있지 않은 파일 | 프로필 이미지 |
| `password` | String | O | 8~20자 | 비밀번호 |

**Response**:

```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "isProfileCompleted": true
}
```

---

### 1-4. 토큰 재발급

```
POST /auth/reissue
Content-Type: application/json
```

**Request**:

```json
{
  "refreshToken": "string"
}
```

**Response**:

```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

**에러**:
- `REFRESH_TOKEN_NOT_FOUND` (401): 리프레시 토큰을 찾을 수 없음
- `EXPIRED_JWT` (401): 토큰 만료

---

### 1-5. 온보딩 컨텍스트 조회

```
GET /auth/onboarding-context
```

**인증**: 불필요

**Response**:

```json
{
  "pendingSchoolHours": true
}
```

**설명**:
- 현재 시간이 학교 시간대인지 반환한다.
- 가입/온보딩 화면에서 학교 시간 무음 안내 또는 방과 후 알림 예약 UI를 띄우기 위한 컨텍스트다.

---

## 2. Daily Plan (일일 계획)

> BC: `planning` / Controller: `DailyPlanController`
> Base Path: `/daily-plans`

---

### 2-1. 일일 계획 생성

```
POST /daily-plans
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "planDate": "2026-04-24"
}
```

**Response**: 없음 (200 OK)

**에러**:
- `DAILY_PLAN_ALREADY_EXISTS` (409): 이미 존재하는 일일 계획

---

### 2-2. 오늘 일일 계획 조회

```
GET /daily-plans/today
Authorization: Bearer {token}
```

**Response**:

```json
{
  "dailyPlanId": "uuid",
  "planDate": "2026-04-24",
  "tasks": [
    {
      "taskId": "uuid",
      "content": "string",
      "completed": false,
      "taskType": "GENERAL",
      "topPicked": true,
      "topPickDetail": {
        "estimatedMinutes": 30,
        "memo": "string"
      }
    }
  ],
  "morningTasks": [
    {
      "taskId": "uuid",
      "content": "string",
      "completed": false,
      "taskType": "MORNING",
      "topPicked": false,
      "topPickDetail": null
    }
  ]
}
```

**TaskType enum**: `GENERAL`, `MORNING`

---

### 2-3. 날짜별 일일 계획 조회

```
GET /daily-plans?planDate=2026-04-24
Authorization: Bearer {token}
```

**Response**: 2-2와 동일

**에러**:
- `DAILY_PLAN_NOT_FOUND` (404): 일일 계획을 찾을 수 없음

---

## 3. Mind Sweep (생각 정리)

> BC: `planning` / Controller: `MindSweepController`
> Base Path: `/daily-plans/{dailyPlanId}/mind-sweeps`

---

### 3-1. Mind Sweep 태스크 목록 조회

```
GET /daily-plans/{dailyPlanId}/mind-sweeps
Authorization: Bearer {token}
```

**Response**:

```json
[
  {
    "taskId": "uuid",
    "content": "string",
    "completed": false
  }
]
```

---

### 3-2. Mind Sweep 태스크 추가

```
POST /daily-plans/{dailyPlanId}/mind-sweeps
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "content": "string (max 255)"
}
```

**Response**: 없음 (200 OK)

---

### 3-3. Mind Sweep 태스크 수정

```
PUT /daily-plans/{dailyPlanId}/mind-sweeps/{taskId}
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "content": "string (max 255)"
}
```

**Response**: 없음 (200 OK)

---

### 3-4. Mind Sweep 태스크 삭제

```
DELETE /daily-plans/{dailyPlanId}/mind-sweeps/{taskId}
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

---

### 3-5. Mind Sweep 태스크 완료

```
PATCH /daily-plans/{dailyPlanId}/mind-sweeps/{taskId}/complete
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

---

### 3-6. Mind Sweep 태스크 완료 취소

```
PATCH /daily-plans/{dailyPlanId}/mind-sweeps/{taskId}/uncomplete
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

---

## 4. Top Picks (핵심 행동 선택)

> BC: `planning` / Controller: `TopPicksController`
> Base Path: `/daily-plans/{dailyPlanId}/top-picks`

---

### 4-1. Top Pick 목록 조회

```
GET /daily-plans/{dailyPlanId}/top-picks
Authorization: Bearer {token}
```

**Response**:

```json
[
  {
    "taskId": "uuid",
    "content": "string",
    "completed": false,
    "estimatedMinutes": 30,
    "memo": "오늘 반드시 끝내기"
  }
]
```

---

### 4-2. Top Pick 선택

```
POST /daily-plans/{dailyPlanId}/top-picks/{taskId}
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "estimatedMinutes": 30,
  "memo": "string (max 255)"
}
```

**Response**: 없음 (200 OK)

**에러**:
- `CORE_SELECTED_LIMIT_EXCEEDED` (400): Top Pick 개수 제한 초과 (BehaviorProfile 기반 동적 제한: LOW=1, MEDIUM=2, HIGH=3)
- `TASK_NOT_FOUND` (404): 작업을 찾을 수 없음

---

### 4-3. Top Pick 해제

```
DELETE /daily-plans/{dailyPlanId}/top-picks/{taskId}
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

---

## 5. Morning Task (아침 작업)

> BC: `planning` / Controller: `MorningTaskController`
> Base Path: `/morning-tasks`

---

### 5-1. 아침 작업 목록 조회

```
GET /morning-tasks?targetDate=2026-04-24
Authorization: Bearer {token}
```

**Response**:

```json
[
  {
    "taskId": "uuid",
    "content": "string",
    "completed": false
  }
]
```

---

### 5-2. 아침 작업 생성

```
POST /morning-tasks?targetDate=2026-04-24
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "content": "string (max 255)"
}
```

**Response**: 없음 (200 OK)

---

### 5-3. 아침 작업 수정

```
PUT /morning-tasks/{dailyPlanId}/{taskId}
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "content": "string (max 255)"
}
```

**Response**: 없음 (200 OK)

---

### 5-4. 아침 작업 삭제

```
DELETE /morning-tasks/{dailyPlanId}/{taskId}
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

---

### 5-5. 아침 작업 완료

```
PATCH /morning-tasks/{dailyPlanId}/{taskId}/complete
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

---

### 5-6. 아침 작업 완료 취소

```
PATCH /morning-tasks/{dailyPlanId}/{taskId}/uncomplete
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

---

## 6. Timetable (시간표)

> BC: `planning` / Controller: `TimetableController`, `SlotController`
> Base Path: `/timetables`

---

### 6-1. 시간표 조회

```
GET /timetables?dailyPlanId={dailyPlanId}
Authorization: Bearer {token}
```

**Response**:

```json
{
  "timetableId": "uuid",
  "dailyPlanId": "uuid",
  "topPickTotal": 2,
  "slots": [
    {
      "slotId": "uuid",
      "taskId": "uuid",
      "content": "string",
      "startTime": "09:00:00",
      "endTime": "10:00:00",
      "topPick": true
    }
  ]
}
```

---

### 6-2. Top Pick 슬롯 배정

```
POST /timetables/{timetableId}/slots/tasks/{taskId}/top-picks
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "startTime": "09:00:00",
  "endTime": "10:00:00"
}
```

**Response**: 없음 (200 OK)

**에러**:
- `TIME_OVERLAP` (400): 다른 시간과 겹침
- `INVALID_TIME_RANGE` (400): 유효하지 않은 시간 범위

---

### 6-3. 일반 태스크 슬롯 배정

```
POST /timetables/{timetableId}/slots/tasks/{taskId}
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "startTime": "10:00:00",
  "endTime": "11:00:00"
}
```

**Response**: 없음 (200 OK)

---

### 6-4. 직접 슬롯 추가

```
POST /timetables/{timetableId}/slots/daily-plans/{dailyPlanId}/direct
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "content": "string (max 255)",
  "startTime": "14:00:00",
  "endTime": "15:00:00"
}
```

**Response**: 없음 (200 OK)

---

### 6-5. 슬롯 시간 변경

```
PATCH /timetables/{timetableId}/slots/{slotId}/reschedule
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "startTime": "11:00:00",
  "endTime": "12:00:00"
}
```

**Response**: 없음 (200 OK)

---

### 6-6. 슬롯 삭제

```
DELETE /timetables/{timetableId}/slots/{slotId}
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

---

## 7. Focus Session (집중 세션)

> BC: `focus` / Controller: `FocusSessionController`
> Base Path: `/focus-sessions`

---

### 7-1. 집중 세션 시작

```
POST /focus-sessions/start
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "presetMinutes": 5
}
```

**허용 presetMinutes**: `3`, `5`, `10`, `25`

**Response**:

```json
{
  "focusSessionId": "uuid",
  "startedAt": "2026-04-24T01:00:00Z",
  "endedAt": null,
  "recordedElapsedSeconds": null,
  "elapsedSeconds": 0,
  "inProgress": true,
  "presetMinutes": 5,
  "presetSeconds": 300,
  "presetCompletionRate": null
}
```

**에러**:
- `FOCUS_SESSION_ALREADY_IN_PROGRESS` (409): 이미 진행 중인 세션 존재
- `INVALID_FOCUS_SESSION` (400): 허용되지 않은 프리셋 또는 잘못된 세션 값

---

### 7-2. 집중 세션 종료

```
PATCH /focus-sessions/stop
Authorization: Bearer {token}
```

**Response**:

```json
{
  "focusSessionId": "uuid",
  "startedAt": "2026-04-24T01:00:00Z",
  "endedAt": "2026-04-24T01:30:00Z",
  "recordedElapsedSeconds": 1800,
  "elapsedSeconds": 1800,
  "inProgress": false,
  "presetMinutes": 25,
  "presetSeconds": 1500,
  "presetCompletionRate": 1.2
}
```

**에러**:
- `FOCUS_SESSION_NOT_FOUND` (404): 진행 중인 세션 없음
- `FOCUS_SESSION_ALREADY_COMPLETED` (400): 이미 완료된 세션

---

### 7-3. 오늘 세션 조회

```
GET /focus-sessions/today
Authorization: Bearer {token}
```

**Response**:

```json
{
  "targetDate": "2026-04-24",
  "queriedAt": "2026-04-24T03:00:00Z",
  "totalFocusSeconds": 5400,
  "focusing": false,
  "sessions": [
    {
      "focusSessionId": "uuid",
      "startedAt": "2026-04-24T01:00:00Z",
      "endedAt": "2026-04-24T01:30:00Z",
      "recordedElapsedSeconds": 1800,
      "elapsedSeconds": 1800,
      "inProgress": false,
      "presetMinutes": 25,
      "presetSeconds": 1500,
      "presetCompletionRate": 1.2
    }
  ]
}
```

---

### 7-4. 재시작 카드 조회

```
GET /focus-sessions/recovery-card
Authorization: Bearer {token}
```

**Response**:

```json
{
  "needsRecovery": true,
  "recoveryType": "MISSED_FOCUS",
  "suggestedAction": "어제는 쉬어갔어요. 지금 바로 시작해볼까요?",
  "suggestedDurationMinutes": 5,
  "yesterdayFocusSeconds": 0,
  "yesterdayTopPickCompletionRate": 0.0,
  "postExamMode": false,
  "recentExamScheduleId": null,
  "recentExamType": null,
  "recentExamTitle": null,
  "recentExamDate": null,
  "recentExamSubject": null,
  "daysSinceRecentExam": null,
  "daysSinceLastSession": 3
}
```

**RecoveryType enum**: `POST_EXAM_RECOVERY`, `LONG_ABSENCE`, `MISSED_FOCUS`, `INCOMPLETE_TOP_PICK`, `BOTH`, `NONE`

**suggestedAction 분기**:
- `RecoveryStyle`과 `CoachingMode` 조합을 기반으로 메시지를 생성한다.
- 행동 프로필이 없으면 기본 회복 메시지를 사용한다.

| RecoveryStyle | 예시 메시지 |
|---------------|-------------------|
| `QUICK_RESTART` | "어제는 쉬어갔어요. 지금 바로 시작해볼까요?" |
| `NEEDS_REFLECTION` | "어제 무엇이 어려웠는지 한 줄만 남겨볼까요?" |
| `SLOW_REBUILDER` | "3분만 해볼까요? 작게 시작하면 돼요." |
| (프로필 없음) | "다시 시작해볼까요?" |

---

### 7-5. 재시작 카드 액션 기록

```
POST /focus-sessions/recovery-card/actions
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "action": "START"
}
```

**RecoveryCardAction enum**: `START`, `REFLECT`, `DISMISS`

**Response**: 없음 (204 No Content)

**설명**:
- 사용자가 Recovery Card에서 수행한 행동을 분석 이벤트(`RECOVERY_CARD_ACTIONED`)로 기록한다.
- 분석 이벤트 기록 실패는 주요 사용자 흐름을 막지 않는다.

---

## 8. StudyRoom (스터디룸)

> BC: `study_room` / Controller: `RoomController`, `ParticipantController`, `MyParticipationController`
> Base Path: `/rooms`, `/my-participations`

---

### 8-1. 방 생성

```
POST /rooms
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "name": "string (max 20)",
  "visibility": "PUBLIC"
}
```

**Visibility enum**: `PUBLIC`, `PRIVATE`

**Response**:

```json
{
  "roomId": "uuid",
  "inviteCode": "string (PRIVATE일 때만 값 존재, PUBLIC이면 null)"
}
```

---

### 8-2. 공개 방 전체 조회

```
GET /rooms
Authorization: Bearer {token}
```

**Response**:

```json
[
  {
    "roomId": "uuid",
    "name": "string",
    "createdAt": "2026-04-24T09:00:00"
  }
]
```

---

### 8-3. 방 상세 조회

```
GET /rooms/{roomId}
Authorization: Bearer {token}
```

**Response**:

```json
{
  "roomId": "uuid",
  "name": "string",
  "leaderUserId": "uuid",
  "currentCount": 3,
  "createdAt": "2026-04-24T09:00:00",
  "participants": [
    {
      "participantId": "uuid",
      "userId": "uuid",
      "participantName": "string",
      "sessionMode": "FOCUS",
      "joinedAt": "2026-04-24T09:00:00"
    }
  ]
}
```

**SessionMode enum**: `WAITING`, `FOCUS`, `REST`, `ENDED`

---

### 8-4. 방 참여

```
POST /rooms/{roomId}/join
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "inviteCode": "string (PRIVATE 방일 때 필수, PUBLIC은 null 가능)"
}
```

**Response**: 없음 (200 OK)

**에러**:
- `ALREADY_JOINED` (409): 이미 참여 중
- `ROOM_NOT_FOUND` (404): 방을 찾을 수 없음
- `PRIVATE_ROOM_REQUIRES_INVITE_CODE` (400): 비공개 방은 초대 코드 필요
- `INVALID_INVITE_CODE` (400): 유효하지 않은 초대 코드

---

### 8-5. 방 퇴장

```
POST /rooms/{roomId}/leave
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

---

### 8-6. 참여자 강퇴 (리더 전용)

```
DELETE /rooms/{roomId}/participants/{targetUserId}
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

**에러**:
- `NOT_LEADER` (403): 리더만 수행 가능
- `LEADER_CANNOT_KICK_SELF` (400): 리더는 자신을 내보낼 수 없음

---

### 8-7. 방 참여자 목록 조회

```
GET /rooms/{roomId}/participants
Authorization: Bearer {token}
```

**Response**:

```json
[
  {
    "participantId": "uuid",
    "userId": "uuid",
    "participantName": "string",
    "sessionMode": "WAITING",
    "joinedAt": "2026-04-24T09:00:00"
  }
]
```

---

### 8-8. 집중 시작

```
PATCH /rooms/{roomId}/participants/focus
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

**에러**:
- `ALREADY_FOCUSING` (400): 이미 집중 중
- `PARTICIPANT_ALREADY_ENDED` (400): 이미 퇴장한 참여자

---

### 8-9. 휴식 전환

```
PATCH /rooms/{roomId}/participants/break
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

**에러**:
- `NOT_FOCUSING` (400): 현재 집중 중이 아님 (WAITING에서도 REST로 전환 가능)
- `PARTICIPANT_ALREADY_ENDED` (400): 이미 퇴장한 참여자

---

### 8-10. 내 참여 현황 조회

```
GET /my-participations
Authorization: Bearer {token}
```

**Response**:

```json
[
  {
    "roomId": "uuid",
    "participantId": "uuid",
    "sessionMode": "FOCUS",
    "joinedAt": "2026-04-24T09:00:00"
  }
]
```

---

## 9. StudyRoom Chat (스터디룸 채팅)

> BC: `study_room` / Controller: `StudyRoomChatController`
> 프로토콜: STOMP over WebSocket

### 연결 정보

| 항목 | 값 |
|------|------|
| WebSocket 엔드포인트 | `/ws` (SockJS fallback 지원) |
| STOMP Prefix (발송) | `/app` |
| STOMP Prefix (구독) | `/topic`, `/queue` |

---

### 9-1. 채팅 메시지 발송

```
STOMP SEND /app/rooms/{roomId}/chat
```

**Payload**:

```json
{
  "content": "string (max 500)"
}
```

**브로드캐스트 토픽**: `/topic/rooms/{roomId}/chat`

**브로드캐스트 메시지**:

```json
{
  "roomId": "uuid",
  "senderId": "uuid",
  "senderName": "string",
  "content": "string",
  "sentAt": "2026-04-24T01:00:00Z"
}
```

**조건**: 발송자의 `sessionMode`가 `REST`일 때만 허용

**에러 큐**: `/user/queue/errors`

```json
{
  "statusCode": 400,
  "message": "현재 상태에서는 채팅을 보낼 수 없습니다.",
  "timestamp": "2026-04-24T01:00:00Z"
}
```

**에러**:
- `CHAT_NOT_ALLOWED` (403): 현재 상태에서 채팅 불가 (FOCUS/WAITING/ENDED 상태)
- `INVALID_CHAT_MESSAGE` (400): 유효하지 않은 채팅 메시지

---

## 10. Tiny Win (작은 성취)

> BC: `feedback` / Controller: `TinyWinController`
> Base Path: `/tiny-wins`

---

### 10-1. Tiny Win 생성

```
POST /tiny-wins
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "title": "string (max 30)",
  "content": "string (max 3000)"
}
```

**Response**: 없음 (200 OK)

---

### 10-2. Tiny Win 전체 조회

```
GET /tiny-wins
Authorization: Bearer {token}
```

**Response**:

```json
[
  {
    "tinyWinId": "uuid",
    "title": "string",
    "content": "string",
    "localDate": "2026-04-24"
  }
]
```

---

### 10-3. Tiny Win 단건 조회

```
GET /tiny-wins/{tinyWinId}
Authorization: Bearer {token}
```

**Response**:

```json
{
  "tinyWinId": "uuid",
  "title": "string",
  "content": "string",
  "localDate": "2026-04-24"
}
```

**에러**:
- `TINY_WIN_NOT_FOUND` (404): 작은 성과를 찾을 수 없음

---

### 10-4. Tiny Win 제목 수정

```
PATCH /tiny-wins/{tinyWinId}/title
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "title": "string (max 30)"
}
```

**Response**: 없음 (200 OK)

---

### 10-5. Tiny Win 내용 수정

```
PATCH /tiny-wins/{tinyWinId}/content
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "content": "string (max 3000)"
}
```

**Response**: 없음 (200 OK)

---

### 10-6. Tiny Win 삭제

```
DELETE /tiny-wins/{tinyWinId}
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

---

## 11. Daily Reflection (일일 회고)

> BC: `feedback` / Controller: `DailyReflectionController`
> Base Path: `/daily-reflections`

---

### 11-1. 일일 회고 생성

```
POST /daily-reflections
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "reflectionDate": "2026-04-24",
  "whatWentWell": "string (max 500)",
  "whatBrokeDown": "string (max 1000)",
  "ifCondition": "string (max 500)",
  "thenAction": "string (max 500)"
}
```

**필드 설명**:

| 필드 | 설명 | 예시 |
|------|------|------|
| `whatWentWell` | 오늘 잘한 것 | "아침에 계획대로 시작함" |
| `whatBrokeDown` | 오늘 무너진 지점 | "점심 이후 핸드폰에 빠짐" |
| `ifCondition` | If: 실패 상황 | "핸드폰이 자꾸 눈에 들어올 때" |
| `thenAction` | Then: 복귀 행동 | "서랍에 넣고 타이머를 시작한다" |

**Response**: 없음 (200 OK)

**에러**:
- `DAILY_REFLECTION_ALREADY_EXISTS` (409): 해당 날짜에 이미 회고 존재

---

### 11-2. 일일 회고 조회

```
GET /daily-reflections?targetDate=2026-04-24
Authorization: Bearer {token}
```

**Response**:

```json
{
  "dailyReflectionId": "uuid",
  "reflectionDate": "2026-04-24",
  "whatWentWell": "string",
  "whatBrokeDown": "string",
  "ifCondition": "string",
  "thenAction": "string"
}
```

**에러**:
- `DAILY_REFLECTION_NOT_FOUND` (404): 일일 회고를 찾을 수 없음

---

### 11-3. 일일 회고 수정

```
PATCH /daily-reflections/{dailyReflectionId}
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "whatWentWell": "string (max 500)",
  "whatBrokeDown": "string (max 1000)",
  "ifCondition": "string (max 500)",
  "thenAction": "string (max 500)"
}
```

**Response**: 없음 (200 OK)

---

## 12. Future Vision (미래 비전)

> BC: `visioning` / Controller: `FutureVisionController`
> Base Path: `/future-vision`

---

### 12-1. 비전 생성

```
POST /future-vision
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Request** (form-data):

| 필드 | 타입 | 필수 | 제약 | 설명 |
|------|------|------|------|------|
| `weeklyVisionImageUrl` | MultipartFile | O | 비어있지 않은 파일 | 주간 비전 이미지 |
| `yearlyVisionImageUrl` | MultipartFile | O | 비어있지 않은 파일 | 연간 비전 이미지 |
| `yearlyVisionDescription` | String | O | max 100 | 연간 비전 설명 |

**Response**: 없음 (200 OK)

**에러**:
- `FUTURE_VISION_ALREADY_EXISTS` (409): 이미 존재하는 비전

---

### 12-2. 내 비전 조회

```
GET /future-vision
Authorization: Bearer {token}
```

**Response**:

```json
{
  "futureVisionId": "uuid",
  "weeklyVisionImageUrl": "https://...",
  "yearlyVisionImageUrl": "https://...",
  "yearlyVisionDescription": "string",
  "yearlyVisionCreatedAt": "2026-04-24"
}
```

---

### 12-3. 주간 비전 조회

```
GET /future-vision/weekly
Authorization: Bearer {token}
```

**Response**:

```json
{
  "futureVisionId": "uuid",
  "weeklyVisionImageUrl": "https://..."
}
```

---

### 12-4. 연간 비전 조회

```
GET /future-vision/yearly
Authorization: Bearer {token}
```

**Response**:

```json
{
  "futureVisionId": "uuid",
  "yearlyVisionImageUrl": "https://...",
  "yearlyVisionDescription": "string",
  "yearlyVisionCreatedAt": "2026-04-24"
}
```

---

### 12-5. 주간 비전 수정

```
PATCH /future-vision/weekly
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Request** (form-data):

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `weeklyVisionImageUrl` | MultipartFile | O | 주간 비전 이미지 |

**Response**: 없음 (200 OK)

---

### 12-6. 연간 비전 수정

```
PATCH /future-vision/yearly
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Request** (form-data):

| 필드 | 타입 | 필수 | 제약 | 설명 |
|------|------|------|------|------|
| `yearlyVisionImageUrl` | MultipartFile | O | 비어있지 않은 파일 | 연간 비전 이미지 |
| `yearlyVisionDescription` | String | O | max 100 | 연간 비전 설명 |

**Response**: 없음 (200 OK)

---

## 13. Focus Statistics (집중 통계)

> BC: `statistics` / Controller: `FocusStatisticsController`
> Base Path: `/focus-statistics`

---

### 13-1. 일별 통계 조회

```
GET /focus-statistics/daily?targetDate=2026-04-24
Authorization: Bearer {token}
```

**Response**:

```json
{
  "targetDate": "2026-04-24",
  "queriedAt": "2026-04-24T03:00:00Z",
  "periodStartDate": "2026-04-24",
  "periodEndDate": "2026-04-24",
  "dayCount": 1,
  "coveredDayCount": 1,
  "totalFocusSeconds": 5400,
  "averageDailyFocusSeconds": 5400,
  "status": "FINAL",
  "dataSource": "SUMMARY"
}
```

**FocusStatisticsStatus enum**: `FINAL`, `PARTIAL`, `FUTURE_EMPTY`
- `FINAL`: 마감 완료된 데이터
- `PARTIAL`: 오늘 등 아직 진행 중인 날짜 포함
- `FUTURE_EMPTY`: 미래 날짜 (데이터 없음)

**FocusStatisticsDataSource enum**: `NONE`, `SUMMARY`, `RAW`, `MIXED`

---

### 13-2. 주별 통계 조회

```
GET /focus-statistics/weekly?targetDate=2026-04-24
Authorization: Bearer {token}
```

**Response**: 13-1과 동일 구조 (`periodStartDate`~`periodEndDate`가 해당 주 월~일)

---

### 13-3. 월별 통계 조회

```
GET /focus-statistics/monthly?targetDate=2026-04-24
Authorization: Bearer {token}
```

**Response**: 13-1과 동일 구조 (`periodStartDate`~`periodEndDate`가 해당 월 1일~말일)

---

### 13-4. 시간대별 집중 분포 조회

```
GET /focus-statistics/time-of-day?targetDate=2026-04-24
Authorization: Bearer {token}
```

**Response**:

```json
{
  "targetDate": "2026-04-24",
  "queriedAt": "2026-04-24T03:00:00Z",
  "totalFocusSeconds": 3600,
  "status": "PARTIAL",
  "dataSource": "RAW",
  "hourlyBuckets": [
    { "hourOfDay": 9, "focusSeconds": 1800 },
    { "hourOfDay": 10, "focusSeconds": 1800 }
  ]
}
```

---

### 13-5. 순공 타이밍 추천

```
GET /focus-statistics/timing-recommendation
Authorization: Bearer {token}
```

**Response**:

```json
{
  "targetDate": "2026-04-24",
  "queriedAt": "2026-04-24T01:00:00Z",
  "recommendedHours": [
    { "hourOfDay": 9, "averageFocusSeconds": 1200 },
    { "hourOfDay": 14, "averageFocusSeconds": 900 }
  ],
  "reason": "최근 2주 평일 데이터 기준 집중 시간이 가장 길었던 시간대입니다.",
  "basedOnData": true
}
```

**로직**:
- 최근 14일 데이터에서 오늘과 같은 유형(평일/주말) 필터
- 시간대별 평균 집중 시간 상위 1~2개 추천
- 데이터 부족 시 BehaviorProfile의 `preferredFocusStartHour`/`EndHour` fallback
- 프로필도 없으면 빈 추천 (`basedOnData: false`, `reason: "데이터가 아직 없어요"`)

---

## 14. Behavior Profile (성향 진단)

> BC: `personalization` / Controller: `BehaviorProfileController`
> Base Path: `/behavior-profiles`

---

### 14-1. 프로필 생성 (온보딩)

```
POST /behavior-profiles
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "executionDifficulty": "MEDIUM",
  "socialPreference": "LOW",
  "recoveryStyle": "QUICK_RESTART",
  "examTrack": "NAESIN",
  "preferredFocusStartHour": 9,
  "preferredFocusEndHour": 21,
  "coachingMode": "GENTLE"
}
```

**Enum 값**:

| 필드 | 가능한 값 | 설명 |
|------|----------|------|
| `executionDifficulty` | `LOW`, `MEDIUM`, `HIGH` | 실행 난이도 (LOW=Top Pick 1개, MEDIUM=2개, HIGH=3개) |
| `socialPreference` | `LOW`, `MEDIUM`, `HIGH` | 소셜 자극 선호도 |
| `recoveryStyle` | `QUICK_RESTART`, `NEEDS_REFLECTION`, `SLOW_REBUILDER` | 실패 후 복귀 성향 |
| `examTrack` | `UNDECIDED`, `NAESIN`, `MOPYUNG_SUNUNG`, `BOTH` | 시험 준비 트랙 |
| `coachingMode` | `GENTLE`, `NEUTRAL`, `STRICT` | 코칭 톤 |
| `preferredFocusStartHour` | 0~23 | 선호 집중 시작 시각 |
| `preferredFocusEndHour` | 0~23 | 선호 집중 종료 시각 |

**Response**: 없음 (200 OK)

**에러**:
- `BEHAVIOR_PROFILE_ALREADY_EXISTS` (409): 이미 존재하는 프로필

---

### 14-2. 내 프로필 조회

```
GET /behavior-profiles/me
Authorization: Bearer {token}
```

**Response**:

```json
{
  "behaviorProfileId": "uuid",
  "executionDifficulty": "MEDIUM",
  "socialPreference": "LOW",
  "recoveryStyle": "QUICK_RESTART",
  "examTrack": "NAESIN",
  "preferredFocusStartHour": 9,
  "preferredFocusEndHour": 21,
  "coachingMode": "GENTLE"
}
```

**에러**:
- `BEHAVIOR_PROFILE_NOT_FOUND` (404): 프로필을 찾을 수 없음

---

### 14-3. 내 프로필 수정

```
PUT /behavior-profiles/me
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "executionDifficulty": "HIGH",
  "socialPreference": "MEDIUM",
  "recoveryStyle": "NEEDS_REFLECTION",
  "examTrack": "BOTH",
  "preferredFocusStartHour": 10,
  "preferredFocusEndHour": 22,
  "coachingMode": "NEUTRAL"
}
```

**Response**: 없음 (200 OK)

---

## 15. Accountability (친구 감시 시스템)

> BC: `accountability`
> **제품 위치**: PRD v3.3 기준 친구 감시(opt-in) 기능. 부모/교사 대시보드가 아니다.
> Base Path: `/accountability-relations`

---

### 15-1. 친구 감시 관계 생성

```
POST /accountability-relations
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "targets": ["FOCUS_SESSION", "TOP_PICKS"]
}
```

**MonitoringTarget enum**: `FOCUS_SESSION`, `TOP_PICKS`, `TIMETABLE_TASK`

**Response**: 없음 (200 OK)

---

### 15-2. 초대 코드로 친구 감시자 참여

```
POST /accountability-relations/join
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "inviteCode": "string (max 10)"
}
```

**에러**:
- `INVALID_INVITE_CODE` (400): 유효하지 않은 초대 코드
- `INVITE_CODE_EXPIRED` (400): 초대 코드 만료
- `WATCHER_ALREADY_EXISTS` (409): 이미 감시자 존재
- `CANNOT_JOIN_OWN_ACCOUNTABILITY_RELATION` (400): 자신의 관계에 참여 불가

---

### 15-3. 초대 코드 재발급

```
POST /accountability-relations/invite-code/reissue
Authorization: Bearer {token}
```

**Response**:

```json
{
  "inviteCode": "string",
  "expiresAt": "2026-04-25T09:00:00"
}
```

---

### 15-4. 초대 코드 상태 조회

```
GET /accountability-relations/invite-code/status
Authorization: Bearer {token}
```

**Response**:

```json
{
  "inviteCode": "string",
  "expiredAt": "2026-04-25T09:00:00",
  "expired": false,
  "reissuable": true,
  "watcherConnected": false
}
```

---

### 15-5. 친구 감시 관계 상태 조회

```
GET /accountability-relations/friends
Authorization: Bearer {token}
```

**Response**:

```json
{
  "watchedByFriends": [
    {
      "accountabilityRelationId": "uuid",
      "subjectUserId": "uuid",
      "watcherUserId": "uuid",
      "watcherConnected": true,
      "allowedTargets": ["FOCUS_SESSION", "TOP_PICKS"]
    }
  ],
  "watchingFriends": [
    {
      "accountabilityRelationId": "uuid",
      "subjectUserId": "uuid",
      "watcherUserId": "uuid",
      "watcherConnected": true,
      "allowedTargets": ["FOCUS_SESSION"]
    }
  ]
}
```

---

### 15-6. 공개 범위 수정

```
PATCH /accountability-relations/visibility-policy
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "targets": ["FOCUS_SESSION", "TIMETABLE_TASK"]
}
```

**Response**:

```json
{
  "accountabilityRelationId": "uuid",
  "subjectUserId": "uuid",
  "watcherUserId": "uuid",
  "watcherConnected": true,
  "allowedTargets": ["FOCUS_SESSION", "TIMETABLE_TASK"]
}
```

**에러**:
- `ACCOUNTABILITY_RELATION_NOT_FOUND` (404): 감시 관계 없음
- `NOT_SUBJECT_USER` (403): 관계 주체가 아님

---

### 15-7. 내 관계의 watcher 연결 해제

```
DELETE /accountability-relations/watcher
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

**설명**:
- 내가 subject인 관계에서 연결된 watcher를 제거한다.
- 제거 후 초대 코드는 null 상태가 되며 필요하면 재발급해야 한다.

---

### 15-8. 내가 보고 있는 친구 관계 해제

```
DELETE /accountability-relations/watching
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

**설명**:
- 내가 watcher로 참여 중인 친구 감시 관계를 해제한다.

**에러**:
- `NOT_WATCHER_USER` (403): 해당 관계의 watcher가 아님

---

### 15-9. 친구 감시 대상 집중 세션 조회

```
GET /accountability-relations/watcher/focus-sessions?date=2026-04-24
Authorization: Bearer {token}
```

**Response**: `DailyFocusSummaryView` 또는 204 No Content

---

### 15-10. 친구 감시 대상 집중 세션 범위 조회

```
GET /accountability-relations/watcher/focus-sessions/range?from=2026-04-20&to=2026-04-24
Authorization: Bearer {token}
```

**에러**:
- `MONITORING_TARGET_NOT_ALLOWED` (403): 허용되지 않은 모니터링 대상
- `INVALID_DATE_RANGE` (400): 유효하지 않은 날짜 범위

---

### 15-11. 친구 감시 대상 Top Picks 조회

```
GET /accountability-relations/watcher/top-picks?date=2026-04-24
Authorization: Bearer {token}
```

**Response**: `DailyTopPicksSummaryView` 또는 204 No Content

---

### 15-12. 친구 감시 대상 Top Picks 범위 조회

```
GET /accountability-relations/watcher/top-picks/range?from=2026-04-20&to=2026-04-24
Authorization: Bearer {token}
```

---

### 15-13. 친구 감시 대상 시간표 작업 조회

```
GET /accountability-relations/watcher/timetable-tasks?date=2026-04-24
Authorization: Bearer {token}
```

**Response**: `DailyTimetableSummaryView` 또는 204 No Content

---

### 15-14. 친구 감시 대상 시간표 작업 범위 조회

```
GET /accountability-relations/watcher/timetable-tasks/range?from=2026-04-20&to=2026-04-24
Authorization: Bearer {token}
```

---

## 16. Exam Schedule (시험 일정)

> BC: `planning` / Controller: `ExamScheduleController`  
> Base Path: `/exam-schedules`

---

### 16-1. 시험 일정 생성

```
POST /exam-schedules
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "examType": "NAESIN",
  "title": "중간고사",
  "examDate": "2026-05-10",
  "subject": "수학"
}
```

**ExamType enum**: `NAESIN`, `MOPYUNG`, `HAKPYUNG`, `SUNUNG`, `OTHER`

**Response**:

```json
{
  "examScheduleId": "uuid",
  "examType": "NAESIN",
  "title": "중간고사",
  "examDate": "2026-05-10",
  "subject": "수학",
  "daysUntil": 7,
  "seasonMode": "NAESIN_INTENSIVE"
}
```

**SeasonMode enum**: `SUNUNG_INTENSIVE`, `NAESIN_INTENSIVE`, `MOPYUNG_FOCUSED`, `BASELINE_MODE`

---

### 16-2. 시험 일정 전체 조회

```
GET /exam-schedules
Authorization: Bearer {token}
```

**Response**: `ExamScheduleResponse[]`

---

### 16-3. 다음 시험 일정 조회

```
GET /exam-schedules/next
Authorization: Bearer {token}
```

**Response**: `ExamScheduleResponse`

**에러**:
- `EXAM_SCHEDULE_NOT_FOUND` (404): 다음 시험 일정 없음

---

### 16-4. 현재 시즌 모드 조회

```
GET /exam-schedules/season-mode
Authorization: Bearer {token}
```

**Response**:

```json
{
  "seasonMode": "NAESIN_INTENSIVE",
  "nextExamSchedule": {
    "examScheduleId": "uuid",
    "examType": "NAESIN",
    "title": "중간고사",
    "examDate": "2026-05-10",
    "subject": "수학",
    "daysUntil": 7,
    "seasonMode": "NAESIN_INTENSIVE"
  }
}
```

---

### 16-5. 시험 일정 단건 조회

```
GET /exam-schedules/{examScheduleId}
Authorization: Bearer {token}
```

**Response**: `ExamScheduleResponse`

---

### 16-6. 시험 일정 수정

```
PATCH /exam-schedules/{examScheduleId}
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**: `ExamScheduleRequest`

**Response**: `ExamScheduleResponse`

---

### 16-7. 시험 일정 삭제

```
DELETE /exam-schedules/{examScheduleId}
Authorization: Bearer {token}
```

**Response**: 없음 (200 OK)

---

## 17. Notification Preference (알림 설정)

> BC: `notification` / Controller: `NotificationPreferenceController`  
> Base Path: `/notification/preferences`

---

### 17-1. 내 알림 설정 조회

```
GET /notification/preferences
Authorization: Bearer {token}
```

**Response**:

```json
{
  "notificationPreferenceId": "uuid",
  "dailyFocusEnabled": false,
  "dailyTopPicksEnabled": false,
  "dailyTimetableEnabled": false,
  "accountabilityEnabled": false,
  "schoolHoursQuietEnabled": true,
  "schoolHoursStart": "08:00",
  "schoolHoursEnd": "15:30",
  "weekendSchoolQuietEnabled": false,
  "sleepHoursQuietEnabled": true,
  "maxDailyPushCount": 3
}
```

**설명**:
- 설정이 없으면 기본 설정을 생성한 뒤 반환한다.
- 수면 시간 무음은 정책상 항상 켜져 있어야 한다.

---

### 17-2. 내 알림 설정 수정

```
PATCH /notification/preferences
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "dailyFocusEnabled": true,
  "dailyTopPicksEnabled": true,
  "dailyTimetableEnabled": true,
  "accountabilityEnabled": false,
  "schoolHoursQuietEnabled": true,
  "schoolHoursStart": "08:00",
  "schoolHoursEnd": "15:30",
  "weekendSchoolQuietEnabled": false,
  "sleepHoursQuietEnabled": true,
  "maxDailyPushCount": 3
}
```

**Response**: `NotificationPreferenceResponse`

**에러**:
- `INVALID_NOTIFICATION_PREFERENCE` (400): 필수 필드 누락, 잘못된 시간 범위, 수면 시간 무음 해제 시도, 하루 최대 푸시 수 범위 초과

---

## 18. Web Push

> BC: `notification/web_push` / Controller: `WebPushController`  
> Base Path: `/web-push`

---

### 18-1. VAPID 공개키 조회

```
GET /web-push/vapid-public-key
```

**인증**: 불필요

**Response**:

```json
{
  "publicKey": "base64-url-vapid-public-key"
}
```

---

### 18-2. Web Push 구독 등록

```
POST /web-push/subscribe
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "endpoint": "https://push.example.com/subscription-id",
  "keys": {
    "p256dh": "string",
    "auth": "string"
  },
  "contentEncoding": "aes128gcm",
  "userAgent": "Mozilla/5.0"
}
```

**Response**:

```json
{
  "webPushSubscriptionId": "uuid",
  "endpoint": "https://push.example.com/subscription-id",
  "contentEncoding": "aes128gcm",
  "createdAt": "2026-04-24T01:00:00Z",
  "lastRegisteredAt": "2026-04-24T01:00:00Z"
}
```

**에러**:
- `INVALID_WEB_PUSH_SUBSCRIPTION` (400): endpoint 또는 key 정보가 유효하지 않음

---

## 19. Analytics Event

> BC: `analytics` / Controller: `AnalyticsEventController`  
> Base Path: `/analytics/events`

---

### 19-1. 분석 이벤트 기록

```
POST /analytics/events
Content-Type: application/json
Authorization: Bearer {token}
```

**Request**:

```json
{
  "eventType": "FOCUS_SESSION_STARTED",
  "properties": {
    "source": "home"
  }
}
```

**AnalyticsEventType enum**:
`SIGNUP`, `ONBOARDING_STARTED`, `ONBOARDING_SKIPPED`, `BEHAVIOR_PROFILE_CREATED`, `FUTURE_VISION_CREATED`, `MORNING_TASK_CREATED`, `TOP_PICK_SELECTED`, `TIMETABLE_SLOT_CREATED`, `FOCUS_SESSION_STARTED`, `FOCUS_SESSION_COMPLETED`, `FOCUS_SESSION_ABANDONED`, `TINY_WIN_CREATED`, `DAILY_REFLECTION_CREATED`, `RECOVERY_CARD_VIEWED`, `RECOVERY_CARD_ACTIONED`, `ACCOUNTABILITY_INVITE_SENT`, `ACCOUNTABILITY_FRIEND_JOINED`, `WEB_PUSH_OPT_IN`, `SCHOOL_HOURS_MUTE_TOGGLED`, `EXAM_REGISTERED`

**Response**:

```json
{
  "analyticsEventId": "uuid",
  "eventType": "FOCUS_SESSION_STARTED",
  "occurredAt": "2026-04-24T01:00:00Z",
  "properties": {
    "source": "home"
  }
}
```

**에러**:
- `INVALID_ANALYTICS_EVENT` (400): 이벤트 타입 또는 properties가 유효하지 않음

---

### 19-2. 분석 이벤트 조회

```
GET /analytics/events?from=2026-04-01&to=2026-04-30&eventType=FOCUS_SESSION_STARTED
Authorization: Bearer {token}
```

**Query Parameter**:

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `from` | LocalDate | O | 조회 시작일 |
| `to` | LocalDate | O | 조회 종료일 |
| `eventType` | AnalyticsEventType | X | 이벤트 타입 필터 |

**Response**: `AnalyticsEventResponse[]`

---

## 20. Home Today

> BC: `home` / Controller: `HomeController`  
> Base Path: `/home`

---

### 20-1. 오늘 홈 통합 조회

```
GET /home/today
Authorization: Bearer {accessToken}
```

현재 로그인한 사용자의 홈 화면 요약 데이터를 조회합니다.

**Request Body**: 없음

**Response 200**:

```json
{
  "targetDate": "2026-05-13",
  "futureVision": {
    "futureVisionId": "550e8400-e29b-41d4-a716-446655440000",
    "weeklyVisionImageUrl": "https://example.com/weekly.png",
    "yearlyVisionImageUrl": "https://example.com/yearly.png",
    "yearlyVisionDescription": "올해는 수학 1등급을 만든다",
    "yearlyVisionCreatedAt": "2026-01-01"
  },
  "topPicks": [
    {
      "taskId": "550e8400-e29b-41d4-a716-446655440001",
      "content": "수학 문제집 3단원",
      "completed": false,
      "estimatedMinutes": 30,
      "memo": "오답 위주로 풀기"
    }
  ],
  "timetable": {
    "timetableId": "550e8400-e29b-41d4-a716-446655440002",
    "dailyPlanId": "550e8400-e29b-41d4-a716-446655440003",
    "topPickTotal": 3,
    "slots": [
      {
        "slotId": "550e8400-e29b-41d4-a716-446655440004",
        "taskId": "550e8400-e29b-41d4-a716-446655440001",
        "content": "수학 문제집 3단원",
        "startTime": "09:00:00",
        "endTime": "10:00:00",
        "topPick": true
      }
    ]
  },
  "seasonMode": "BASELINE_MODE",
  "nextExamSchedule": {
    "examScheduleId": "550e8400-e29b-41d4-a716-446655440005",
    "examType": "SUNUNG",
    "title": "수능",
    "examDate": "2026-11-19",
    "subject": "전체",
    "daysUntil": 190,
    "seasonMode": "BASELINE_MODE"
  },
  "notificationPreference": {
    "notificationPreferenceId": "550e8400-e29b-41d4-a716-446655440006",
    "dailyFocusEnabled": true,
    "dailyTopPicksEnabled": true,
    "dailyTimetableEnabled": true,
    "accountabilityEnabled": true,
    "schoolHoursQuietEnabled": false,
    "schoolHoursStart": "08:00",
    "schoolHoursEnd": "17:00",
    "weekendSchoolQuietEnabled": false,
    "sleepHoursQuietEnabled": true,
    "maxDailyPushCount": 5
  },
  "friendAccountability": {
    "relationCreated": true,
    "watchedByFriend": false,
    "watchingFriend": false,
    "inviteCodeStatus": {
      "inviteCode": "ABCD1234",
      "expiredAt": "2026-05-13T10:00:00",
      "expired": false,
      "reissuable": true,
      "watcherConnected": false
    }
  },
  "showFocusTimingCard": false
}
```

**Nullable 규칙**:

```json
{
  "futureVision": null,
  "timetable": null,
  "nextExamSchedule": null,
  "friendAccountability": {
    "relationCreated": false,
    "watchedByFriend": false,
    "watchingFriend": false,
    "inviteCodeStatus": null
  }
}
```

- `futureVision`: 미래 비전이 없으면 `null`
- `timetable`: 오늘 시간표가 없으면 `null`
- `nextExamSchedule`: 다가오는 시험 일정이 없으면 `null`
- `friendAccountability.inviteCodeStatus`: `relationCreated=false`면 `null`
- `inviteCodeStatus.inviteCode`: 발급 전이면 `null`
- `inviteCodeStatus.expiredAt`: 만료 시간이 없으면 `null`

**제거된 필드**:

아래 필드는 더 이상 `GET /home/today` 응답에 포함하지 않습니다.

```json
{
  "todayDailyPlan": "...",
  "morningTasks": "...",
  "focusSessions": "...",
  "activeFocusSession": "...",
  "recoveryCard": "...",
  "behaviorProfile": "..."
}
```

해당 데이터는 홈 요약 응답이 아니라 각 전용 API에서 조회합니다.

---

## Appendix: ErrorCode 전체 목록

| ErrorCode | HTTP Status | 메시지 |
|-----------|-------------|--------|
| `INTERNAL_SERVER_ERROR` | 500 | 서버 내부 오류가 발생했습니다. |
| `INVALID_REQUEST` | 400 | 잘못된 요청입니다. |
| `EXPIRED_JWT` | 401 | JWT 토큰이 만료되었습니다. |
| `INVALID_JWT` | 401 | 유효하지 않은 JWT 토큰입니다. |
| `DUPLICATE_ACCOUNT_ID` | 409 | 이미 존재하는 계정 ID 입니다. |
| `DUPLICATE_USER` | 409 | 이미 존재하는 사용자입니다. |
| `DUPLICATE_EMAIL` | 409 | 이미 존재하는 이메일입니다. |
| `LOGIN_FAILED` | 401 | 로그인에 실패했습니다. |
| `ACCOUNT_NOT_FOUND` | 404 | 계정 ID를 찾을 수 없습니다. |
| `PASSWORD_MISMATCH` | 401 | 비밀번호가 일치하지 않습니다. |
| `USER_NOT_FOUND` | 404 | 사용자를 찾을 수 없습니다. |
| `USER_CREATION_FAILED` | 500 | 사용자 생성에 실패했습니다. |
| `PENDING_OAUTH_NOT_FOUND` | 404 | 대기 중인 OAuth 사용자를 찾을 수 없습니다. |
| `REFRESH_TOKEN_NOT_FOUND` | 401 | 리프레시 토큰을 찾을 수 없습니다. |
| `IMAGE_NOT_FOUND` | 400 | 이미지를 찾을 수 없습니다. |
| `INVALID_FILE_EXTENSION` | 400 | 잘못된 파일 확장자입니다. |
| `FILE_UPLOAD_FAILED` | 500 | 파일 업로드에 실패했습니다. |
| `FILE_DELETE_FAILED` | 500 | 파일 삭제에 실패했습니다. |
| `DAILY_PLAN_ALREADY_EXISTS` | 409 | 이미 존재하는 일일 계획입니다. |
| `DAILY_PLAN_NOT_FOUND` | 404 | 일일 계획을 찾을 수 없습니다. |
| `FUTURE_VISION_ALREADY_EXISTS` | 409 | 이미 존재하는 미래 비전입니다. |
| `FUTURE_VISION_NOT_FOUND` | 404 | 미래 비전을 찾을 수 없습니다. |
| `INVALID_FUTURE_VISION` | 400 | 미래 비전 내용이 유효하지 않습니다. |
| `FUTURE_VISION_CREATION_FAILED` | 500 | 미래 비전 생성에 실패했습니다. |
| `FUTURE_VISION_UPDATE_FAILED` | 500 | 미래 비전 수정에 실패했습니다. |
| `TASK_NOT_FOUND` | 404 | 작업을 찾을 수 없습니다. |
| `INVALID_TASK_TYPE` | 400 | 이 작업에 사용할 수 없는 작업 유형입니다. |
| `TASK_ALREADY_COMPLETED` | 400 | 완료된 작업은 수정할 수 없습니다. |
| `CORE_SELECTED_LIMIT_EXCEEDED` | 400 | 상위 선택 개수 제한을 초과했습니다. |
| `TIMETABLE_NOT_FOUND` | 404 | 타임테이블을 찾을 수 없습니다. |
| `SLOT_NOT_FOUND` | 404 | 슬롯을 찾을 수 없습니다. |
| `TIME_OVERLAP` | 400 | 다른 시간과 겹칩니다. |
| `INVALID_TIME_RANGE` | 400 | 유효하지 않은 시간 범위입니다. |
| `INVALID_DATE_RANGE` | 400 | 유효하지 않은 날짜 범위입니다. |
| `TOP_PICKS_NOT_FULLY_ASSIGNED` | 400 | 모든 상위 선택 작업을 먼저 배정해야 합니다. |
| `TOP_PICK_SLOT_LIMIT_EXCEEDED` | 400 | 상위 선택 슬롯 제한을 초과했습니다. |
| `NOT_TOP_PICKED_TASK` | 400 | 상위 선택된 작업만 예상 시간을 수정할 수 있습니다. |
| `INVALID_TOP_PICK_ESTIMATED_MINUTES` | 400 | 상위 선택 예상 시간은 0보다 커야 합니다. |
| `INVALID_TOP_PICK_MEMO` | 400 | 상위 선택 메모는 비어 있을 수 없으며 255자 이하여야 합니다. |
| `TOP_PICK_DETAIL_NOT_FOUND` | 404 | 상위 선택 상세 정보를 찾을 수 없습니다. |
| `EXAM_SCHEDULE_NOT_FOUND` | 404 | 시험 일정을 찾을 수 없습니다. |
| `INVALID_EXAM_SCHEDULE` | 400 | 시험 일정 내용이 유효하지 않습니다. |
| `TINY_WIN_NOT_FOUND` | 404 | 작은 성과를 찾을 수 없습니다. |
| `INVALID_TINY_WIN` | 400 | 작은 성과 내용이 유효하지 않습니다. |
| `DAILY_REFLECTION_ALREADY_EXISTS` | 409 | 이미 존재하는 일일 회고입니다. |
| `DAILY_REFLECTION_NOT_FOUND` | 404 | 일일 회고를 찾을 수 없습니다. |
| `INVALID_DAILY_REFLECTION` | 400 | 일일 회고 내용이 유효하지 않습니다. |
| `ALREADY_JOINED` | 409 | 이미 해당 방에 참여 중입니다. |
| `PARTICIPANT_NOT_FOUND` | 404 | 참여자를 찾을 수 없습니다. |
| `NOT_LEADER` | 403 | 리더만 이 작업을 수행할 수 있습니다. |
| `LEADER_CANNOT_KICK_SELF` | 400 | 리더는 자신을 내보낼 수 없습니다. |
| `PRIVATE_ROOM_REQUIRES_INVITE_CODE` | 400 | 비공개 방은 초대 코드가 필요합니다. |
| `INVALID_INVITE_CODE` | 400 | 유효하지 않은 초대 코드입니다. |
| `ROOM_NOT_FOUND` | 404 | 방을 찾을 수 없습니다. |
| `ALREADY_FOCUSING` | 400 | 이미 집중 중입니다. |
| `NOT_FOCUSING` | 400 | 현재 집중 중이 아닙니다. |
| `PARTICIPANT_ALREADY_ENDED` | 400 | 이미 퇴장한 참여자입니다. |
| `FOCUS_SESSION_ALREADY_IN_PROGRESS` | 409 | 이미 진행 중인 집중 세션이 있습니다. |
| `FOCUS_SESSION_NOT_FOUND` | 404 | 집중 세션을 찾을 수 없습니다. |
| `FOCUS_SESSION_ALREADY_COMPLETED` | 400 | 이미 완료된 집중 세션입니다. |
| `INVALID_FOCUS_SESSION` | 400 | 유효하지 않은 집중 세션입니다. |
| `DEVICE_TOKEN_NOT_FOUND` | 404 | 디바이스 토큰을 찾을 수 없습니다. |
| `INVALID_NOTIFICATION_PREFERENCE` | 400 | 알림 설정이 유효하지 않습니다. |
| `INVALID_WEB_PUSH_SUBSCRIPTION` | 400 | 웹 푸시 구독 정보가 유효하지 않습니다. |
| `INVALID_ANALYTICS_EVENT` | 400 | 분석 이벤트가 유효하지 않습니다. |
| `INVITE_CODE_NOT_GENERATED` | 400 | 초대 코드가 생성되지 않았습니다. |
| `INVITE_CODE_EXPIRED` | 400 | 초대 코드가 만료되었습니다. |
| `ACCOUNTABILITY_RELATION_NOT_FOUND` | 404 | 감시 관계를 찾을 수 없습니다. |
| `ACCOUNTABILITY_RELATION_ALREADY_EXISTS` | 409 | 이미 존재하는 감시 관계입니다. |
| `MONITORING_TARGET_NOT_ALLOWED` | 403 | 허용되지 않은 모니터링 대상입니다. |
| `NOT_SUBJECT_USER` | 403 | 해당 관계의 주체 유저가 아닙니다. |
| `NOT_WATCHER_USER` | 403 | 해당 관계의 감시자 유저가 아닙니다. |
| `WATCHER_ALREADY_EXISTS` | 409 | 이미 감시자가 존재합니다. |
| `CANNOT_JOIN_OWN_ACCOUNTABILITY_RELATION` | 400 | 자신의 감시 관계에는 참여할 수 없습니다. |
| `BEHAVIOR_PROFILE_ALREADY_EXISTS` | 409 | 이미 존재하는 행동 프로필입니다. |
| `BEHAVIOR_PROFILE_NOT_FOUND` | 404 | 행동 프로필을 찾을 수 없습니다. |
| `INVALID_BEHAVIOR_PROFILE` | 400 | 행동 프로필 내용이 유효하지 않습니다. |
| `INVALID_CHAT_MESSAGE` | 400 | 유효하지 않은 채팅 메시지입니다. |
| `CHAT_NOT_ALLOWED` | 403 | 현재 상태에서는 채팅을 보낼 수 없습니다. |
