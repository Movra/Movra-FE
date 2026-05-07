# Movrara Frontend Agent Harness

이 문서는 Movrara 프론트엔드 프로젝트에서 AI Agent가 임의로 과설계하거나 범위를 확장하지 않고, PRD/API/기능 명세에 맞춰 작은 단위로 검증 가능한 개발을 하도록 통제하는 운영 지침이다.

## 0. 프로젝트 개요

- 개발 범위: 프론트엔드만 개발한다.
- 제품 요구사항 원천: `docs/prd.md`
- API 계약 원천: `docs/API-specification.md`
- 기능 동작 원천: `docs/FEATURE-SPECIFICATION.md`
- 디자인 원칙 원천: `docs/design.md`
- Phase 계획/완료 기록: `docs/phase/`
- 확정된 기술 기본값: React + TypeScript + Vite, React Router, TanStack Query, CSS Modules, Vitest + Testing Library, MSW
- API 기본 URL: `http://localhost:8080`
- 아직 미정인 항목: 완성형 새싹 캐릭터 아트워크, PWA 세부 동작, Web Push 권한 UX, STOMP 연결 재시도 정책, lint/format 세부 규칙
- 원칙: Agent는 신뢰 대상이 아니라 통제 대상이다. 완료 여부는 Agent의 선언이 아니라 명세 충족, 테스트, 타입체크, 빌드 결과로 판단한다.

명세 간 충돌이 있으면 다음 순서로 우선한다.

1. 사용자가 현재 턴에서 명시한 요구
2. `docs/API-specification.md`
3. `docs/FEATURE-SPECIFICATION.md`
4. `docs/prd.md`
5. `docs/design.md`와 `docs/frontend-conventions.md`
6. 기존 코드의 검증된 동작

충돌이 기능 범위나 API 계약을 바꾸는 수준이면 구현을 멈추고 사용자에게 확인한다.
시각 디자인, 브랜드 톤, 토큰, 캐릭터 사용 기준은 `docs/design.md`를 우선하고, 프론트엔드 구현 방식과 상태/API/테스트 규칙은 `docs/frontend-conventions.md`를 우선한다.

## 1. Agent의 역할

Agent는 다음을 수행한다.

- 현재 요청의 범위를 명세에서 최소한으로 추출한다.
- 구현 전에 성공 조건과 검증 계획을 작성한다.
- 가능한 경우 Red -> Green -> Refactor 순서로 작업한다.
- 한 번에 하나의 기능, 하나의 화면, 하나의 컴포넌트, 하나의 DoD만 진행한다.
- 구조 변경과 동작 변경을 분리한다.
- PRD/API 명세에 없는 필드, UX, 흐름, 정책을 만들지 않는다.

Agent는 다음 권한이 없다.

- 스스로 완료를 선언할 권한
- 명세에 없는 제품 결정을 임의로 내릴 권한
- 실패한 테스트나 빌드를 무시하고 완료 처리할 권한
- 테스트를 삭제하거나 skip해서 통과 상태를 만드는 권한

## 2. 작업 전 루틴

모든 작업 전에 다음 체크리스트를 수행한다.

- 요청을 한 문장으로 재정의한다.
- 현재 작업의 DoD를 1개로 제한한다.
- 필요한 명세 범위를 최소한으로 읽는다.
  - 제품 목적/사용자 흐름: `docs/prd.md`의 관련 섹션만 확인
  - 기능 규칙/제약: `docs/FEATURE-SPECIFICATION.md`의 관련 섹션만 확인
  - endpoint/request/response/error: `docs/API-specification.md`의 관련 endpoint만 확인
  - UI/브랜드/토큰: `docs/design.md`의 관련 섹션만 확인
  - Phase 범위: `docs/phase/`의 현재 계획과 완료 기록만 확인
- 성공 조건을 작성한다.
- 테스트 또는 검증 계획을 작성한다.
- 작업 유형을 분류한다.
  - `structural`: 파일 이동, 이름 변경, 폴더 정리, 동작 변화 없는 구조 변경
  - `behavioral`: 사용자 동작, API 연동, 상태, UI 결과가 바뀌는 변경
- 불확실한 항목을 적는다.
  - 명세로 확인 가능하면 먼저 확인한다.
  - 명세에도 없고 제품/기술 결정에 영향을 주면 사용자에게 묻는다.
  - 사소한 구현 선택이면 임시 기본값을 사용하고 보고한다.

작업 시작 전에 다음 형식의 짧은 계획을 남긴다.

```text
범위: [현재 기능/화면/컴포넌트]
근거: [PRD/API/기능명세 경로와 섹션]
성공 조건: [검증 가능한 조건]
검증: [테스트/타입체크/빌드/수동 확인]
작업 유형: [structural 또는 behavioral]
```

## 3. 작업 중 루틴

작업 중에는 다음 규칙을 지킨다.

- 한 번에 하나의 작은 변경만 한다.
- behavior 변경 전 가능한 테스트를 먼저 작성한다.
- 테스트를 먼저 쓰기 어렵다면 검증 계획을 먼저 작성하고, 구현 후 반드시 실행한다.
- API 연동은 명세의 method, path, request field, response field, error code만 사용한다.
- mock은 UI 상태나 테스트 제어를 위한 경계에서만 사용한다. mock만 연결하고 실제 API 연동 완료로 보고하지 않는다.
- 기존 스타일이 있으면 기존 스타일을 따른다.
- 아직 스타일/아키텍처가 정해지지 않은 경우 이 문서의 임시 기본값을 따른다.
- 같은 수정을 2회 이상 반복하면 loop warning으로 간주하고 원인을 다시 분석한다.
- 요청에 없던 UX나 기능이 떠오르면 구현하지 않고 "제안"으로만 보고한다.
- `any`, 임시 통과 코드, 테스트 삭제/skip으로 문제를 숨기지 않는다.

## 4. 작업 완료 기준

Agent는 다음 조건을 충족했다는 증거가 있을 때만 완료 보고를 할 수 있다.

- 현재 DoD가 PRD/기능명세와 일치한다.
- 사용한 endpoint와 데이터 필드가 API 명세와 일치한다.
- 새 동작 또는 수정된 동작을 검증하는 테스트가 있다. 테스트가 불가능한 경우 이유와 대체 검증을 보고한다.
- 타입체크가 통과한다. 타입체크 도구가 아직 없으면 그 사실을 보고한다.
- 빌드가 통과한다. 빌드 스크립트가 아직 없으면 그 사실을 보고한다.
- UI 작업이면 loading, error, empty 상태를 누락하지 않는다.
- UI 작업이면 키보드 접근, label/name, focus, semantic element 등 접근성 기본을 확인한다.
- 구조 변경과 동작 변경이 같은 커밋에 섞이지 않는다.

완료 보고 형식:

```text
완료 범위:
- [구현/수정한 기능]

명세 근거:
- PRD: [경로/섹션]
- 기능명세: [경로/섹션]
- API: [경로/endpoint]

검증:
- [명령 또는 수동 확인]: [결과]

남은 위험:
- [없음 또는 명확한 제한사항]
```

## 5. 금지 행동

다음 행동은 즉시 중단 사유다.

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
- 구조 변경과 동작 변경을 같은 작업/커밋에 혼합
- 명세 충돌을 숨기고 임의 결정

## 6. 코드 수정 원칙

- 변경한 모든 줄은 현재 요청의 성공 조건과 연결되어야 한다.
- 주변 코드 정리, 이름 변경, 폴더 이동은 요청 범위에 포함될 때만 한다.
- 단일 사용을 위한 추상화는 만들지 않는다.
- 컴포넌트, hook, service, util은 책임이 분명할 때만 분리한다.
- 새 의존성은 기본적으로 추가하지 않는다. 필요한 경우 이유, 대안, 영향 범위를 보고하고 사용자 확인을 받는다.
- 타입은 API 명세와 UI 요구에서 출발한다.
- 불가능한 상태를 타입으로 줄이되, 과도한 제네릭이나 범용 유틸은 만들지 않는다.
- 기존 코드에 죽은 코드가 보여도 현재 변경으로 만든 것이 아니면 삭제하지 않는다. 필요하면 보고만 한다.

## 7. 테스트/검증 원칙

- 가능한 경우 Red -> Green -> Refactor를 따른다.
- Red: 실패하는 테스트로 요구사항을 고정한다.
- Green: 테스트를 통과시키는 최소 구현만 한다.
- Refactor: 테스트가 통과하는 상태에서만 구조를 정리한다.
- 테스트는 구현 세부보다 사용자 관찰 가능 동작과 API 계약을 검증한다.
- snapshot만으로 완료를 증명하지 않는다.
- 테스트가 flaky하면 원인을 줄이고, 단순 대기 시간 증가로 덮지 않는다.
- 테스트 삭제, `skip`, `only`, 과도한 mock은 cheat warning으로 본다.
- 빌드/타입체크/테스트 명령이 아직 정해지지 않았다면 `package.json` 스크립트 확정 전까지 "실행 불가"로 보고하고, 임의 도구를 도입하지 않는다.

## 8. 커밋/PR 원칙

커밋 메시지 형식:

```text
<type>[<phase>]: <subject>
```

허용 type:

- `feat`
- `fix`
- `refactor`
- `docs`
- `test`
- `chore`
- `perf`
- `ci`

허용 phase:

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
- 문서 의미 변경은 `docs[behavioral]`로 작성한다.
- 문서 단순 정리, 오탈자, 위치 이동은 `docs[structural]`로 작성한다.
- PR은 하나의 명확한 DoD만 포함한다.
- PR 설명에는 명세 근거, 검증 결과, 제외한 범위를 포함한다.

예시:

```text
test[red]: 로그인 실패 메시지 표시 조건 추가
feat[green]: 로그인 API 오류를 폼 에러로 표시
refactor[refactor]: 로그인 폼 필드 렌더링 정리
docs[behavioral]: API 에러 처리 기준 추가
docs[structural]: 기능 명세 섹션 순서 정리
```

## 9. PRD/API 명세 사용 방식

Need-To-Know 원칙을 적용한다.

- 전체 PRD를 먼저 요약하거나 전체 아키텍처를 만들지 않는다.
- 현재 작업에 필요한 섹션만 읽는다.
- endpoint는 필요한 것만 확인한다.
- response 타입은 실제 사용하는 필드만 모델링한다.
- API 명세에 없는 필드는 만들지 않는다.
- API 명세가 불분명하면 임의 필드를 만들지 말고 사용자에게 확인한다.
- PRD에 없는 UX 보완은 구현하지 말고 제안으로 분리한다.
- 기능명세의 제약과 예외 조건을 성공 조건에 반영한다.

## 10. 막혔을 때 행동 지침

다음 상황이면 즉시 멈추고 원인을 보고한다.

- 같은 오류를 2회 이상 같은 방식으로 수정했다.
- 테스트가 실패하는 이유를 설명할 수 없다.
- 명세와 API가 충돌한다.
- 구현하려면 스택/아키텍처 결정이 필요하다.
- 요청 범위를 넘는 변경이 필요하다.
- 테스트를 삭제하거나 약화해야만 통과할 수 있다.

보고 형식:

```text
막힌 지점:
- [현상]

확인한 근거:
- [명세/코드/테스트]

선택지:
- A: [장점/단점]
- B: [장점/단점]

추천:
- [작은 범위의 추천안]
```

## 11. 결정해야 할 항목과 임시 기본값

아직 확정되지 않은 기술 선택은 다음 기준으로 운영한다.

| 항목 | 결정이 필요한 이유 | 선택지 | 추천 기본값 | 결정 전 임시 운영 방식 |
| --- | --- | --- | --- | --- |
| 프레임워크 | 컴포넌트 모델, 라우팅, 테스트 도구가 달라진다. | React, Vue, Svelte | React + TypeScript | 기존 코드가 있으면 따른다. 없으면 scaffold 전에 결정한다. |
| 라우터 | URL 구조와 화면 분리 기준이 정해진다. | React Router, TanStack Router, Vue Router, SvelteKit routing | 프레임워크 표준 라우터 | 라우트 추가가 필요하면 명세 기반 path만 제안한다. |
| 상태 관리 | 전역 상태 남용을 막고 데이터 소유권을 정한다. | local state, Context, Zustand, Pinia, store library | local first, 필요 시 가벼운 store | 화면 내부 상태는 local, 여러 화면 공유만 전역 후보로 둔다. |
| 서버 상태 관리 | 캐시, 재시도, 동기화 정책이 필요하다. | TanStack Query, SWR, 프레임워크 fetch | TanStack Query | 도입 전에는 API client 함수와 호출부를 분리한다. |
| 스타일링 | 일관된 UI와 유지보수 기준이 필요하다. | CSS Modules, Tailwind, CSS-in-JS, vanilla CSS | CSS Modules 또는 프로젝트 기존 방식 | 기존 방식이 없으면 전역 CSS 최소화, 컴포넌트 단위 class 사용. |
| 테스트 도구 | TDD와 완료 판정의 실행 기준이다. | Vitest/Jest, Testing Library, Playwright/Cypress | Vitest + Testing Library + Playwright smoke | 도구 확정 전에는 테스트 케이스와 수동 검증을 문서화한다. |
| 폴더 구조 | 기능 단위 변경과 책임 분리를 돕는다. | feature-based, layer-based, route-based | feature-based + shared | 기존 구조가 생기기 전까지 파일 수를 최소화한다. |
| API client 방식 | 인증, 에러, 타입, base URL 처리를 통일한다. | fetch wrapper, Axios, generated client | fetch wrapper 또는 generated client | endpoint별 함수를 만들되 전역 추상화는 보류한다. |
| form 처리 | validation, touched, error 표시 기준이 달라진다. | native form, React Hook Form, vee-validate, svelte forms | 프레임워크에서 널리 쓰는 경량 도구 | 단순 폼은 native 상태로 시작한다. |
| validation 방식 | API 요청 전 검증과 에러 메시지 기준이 필요하다. | Zod, Valibot, Yup, custom | Zod 또는 프레임워크 표준 | PRD/API 제약만 검증하고 추가 정책은 만들지 않는다. |
| 디자인 시스템 | 컴포넌트 재사용과 접근성 기준을 정한다. | 자체 DS, headless UI, component library | 초기는 headless/unstyled 우선 | 반복 3회 전에는 공용 컴포넌트로 승격하지 않는다. |
| lint/format 규칙 | 자동 정리와 코드 리뷰 기준이 필요하다. | ESLint/Prettier/Biome | ESLint + Prettier 또는 Biome 단일화 | 기존 설정 전까지 대규모 포맷 변경 금지. |

## 12. 초기 도입 우선순위

1. `package.json` 스크립트 확정: `test`, `typecheck`, `build`, `lint`
2. 테스트 도구 확정: unit/component 우선, 핵심 플로우만 e2e smoke
3. API client 최소 규칙 확정: base URL, auth token, error mapping
4. 폴더 구조 최소안 확정: route/feature/shared 경계
5. 스타일링 방식 확정: 전역 reset/theme와 컴포넌트 스타일 기준
6. form/validation 기준 확정: PRD/API 제약과 메시지 위치
7. PR 템플릿 추가: 명세 근거, 성공 조건, 검증 결과, 제외 범위

## 13. Phase 계획/기록 규칙

`docs/phase/`는 프론트엔드 기능 구현을 Phase 단위로 나누고, 각 Phase의 완료 증거를 남기는 운영 기록이다.

역할:

- `docs/phase/phase-plan.md`는 전체 구현 순서, Phase별 목표, 포함/제외 범위, 완료 조건을 정의한다.
- Phase 완료 시 `docs/phase/phase-N-*.md` 형식의 완료 기록을 남긴다.
- 완료 기록에는 명세 근거, 변경 파일, 실행한 검증, 제외한 범위, 남은 위험을 포함한다.
- `docs/phase/`는 PRD/API/기능명세/디자인 문서를 대체하지 않는다. 구현 범위와 진행 이력을 추적하는 보조 문서다.
- Phase 계획은 사용자의 최신 요청이나 명세 변경으로 조정될 수 있지만, 조정 이유를 `docs/phase/`에 기록한다.

운영 규칙:

- 하나의 Phase는 하나의 명확한 제품 목표와 검증 가능한 DoD를 가진다.
- Phase 진행 중 요청되지 않은 기능을 다음 Phase로 당겨오지 않는다.
- Phase 종료 전에는 `test`, `typecheck`, `build`, `lint` 중 프로젝트에 존재하는 검증을 실행한다.
- 검증 도구가 없거나 백엔드가 실행 중이 아니어서 확인하지 못한 항목은 skip이 아니라 제한사항으로 기록한다.
- 다음 Phase를 시작하기 전에는 직전 Phase 완료 기록을 확인하고, 남은 위험이 현재 범위에 영향을 주는지 판단한다.

## 14. 로컬 하네스 스크립트

현재 저장소는 프론트엔드 스택이 아직 확정되지 않았으므로, hook과 script는 특정 프레임워크나 패키지 매니저를 강제하지 않는다.

사용 가능한 스크립트:

- `.\scripts\agent-verify.ps1 -Mode quick`
  - 필수 하네스 문서 존재 여부를 확인한다.
  - `package.json`이 있으면 존재하는 `lint`, `typecheck`, `test` 스크립트만 실행한다.
  - source 폴더가 있으면 `test.skip`, `test.only`, `any`, `console.log` 등 cheat warning sign을 점검한다.
- `.\scripts\agent-verify.ps1 -Mode full`
  - quick 검증에 더해 `build` 스크립트가 있으면 실행한다.
- `.\scripts\validate-commit-msg.ps1 -Message "feat[green]: add login form"`
  - phase marker 커밋 메시지 형식을 검증한다.
- `.\scripts\install-git-hooks.ps1`
  - `.git` 디렉터리가 있는 경우 `pre-commit`, `commit-msg` hook을 설치한다.

hook 템플릿:

- `hooks/pre-commit.ps1`: quick 검증을 실행한다.
- `hooks/commit-msg.ps1`: 커밋 메시지 형식을 검증한다.

주의:

- hook은 Agent 완료 기준을 대체하지 않는다.
- `package.json` 스크립트가 없으면 검증은 skip으로 보고된다.
- `.git`이 없는 초기 문서 저장소에서는 hook 설치를 실행하지 않는다.
- hook이나 script가 막는 항목을 우회하지 않는다. 필요한 경우 기준을 문서로 변경한 뒤 별도 커밋으로 반영한다.
