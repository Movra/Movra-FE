---
title: Spec: HOME 히어로 깊이·톤 강화
type: spec
tags: []
summary: HOME 히어로 깊이·톤 강화
created: 2026-06-18
updated: 2026-06-18
---

# Spec: HOME 히어로 깊이·톤 강화

> status: 🚧 draft (awaiting human approval — review then `intent spec approve <slug>`)

## 문제 정의

[[spec-home-듀오링고풍-리디자인]] 으로 HOME 복잡도는 줄었으나(INT-001), 그 부작용으로 히어로가 '평평하고 색이 단조롭다'. 원인:
- 히어로 배경이 거의 흰색 + 거의 안 보이는 옅은 green blob → 카드가 배경에 묻혀 경계·입체감 없음.
- 화면 전체가 green 단일 톤이라 표면 위계가 안 읽히고 심심함.
- design.md가 정의한 풍부한 green 표면 팔레트(canvas/canvas-soft/surface-tinted/surface-strong, hairline 3단계, leaf blob)와 성장단계 톤이 거의 사용되지 않음.

추가 맥락: Duolingo 풍부함의 상당 부분은 게임화 연출에서 왔는데 우리가 의도적으로 뺐으므로(스트릭·포인트·랭킹 금지), '밋밋함'은 예견된 부작용. 풍부함은 금지 메커니즘이 아니라 허용된 시각 수단으로만 복원한다.

## 목표

HOME 히어로를 'design.md식 차분한 깊이·톤'으로 재구성한다: green 계열 안에서 표면을 레이어링(canvas↔tinted↔card 분리), 헤어라인과 아주 부드러운 입체로 카드를 띄우고, 옅은 leaf blob로 배경에 깊이를 준다. 새 색을 추가하지 않고 '단조로움'과 '평평함'을 동시에 해소한다. 범위: HOME 히어로(.topPickBoard 및 그 첫 화면 영역)부터.

## 가정 (확정)

- '색이 단조롭다'의 해법은 새 포인트 색 도입이 아니라 green 계열 톤 레이어링이다 (green-first 유지).
- '깊이'는 무거운 그림자가 아니라 헤어라인 + 부드러운 소프트 섀도우 + 표면 대비 + leaf blob (design.md elevation 원칙).
- 방향은 차분(에디토리얼)이다 — 풀 일러스트 장면이나 컬러풀/생동감 노선이 아니다.
- 복잡도는 다시 늘리지 않는다: 요소 개수를 늘리는 게 아니라 이미 있는 요소의 시각 마감만 강화.
- API 호출·응답 타입·쿼리 키 등 데이터 구조는 불변. 순수 프론트 시각(CSS 위주)만 수정.
- 게임화 메커니즘(스트릭·포인트·랭킹·손실 프레이밍)은 여전히 금지 — 자명한 안전선.

## 명시적 비목표

- ❌ 새 포인트/액센트 컬러 도입 (보라·파랑 등) — green-first 위반.
- ❌ 풀 일러스트 배경 장면·말풍선·소품 추가 — 차분 노선 아님 + 복잡도 증가.
- ❌ 무거운 드롭섀도우·글로시 3D — design.md 금지.
- ❌ 요소/섹션 추가로 인한 복잡도 재증가.
- ❌ HOME 외 다른 페이지 (이번 범위 아님), API/데이터 변경.

## 경계 예시 (되는 것 / 안 되는 것)

- ✅ 히어로 배경을 canvas/tinted로 분리하고 카드를 surface-card로 띄워 경계 부여 → 안 됨: 흰 위에 흰.
- ✅ 1px hairline(3단계) + 아주 옅은 소프트 섀도우로 입체 → 안 됨: 진한 box-shadow blur 40px.
- ✅ green-soft/green-pale 밴드, leaf blob 농도 ↑로 톤 다양화 → 안 됨: 새 hue(파랑 etc) 추가.
- ✅ 성장단계 톤(seed/sprout/leaf)을 진행 표시에 한해 절제 사용 → 안 됨: 시스템 전반 액센트로 남용.
- ✅ 기존 요소(eyebrow/flow/status/CTA/캐릭터)의 마감만 강화 → 안 됨: 위젯·지표 새로 추가.

## 성공 기준 (눈으로 확인)

1. 히어로 카드가 배경에서 또렷이 분리돼 보인다(표면 대비 + hairline + 소프트 섀도우). → 데스크톱/모바일 스크린샷.
2. 화면에 green 톤이 최소 3단계 이상 레이어로 읽힌다(예: canvas 배경 / tinted 밴드 / white 카드). 단일 흰 톤 아님.
3. 새 hue(green 외 액센트 색) 0건. → CSS grep으로 비-green hex/색 확인.
4. 무거운 그림자 없음(blur 과대 box-shadow 없음), 게임화·손실 어휘 0건.
5. 요소 개수는 INT-001 대비 증가 없음(복잡도 동결).
6. 타입체크·빌드·기존 core-loop 테스트 통과.
