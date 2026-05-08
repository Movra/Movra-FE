# Phase Records

`docs/phase/`는 Movrara 프론트엔드 구현을 Phase 단위로 계획하고, 각 Phase가 끝났을 때 완료 증거를 남기는 기록 공간이다.

## 파일 역할

- `phase-plan.md`: 전체 구현 순서와 Phase별 목표, 범위, 완료 조건을 정의한다.
- `phase-legacy.md`: 과거 개별 Phase 완료 파일을 통합한 레거시 기록이다.
- `phase-4-daily-planning-and-toppick.md`: Phase 4 완료 범위와 검증, 남은 위험을 기록한다.
- `phase-6-future-vision-and-exam-schedule.md`: Phase 6 Future Vision/Exam Schedule 완료 범위와 검증, 남은 위험을 기록한다.
- `phase-8-feedback-loop.md`: Phase 8 Feedback Loop 완료 범위와 검증, 남은 위험을 기록한다.
- `phase-9-exam-cycle-recovery-hardening.md`: Phase 9 Exam Cycle And Recovery Hardening 완료 범위와 검증, 남은 위험을 기록한다.
- `phase-11-settings-notification-web-push.md`: Phase 11 Settings/Notification/Web Push 완료 범위와 검증, 남은 위험을 기록한다.
- `Phase-추가적사항.md`: 제공 이미지와 디자인 참고 사항을 보존하는 보조 기록이다.
- 앞으로 새 Phase 완료 기록이 필요하면, `phase-plan.md`의 현재 번호 체계를 기준으로 새 완료 기록을 추가한다.

## 완료 기록 규칙

Phase가 끝날 때마다 다음 내용을 기록한다.

```text
# Phase N. [이름]

## 완료 범위
- 

## 명세 근거
- PRD:
- 기능명세:
- API:
- 디자인:

## 변경 파일
- 

## 검증
- test:
- typecheck:
- build:
- lint:
- manual:

## 제외한 범위
- 

## 남은 위험
- 
```

## 운영 기준

- Phase 계획은 PRD/API/기능명세/디자인 문서를 대체하지 않는다.
- Phase 계획과 실제 구현이 달라지면 변경 이유를 완료 기록에 남긴다.
- 검증이 스킵된 항목은 성공 증거가 아니므로 제한사항으로 적는다.
- 다음 Phase를 시작하기 전 직전 Phase의 남은 위험을 확인한다.
