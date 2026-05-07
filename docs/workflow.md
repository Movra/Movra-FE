# Agent Workflow

이 문서는 PRD/API/기능명세 기반으로 프론트엔드 기능을 구현할 때 Agent가 따라야 하는 작업 프로토콜이다.

## 1. 입력 문서

- PRD: `docs/prd.md`
- API 명세: `docs/API-specification.md`
- 기능명세: `docs/FEATURE-SPECIFICATION.md`
- 프론트엔드 규칙: `docs/frontend-conventions.md`
- Agent 운영 지침: `AGENT.md`

## 2. 작업 프로토콜

### 1단계. PRD에서 현재 기능 범위 추출

목표:

- 현재 요청과 직접 관련된 사용자 문제, 화면, 흐름만 확인한다.

해야 할 일:

- PRD 전체를 구현 대상으로 보지 않는다.
- 현재 기능과 관련된 섹션만 읽는다.
- 사용자 목표, 진입점, 완료 상태를 적는다.

산출물:

```text
PRD 범위:
- 사용자:
- 문제/목표:
- 포함할 흐름:
- 제외할 흐름:
```

### 2단계. API 명세에서 필요한 endpoint 확인

목표:

- 화면과 상태에 필요한 API 계약을 고정한다.

해야 할 일:

- 필요한 endpoint의 method/path를 확인한다.
- request body, query param, path param을 확인한다.
- response field와 error code를 확인한다.
- 인증 필요 여부를 확인한다.

산출물:

```text
API 계약:
- endpoint:
- request:
- response:
- error:
- auth:
```

중단 조건:

- API 명세에 필요한 endpoint가 없다.
- request/response field가 기능명세와 충돌한다.
- 임의 필드를 추가해야만 UI를 만들 수 있다.

### 3단계. 화면/상태/데이터 흐름 정의

목표:

- 구현 전에 UI 상태와 데이터 흐름을 작게 고정한다.

해야 할 일:

- 화면 단위를 정한다.
- 필요한 컴포넌트만 식별한다.
- local state, server state, URL state를 구분한다.
- loading/error/empty/success 상태를 정의한다.
- submit, retry, navigation 등 사용자 행동을 정의한다.

산출물:

```text
화면/상태:
- 화면:
- 컴포넌트:
- local state:
- server state:
- URL state:
- 사용자 행동:
- loading:
- error:
- empty:
- success:
```

### 4단계. 성공 조건 작성

목표:

- Agent가 스스로 완료를 선언하지 못하도록 객관 조건을 만든다.

성공 조건은 다음 형식으로 쓴다.

```text
성공 조건:
- Given [초기 상태]
- When [사용자 행동 또는 API 결과]
- Then [화면/상태/API 호출 결과]
```

규칙:

- 성공 조건은 테스트나 수동 검증으로 확인 가능해야 한다.
- PRD/API/기능명세에 없는 조건은 넣지 않는다.
- 한 작업에는 하나의 핵심 DoD만 둔다.

### 5단계. 테스트 또는 검증 계획 작성

목표:

- 구현 전 검증 방법을 정한다.

우선순위:

1. 실패하는 unit/component/integration test 작성
2. 테스트 도구가 없으면 테스트 케이스를 먼저 문서화
3. 최소 수동 검증 절차 작성

산출물:

```text
검증 계획:
- 자동 테스트:
- 타입체크:
- 빌드:
- 수동 확인:
- 검증 불가 항목:
```

중단 조건:

- 테스트 없이 큰 기능을 구현해야 한다.
- 검증 방법을 설명할 수 없다.
- 테스트를 삭제/skip해야만 진행할 수 있다.

### 6단계. 최소 구현

목표:

- 성공 조건을 만족하는 가장 작은 코드를 작성한다.

해야 할 일:

- 실패 테스트가 있으면 Green만 목표로 구현한다.
- 불필요한 추상화, 공용 컴포넌트, 전역 상태를 만들지 않는다.
- API 명세 필드만 사용한다.
- UI 상태는 loading/error/empty/success를 빠뜨리지 않는다.
- 기존 코드 스타일을 따른다.

금지:

- "나중에 필요할 것 같아서" 만드는 옵션/확장점
- 명세에 없는 UX 자동 보정
- mock 데이터로 실제 API 계층을 대체
- `any`로 타입 문제 회피

### 7단계. 빌드/테스트/타입체크

목표:

- 완료 판단을 실행 결과로 확인한다.

확인 순서:

1. 관련 테스트
2. 전체 테스트 또는 가능한 테스트 범위
3. 타입체크
4. 빌드
5. lint/format, 프로젝트에 설정된 경우

명령은 프로젝트 스크립트를 우선한다.

```text
검증 결과:
- test:
- typecheck:
- build:
- lint:
```

도구나 스크립트가 없으면 새로 만들지 말고 "아직 없음"으로 보고한다. 도구 도입은 별도 결정으로 분리한다.

공통 하네스 검증:

```powershell
.\scripts\agent-verify.ps1 -Mode quick
```

릴리스 전 또는 완료 보고 전 전체 검증이 필요하면 다음을 사용한다.

```powershell
.\scripts\agent-verify.ps1 -Mode full
```

`package.json`이 없거나 해당 script가 없으면 하네스는 skip으로 보고한다. skip은 성공 증거가 아니므로 완료 보고에 그대로 적는다.

### 8단계. 리팩토링 필요 여부 판단

목표:

- Tidy First 원칙에 따라 구조 변경과 동작 변경을 섞지 않는다.

리팩토링 가능 조건:

- 테스트가 green이다.
- 현재 변경의 이해를 실제로 쉽게 만든다.
- 동작 변경이 없다.
- 같은 커밋에 behavioral 변경과 섞지 않는다.

리팩토링 보류 조건:

- 테스트가 실패 중이다.
- 아직 반복이 충분하지 않다.
- 추상화 근거가 부족하다.
- 범위가 현재 DoD를 넘어간다.

판단 형식:

```text
리팩토링 판단:
- 필요 여부:
- 이유:
- 별도 커밋 필요 여부:
```

### 9단계. 완료 보고

목표:

- 구현 내용보다 검증 증거를 중심으로 보고한다.

보고 형식:

```text
완료 범위:
- [작업한 기능/화면/컴포넌트]

명세 근거:
- PRD:
- 기능명세:
- API:

변경 파일:
- [파일]

검증:
- [명령]: [결과]

제외한 범위:
- [명시적으로 하지 않은 것]

남은 위험:
- [없음 또는 제한사항]
```

## 3. TDD 운영 규칙

- Red 커밋은 실패 테스트만 포함한다.
- Green 커밋은 실패 테스트를 통과시키는 최소 구현만 포함한다.
- Refactor 커밋은 테스트가 통과한 뒤 동작 변경 없이 수행한다.
- 테스트가 불가능한 UI 세부는 수동 검증 절차로 대체할 수 있지만, 이유를 남긴다.
- 테스트가 없는 상태에서 여러 화면을 한 번에 구현하지 않는다.

## 4. Tidy First 운영 규칙

작업을 시작할 때 변경 유형을 먼저 분리한다.

- structural: 이름 변경, 파일 이동, 폴더 정리, 동작 변화 없는 추출
- behavioral: 기능 추가, 버그 수정, API 연동, UI 상태 변경

규칙:

- structural과 behavioral을 같은 커밋에 섞지 않는다.
- behavioral 작업 중 구조 문제가 발견되면 최소 변경으로 끝내고, 리팩토링을 별도 작업으로 분리한다.
- structural 작업 후에는 기존 테스트가 계속 통과해야 한다.
- 리팩토링은 green 상태에서만 한다.

## 5. Warning Signs 대응

### loop

징후:

- 같은 파일/같은 에러를 반복 수정한다.
- 원인을 설명하지 못한 채 코드를 바꾼다.

대응:

- 즉시 수정 중단
- 실패 로그와 관련 코드 재확인
- 가설을 1개로 줄이고 검증
- 2회 실패하면 사용자에게 상태 보고

### scope creep

징후:

- 요청되지 않은 화면, 옵션, UX, 설정을 추가한다.
- PRD 전체를 한 번에 구현하려 한다.

대응:

- 현재 DoD 밖 변경을 되돌리거나 보류한다.
- 필요한 경우 "추가 제안"으로만 보고한다.
- 명세에 없는 제품 판단은 사용자에게 묻는다.

### cheat

징후:

- 테스트 삭제/skip
- 임시 통과 코드
- `any` 남용
- API 계약과 다른 mock
- 실제 API 연동 없이 mock으로 완료 선언

대응:

- 즉시 중단
- 무엇을 속이고 있는지 명시
- 올바른 검증 방법을 다시 제안
- 사용자 확인 없이 완료 보고하지 않음

## 6. 커밋 메시지 규칙

형식:

```text
<type>[<phase>]: <subject>
```

type 후보:

- `feat`
- `fix`
- `refactor`
- `docs`
- `test`
- `chore`
- `perf`
- `ci`

phase 후보:

- `red`
- `green`
- `refactor`
- `structural`
- `behavioral`
- `chore`

규칙:

- `red`와 `green`을 같은 커밋에 섞지 않는다.
- `structural`과 `behavioral`을 같은 커밋에 섞지 않는다.
- 리팩토링은 테스트가 green인 상태에서만 한다.
- 문서 의미 변경은 `docs[behavioral]`로 구분한다.
- 단순 정리, 위치 이동, 오탈자 수정은 `docs[structural]`로 구분한다.
- 커밋 subject는 명령형 또는 간결한 명사형으로 쓴다.

예시:

```text
test[red]: TopPick 선택 실패 상태 검증 추가
feat[green]: TopPick 선택 API 연동
refactor[refactor]: TopPick 상태 변환 함수 분리
docs[behavioral]: 에러 상태 완료 기준 추가
docs[structural]: Agent workflow 섹션 정리
```

## 7. Anti-patterns

다음 패턴이 보이면 즉시 멈춘다.

- 요청되지 않은 기능 추가
- 테스트 없이 대규모 구현
- `any` 남용
- API 명세와 다른 임의 필드 사용
- PRD에 없는 UX 추가
- 컴포넌트 과도한 추상화
- 한 파일에 너무 많은 책임 몰기
- mock 데이터로 실제 API 연동을 대체하고 완료 선언
- 에러/로딩/빈 상태 누락
- 접근성 기본 누락
- 테스트 삭제 또는 skip
- 빌드 실패 상태에서 완료 선언

## 8. PR 템플릿

```markdown
## 범위
- 

## 명세 근거
- PRD:
- 기능명세:
- API:

## 성공 조건
- 

## 검증
- [ ] test:
- [ ] typecheck:
- [ ] build:
- [ ] lint:

## 제외한 범위
- 

## 리스크/후속 결정
- 
```
