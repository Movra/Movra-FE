# Movra PRD v3.4

> **Version**: 3.4 (MindSweep + TopPick Core Loop)
> **Last Updated**: 2026-04-29
> **Status**: Decision-locked Draft (Zero-to-One)
> **Primary Persona**: 한국 **고등학생** (특히 고2-고3, 90만명 코어)
> **Secondary**: 고1, 중3 (확장 타겟)
> **North Star Metric**: WAU₃₊ — Weekly Active Users with ≥3 Focus Sessions
> **Platform**: Mobile + Tablet Web (PWA), 학교 시간 제약 고려
> **결제 모델**: **학생 직접 결제 (Direct B2C)** — 단일 SKU = "AI 성장 리포트 (1회 결제 → 30일 분석 → 리포트 생성)"
> **Foundation**: 행동과학(Fogg B=MAP) × **신경과학적 메커니즘** 이중 레이어
> **Locked Product Decisions**: MindSweep → TopPick이 MVP 계획 루프의 중심. Future Vision / Timetable은 실행 보조 자산으로 사용. MorningTask는 중요도를 낮춰 전날 밤 보조 연결 장치로 사용. Accountability는 **친구 감시(opt-in)** 로 사용. 부모 동의 게이트는 제거.

---

## 0. 결정사항 잠금 (v3.4)

이 문서는 v3.2의 미결정 질문을 다음과 같이 확정한다.

| 항목 | v3.4 결정 | 제품 의미 |
|------|-----------|-----------|
| **MindSweep** | **핵심 루프 최상단** | 머릿속에만 존재하는 나만의 계획을 검열 없이 자유롭게 꺼내는 공간 |
| **TopPick** | **핵심 루프 최상단** | MindSweep 중 오늘 반드시 지켜야 하는 핵심 항목. 선택 피로와 부담을 줄이는 실행 기준점 |
| **Future Vision** | 무조건 사용 | RAS 기반 목표 시각화. 첫 주부터 노출되는 동기 보조 장치 |
| **Timetable + Slot** | 무조건 사용 | 복잡한 주간 플래너가 아니라 "오늘 시간 블록" 중심으로 단순화해 사용 |
| **MorningTask** | 중요도 하향 | 핵심 루프가 아니라 전날 밤 TopPick을 다음날 첫 행동으로 이어주는 보조 장치 |
| **Accountability** | **친구 감시**로 사용 | 부모/교사 감시가 아니라 상호 동의한 친구가 제한된 진행 데이터만 확인 |
| **부모 동의 게이트** | 제거 | 가입/첫 행동 마찰 제거. 미성년 보호는 데이터 최소화, 알림 제한, 환불 정책으로 관리 |

---

## 0-1. 문제 재정의 — 계획 기능의 부재가 아니라 행동 전환의 구조적 실패

Movra의 출발점은 "일정을 더 잘 입력하게 만드는 앱"이 아니다.

나와 주변 친구들은 매번 하루 계획을 세웠지만, 실제 실천 과정에서는 반복적으로 무너졌다. 문제는 계획을 세우지 못하는 것이 아니라, 이미 정해둔 계획이 행동으로 전환되지 못하고 중간에 끊기는 데 있었다.

기존 일정 관리 서비스들은 대체로 사용자가 계획을 잘 세우지 못한다고 전제한다. 그래서 더 정교한 캘린더, 더 촘촘한 시간표, 더 많은 분류와 알림을 제공한다. 하지만 실제 사용자가 겪는 핵심 실패는 계획 수립 이전이 아니라 계획 이후에 발생한다.

Movra는 이 간극에서 출발한다.

> **핵심 질문**: 어떻게 계획을 더 많이 세우게 할 것인가가 아니라,  
> **왜 이미 세운 계획은 행동으로 이어지지 않는가?**

이 질문을 기준으로 실행 실패를 다시 보면, 행동 단절은 크게 세 가지 구조적 실패로 설명된다.

| 실행 실패 메커니즘 | 사용자가 겪는 실제 현상 | Movra의 제품 응답 |
|------------------|----------------------|------------------|
| **선택 피로** | 해야 할 일이 많아질수록 무엇부터 할지 정하지 못하고 시작이 밀린다 | **MindSweep**으로 머릿속 계획을 밖으로 꺼내고, **TopPick**으로 오늘 지킬 핵심만 남긴다 |
| **즉각 보상 부재** | 행동을 시작해도 당장의 보상이 없어 동기가 빠르게 식는다 | **3/5분 Focus Session**과 **Tiny Win**으로 작은 실행 직후 보상을 만든다 |
| **학습된 무력감** | 계획 실패가 반복될수록 "나는 또 못 할 것"이라는 회피가 생긴다 | **Recovery Card**, **If-Then 회고**, 부드러운 복귀 메시지로 실패 다음날 다시 시작하게 한다 |

따라서 Movra의 기능은 서로 독립된 생산성 기능 묶음이 아니다. MindSweep/TopPick은 선택 부담을 줄이고, Focus Session/Tiny Win은 행동-보상 연결을 만들며, Recovery Card/Daily Reflection은 실패 후 복귀를 회복시킨다. Future Vision, Timetable, MorningTask, 친구 Accountability는 이 핵심 루프가 실제 생활 안에서 더 오래 지속되도록 만드는 강화 축이다.

이 문제 재정의가 Movra의 서비스 구조 전환과 기능 설계 방향 전체의 출발점이다.

---

## 0-2. Strategic Bets — 우리가 거는 비자명한 베팅 8개

PRD의 본질은 "우리가 무엇을 **확신하고**, 무엇에 **베팅하는가**"이다. 다음 베팅들이 틀렸다면 Movra는 작동하지 않는다.

| # | Bet | 왜 비자명한가 | 반증 조건 (Falsifiable) |
|---|------|------------|----------------------|
| **B1** | 고등학생은 할 일을 몰라서가 아니라, **머릿속 계획이 많아 선택 피로에 걸린다** | 시장의 학습 앱은 정교한 계획표를 요구하지만 실제 문제는 머릿속 과부하와 실행 전 망설임 | MindSweep 작성자의 TopPick 선택률 < 60% 또는 TopPick 선택자의 첫 세션 시작률이 미선택자 대비 +15%p 미만이면 폐기 |
| **B2** | **5분 진입 마찰 감소 + 즉각 보상**이 의지력보다 강력하다 | 학생/부모는 보통 "의지력"을 해법으로 보지만, 실제 실행은 작은 시작과 빠른 보상에 더 민감함 | "5분 프리셋 + Tiny Win" 그룹의 첫 세션 완료율이 통제군 +20%p 미달 시 폐기 |
| **B3** | **실패 다음날 복귀 메시지**가 학습된 무력감을 끊고 D2 복귀를 +10%p 이상 끌어올린다 | 보통 학습 앱은 실패를 침묵으로 처리하거나 손실 프레이밍으로 압박함 | Recovery Card 노출군의 D+1 복귀율 +5%p 미달 시 폐기 |
| **B4** | **학교 시간(8-15시) 침묵 정책**이 학생 신뢰를 만든다 | 대부분 앱은 더 자주 알림이 좋다고 가정 | 침묵 정책 유지율 < 70% 또는 알림 불만 > 10건/주 시 재설계 |
| **B5** | **수능 D-Day 시즌 모드**가 가장 강력한 자연 hook이다 | 이건 자명할 수 있으나 시즌 모드 도입 시점이 중요 | 시즌 모드 활성화 그룹의 NSM이 일반 모드 +25% 미달 시 폐기 |
| **B6** | **학생은 자기 돈으로 ₩X를 내고 AI 성장 리포트를 살 만한 가치를 본다** (Direct B2C) | 한국 고등학생은 인앱결제 의향이 낮음 (음악/OTT 외에는 결제 경험 적음). "보고서"라는 추상적 가치에 학생이 직접 결제할지가 핵심 가설 | 30일 사용 후 코호트의 결제 전환율 < 1.5%이거나 7일 내 사후 취소율 > 8% 시 폐기 |
| **B7** | **열품타/메가스터디는 통합 루프를 만들지 못한다** | 대형 플레이어가 못 한 게 아니라 안 했다고 가정 | 6개월 내 그들이 회고+개인화+복귀 동시 출시 시 폐기 |
| **B8** | **신경과학적 메커니즘 레이어링**이 단순 행동 유도보다 retention과 학생 직접 결제율을 동시에 끌어올린다 | 보통 앱은 "기능"만 팔지, "왜 작동하는가"를 팔지 않음. 학생은 자기 행동이 설명될 때 리포트 가치를 더 잘 이해한다 | 뇌과학 narrative 노출군의 D7 NSM 차이 < 5%p AND 학생 결제 전환율 차이 < 2%p 동시 만족 시 폐기 |

> **Strong Opinion**: B1, B2, B3는 Phase 1에서 검증. B4는 Day 1부터 정책으로 내장. B5는 Phase 2. **B6, B8은 Phase 3 결제 출시 시점(M5-6)에 동시 측정 — 학생 직접 결제 가설은 가장 검증 비용이 큰 베팅이므로 충분한 데이터(데이터 30일+ 보유 사용자 1,000명+) 확보 후 launch.** B7은 상시 모니터링.

---

## 1. Why Now & Vision

### 1-1. Why Now? (왜 2026년인가)

| 시장 변수 | 2026년 현황 | Movra에 미치는 의미 |
|---------|-----------|------------------|
| **고등학생 시장 규모** | 약 130만명 (고2-고3 약 90만) | TAM 충분, 고2-고3이 핵심 |
| **사교육 시장** | 연 27조원, 가구당 월 40만원 | 학습 도구 지불 의지가 검증된 시장 |
| **열품타 학생 점유율** | DAU 30만+ 중 추정 50%가 학생 | 직접 경쟁자, but 회고/복귀 부재 |
| **PWA / Web Push 성숙도** | iOS Safari 16.4+ 지원 (2023~), Android 완전 지원 | 네이티브 앱 없이도 핵심 기능 작동 |
| **AI 코칭 단가 하락** | Claude Haiku 기준 코칭 1건당 < $0.001 | Phase 3 AI 도입 경제성 확보 |
| **학생 정신건강 인식 변화** | 10대 우울/번아웃 인정 문화 형성, 부모도 "회복" 중요성 인식 시작 | "실패해도 괜찮아" 톤 수용 가능 |
| **수능 영향력 약화 우려에도** | 정시 비율 40% 정책 유지, 대치동 사교육 여전 강세 | "수능 D-Day" hook 유효 |

### 1-2. Vision Statement

> Movra는 학교, 학원, 자습실을 오가는 고등학생이
> **무너진 다음 날에도 책상 앞에 다시 앉게 만드는** 가장 신뢰받는 도구가 된다.
>
> 우리는 **의지력에 기대지 않는다.** 대신 먼저 머릿속에 떠도는 계획을
> **MindSweep**으로 밖에 꺼내고, 그중 오늘 반드시 지킬 **TopPick**만 남겨
> 선택 피로와 부담을 줄인다.
>
> 그 다음 뇌가 이미 가진 **보상 회로(도파민), 습관 회로(기저핵),
> 주의 필터(RAS), 사회적 촉진(거울뉴런)** 을 자연스럽게 활용하도록 설계한다.
>
> 그리고 30일이 지난 시점에 학생 본인에게
> **"너는 어떻게 무너졌고, 어떻게 다시 일어났는지"를 보여주는 AI 성장 리포트** 를 제공한다.
> 이것이 우리의 유일한 유료 상품이다.
>
> 그리고 친구와 함께해도 비교로 무너지지 않는, 상호 책임 기반 학습 루프가 된다.

기존 학습 앱은 "이상적인 하루"를 그리게 하지만, Movra는 "**무너진 하루 다음의 하루**"를 설계한다.

즉 Movra의 제품 정의는 "계획 작성 도구"가 아니라 **목표 인식 → 선택 부담 감소 → 행동 시작 → 즉각 보상 → 실패 후 복귀**를 연결하는 행동 전환 시스템이다.

### 1-3. Anti-vision (우리가 절대 되지 않을 것)

- ❌ 또 하나의 화려한 일정관리 앱 (노션 클론)
- ❌ 게이미피케이션 중심 동기부여 앱 (Forest 클론)
- ❌ 단순 라이브 스터디룸 (열품타 클론)
- ❌ 인강 / 문제 콘텐츠 사업 (메가스터디 영역 침범 X)
- ❌ 부모를 위한 자녀 감시 도구 (학생 신뢰 파괴)
- ❌ 친구 랭킹 / 공개 비교 시스템 (10대 정신건강 악영향)
- ❌ 부모 동의 게이트로 첫 행동을 막는 가입 플로우
- ❌ "AI가 다 해주는" 마법 같은 앱
- ❌ **사이비 뇌과학 마케팅** ("좌뇌/우뇌", "뇌파 동기화" 등 검증되지 않은 개념 사용 금지)

---

## 2. North Star Metric & Funnel Math

### 2-1. North Star Metric

```
NSM = WAU₃₊
    = (지난 7일 동안 ≥3개 Focus Session을 기록한 고유 사용자 수)
```

**왜 WAU₃₊인가 (학생 페르소나 기준 재검증)**:
- 고등학생의 학업 성과는 "**매주 꾸준히 자습 시간 확보**"에서 나온다 (학교/학원 시간은 자율성 낮음)
- 주 3회는 학교 + 학원 외에도 자기 의지로 집중한 횟수 = 행동 지속의 실질적 증거
- DAU는 "학교 가는 길에 잠깐 본 것"도 포함되어 노이즈가 큼
- D7 retention은 "한 번만 들렀어도" 카운트되어 본질 측정 못 함

**12개월 NSM 목표 (시즌성 반영)**:

| 시점 | 시기 | WAU₃₊ Target | 가정 |
|------|------|------------|------|
| M1 | 5월 (중간고사) | 50명 | 클로즈드 베타, 100명 가입 |
| M3 | 7월 (기말고사) | 500명 | 오픈 베타 |
| M6 | 10월 (수능 직전) | **5,000명** | 시즌 정점 (수능 D-30) |
| M12 | 4월 (다음 입시 시작) | 12,000명 | 비-시즌 안정 코호트 |

> **계절성 주의**: 수능 시즌(9-11월)은 자연 정점, 1-2월은 골짜기. 운영 지표는 **시즌 보정 코호트**로 봐야 함.

### 2-2. Activation Funnel — 운영 가능한 깔때기 모델

```
가입 (Signup)                                   100명
  │ × 65% (온보딩 완료율, 학생은 진단 더 부담스러움)
  ▼
온보딩 완료 (BehaviorProfile + 시험 정보)         65명
  │ × 65% (24h 내 첫 세션 시작률)  ← Activation 정의
  ▼
첫 Focus Session 완료 (≥5분)                    42명
  │ × 60% (D2 복귀율)
  ▼
D2 복귀                                          25명
  │ × 50% (D7까지 3회+ 세션 도달률)
  ▼
D7 NSM 진입                                      13명
  │ × 50% (4주차 retention)
  ▼
M1 유지 코호트 (Retained)                         6명
```

### 2-3. 지표 위계

| 위계 | 지표 | 정의 | M3 Target |
|------|------|------|----------|
| **NSM** | WAU₃₊ | 주 3회+ 집중 사용자 | 500명 |
| **Input #1** | Activation Rate | 가입 후 24h 내 첫 세션 완료 | 42% |
| **Input #2** | D2 Return Rate | 가입 다음날 복귀 + 행동 | 25% |
| **Input #3** | Recovery Rate | 무실행일 다음날 복귀율 | 35% |
| **Input #4** | TopPick Completion Rate | 당일 TopPick 완료 비율 | 50% |
| **Output #1** | M1 Retention | 4주차 코호트 활성률 | 6% |
| **Output #2** | NPS (학생) | 학생 코호트 NPS | +20 |
| **Output #3** | **학생 결제 전환율** | 30일+ 데이터 보유 사용자 중 결제 비율 | (Phase 3) ≥ **1.5%** |
| **Output #4** | **결제 사후 취소율** | 결제 후 7일 내 환불 요청 비율 | (Phase 3) ≤ **8%** |

### 2-4. Guardrail Metrics

| 지표 | Threshold | 근거 |
|------|---------|------|
| 온보딩 이탈률 | < 35% | 학생은 진단 인내심이 짧음 |
| 학교 시간(평일 8-15시) 알림 발송률 | **0%** | B4 베팅의 정책 위반 |
| 22시-7시 알림 발송률 | **0%** | 미성년자 수면 보호 |
| 일평균 앱 사용 시간 | 5-15분 | 학생이 너무 길게 머물면 의도 변질 |
| Web Push 옵트인률 | > 35% | 학생은 옵트인 더 보수적 |
| 학생 부정 피드백 | < 10건/주 | 핵심 신뢰 |
| 결제 환불 요청 | < 3건/주 (Phase 3) | 미성년 결제 사후 취소 리스크 신호 |

---

## 3. Hero User Stories — 6개 핵심 루프에 집중

### Hero Story #0: Empty Head, One Clear TopPick (MindSweep + TopPick)

> **As a** 머릿속에 해야 할 일이 너무 많아서 시작을 못 하는 고등학생,
> **I want to** 내 머릿속 계획을 먼저 아무렇게나 다 적고, 그중 오늘 꼭 지킬 것만 고르고 싶다,
> **So that** 무엇부터 해야 할지 고민하느라 에너지를 쓰지 않고 바로 시작한다.

**Falsifiable Hypothesis**:
> MindSweep을 작성하고 TopPick을 선택한 사용자의 첫 Focus Session 시작률이 미선택 사용자 대비 **+15%p 이상** 높으면 선택 피로 감소 루프가 작동한다.

**Acceptance Criteria**:
- [ ] MindSweep은 형식, 과목, 시간, 우선순위 입력을 강제하지 않는 자유 입력 공간이다.
- [ ] 사용자는 머릿속 계획을 여러 개 작성할 수 있고, 각 항목은 나중에 수정/완료/삭제할 수 있다.
- [ ] TopPick은 MindSweep 항목 중 오늘 핵심적으로 지켜야 하는 항목으로 선택한다.
- [ ] UX 기본값은 TopPick 1개를 강조하되, 백엔드 제한인 최대 3개까지 확장 가능하다.
- [ ] TopPick에는 예상 소요 시간과 짧은 메모를 붙일 수 있다.
- [ ] 첫 화면의 중심 CTA는 MorningTask가 아니라 TopPick 기반 "지금 시작"이다.
- [ ] TopPick은 Focus Session, Timetable Slot, 친구 Accountability 공유 범위와 연결된다.
- [ ] AI가 자동으로 우선순위를 정하지 않는다. 선택권은 학생에게 있고, 제품은 선택 부담만 줄인다.

**핵심 UX 결정**:
- MindSweep은 계획표가 아니라 머릿속 작업 기억을 밖으로 꺼내는 인지적 오프로딩 장치다.
- TopPick은 Big 1의 제품 언어상 실체다. Big 1은 외부 설명용 표현으로만 사용하고, 실제 핵심 도메인은 TopPick이다.
- MorningTask는 TopPick 다음날 연결을 돕는 보조 루프이며, 첫 화면의 주인공이 아니다.

### Hero Story #0-1: See It, Block It, Start Tomorrow (Future Vision + Timetable + MorningTask)

> **As a** 내일 아침 또 흐지부지될까 걱정되는 고2 학생,
> **I want to** 오늘 고른 TopPick을 시간 블록이나 내일 아침 첫 행동으로 이어두고 싶다,
> **So that** 아침에 다시 고민하지 않고 바로 시작한다.

**Falsifiable Hypothesis**:
> TopPick을 Timetable Slot 또는 MorningTask로 연결한 사용자의 다음 세션 시작률이 미연결 사용자 대비 **+15%p 이상**이면 계획-실행 연결 루프가 작동한다.

**Acceptance Criteria**:
- [ ] 온보딩 또는 첫 주 내 Future Vision 이미지/문장 등록 플로우 제공
- [ ] Future Vision은 메인 화면과 세션 시작 전 최소 1회 노출
- [ ] MorningTask는 TopPick을 다음날 아침 첫 행동으로 넘기는 선택형 보조 기능이다.
- [ ] MorningTask가 없어도 MindSweep → TopPick → Focus Session 핵심 루프는 완결된다.
- [ ] Timetable은 복잡한 주간 플래너가 아니라 오늘의 시간 블록 중심으로 노출
- [ ] Timetable Slot은 Top Pick / 일반 Task / 직접 입력 Slot을 모두 지원
- [ ] 빈 시간표 화면은 "오늘 5분 블록 하나만 잡아볼래?"로 시작 마찰을 낮춤

**핵심 UX 결정**:
- Future Vision은 장식이 아니라 RAS 기반 목표 주의 필터다.
- Timetable은 "계획 입력 제품"이 아니라 실행 직전 마찰을 줄이는 시간 블록이다.
- MorningTask는 기상 직후 습관 루프를 돕지만, MindSweep/TopPick보다 낮은 우선순위의 보조 장치다.
- Future Vision과 Timetable은 TopPick 실행률을 높이는 보조 자산이며, MindSweep/TopPick을 대체하지 않는다.

### Hero Story #1: First Action in 5 Minutes (Activation)

> **As a** 학원 끝나고 자기 방에 들어온 고2 학생,
> **I want to** 가입 5분 안에 오늘의 첫 자습을 시작하고 싶다,
> **So that** "이 앱이 진짜 나를 움직이게 하네"를 즉시 체감한다.

**Falsifiable Hypothesis**:
> 가입 후 24h 내 첫 세션 완료율이 **42% 이상**이면 Activation 작동. 25% 미만이면 진입 마찰을 추가 제거.

**Acceptance Criteria**:
- [ ] 가입 → 첫 Focus Session 완료까지 P50 시간 ≤ 5분
- [ ] 진단 6문항 완료 시간 P95 ≤ 90초
- [ ] 진단 마지막 답변은 MindSweep 첫 항목으로 저장되고, 사용자가 TopPick으로 확정한다
- [ ] 첫 Focus Session 5분 프리셋 사용률 ≥ 80%
- [ ] 5분 세션 정상 완료율 ≥ 70%
- [ ] 가입 시점이 학교 시간(평일 8-15시)이면 "지금은 학교에 있나요?" 자동 감지 → 방과후 알림 예약 옵션

**핵심 UX 결정 (학생 특화)**:
- **시험 유형 선택**: 진단 첫 질문이 "어떤 시험을 준비하나요?" (내신 / 모평/수능 / 둘 다)
- **MindSweep 우선 입력**: 진단 마지막 질문은 "오늘 머릿속에 떠도는 할 일"을 자유롭게 적게 하고, 그중 하나를 TopPick으로 고르게 한다
- **5분 프리셋 강조**: 학생 평균 집중 지속력 고려, 25분(뽀모도로)은 옵션으로만
- **TopPick 중심 연결**: 첫 행동 후 TopPick을 Timetable Slot 또는 내일 MorningTask로 자연스럽게 이어서 등록

### Hero Story #2: Recovery After Failure (Retention)

> **As a** 어제 게임 6시간 하고 자책 중인 고3 학생,
> **I want to** 죄책감 없이 오늘 다시 시작할 명분을 얻고 싶다,
> **So that** "어제 망했으니 오늘도 어쩔 수 없지"의 도피 사이클이 끊긴다.

**Falsifiable Hypothesis**:
> Recovery Card 노출군의 D+1 복귀율이 대조군 대비 **+10%p 이상**이면 B3 검증. 미만이면 메시지 재설계.

**Acceptance Criteria**:
- [ ] 어제 0초 집중 사용자가 오늘 앱 재진입 시 100% Recovery Card 노출
- [ ] Card 노출 → CTA 클릭률 ≥ 40%
- [ ] CTA 클릭 → 첫 세션 시작까지 P50 시간 ≤ 60초
- [ ] recoveryStyle 4종 메시지 분기 정상 작동
- [ ] 시험 망친 다음날(내신 D+1) 별도 "괜찮아 다음이 있어" 메시지 노출
- [ ] 7일 연속 미사용 후 복귀 시 별도 "오랜만이에요" 메시지

**핵심 UX 결정 (학생 특화)**:
- **죄책감 어휘 금지**: "어제 안 했네요" / "0시간이었어요" 같은 손실 프레이밍 절대 금지
- **시험 직후 모드**: 내신/모평 직후 1주일은 Recovery 메시지 톤 더 부드럽게
- **부모 알림 분리**: 학생의 실패 데이터는 부모에게 절대 직접 통지 안 됨 (학생 신뢰의 핵심)
- SLOW_REBUILDER 그룹: 5분 → **3분 프리셋**으로 추가 다운그레이드

### Hero Story #2-1: Friend Accountability Without Ranking

> **As a** 혼자 하면 자꾸 미루는 고등학생,
> **I want to** 내가 선택한 친구 한 명에게 오늘의 집중/Top Pick 진행만 공유하고 싶다,
> **So that** 비교 경쟁 없이 "누가 보고 있다"는 책임감으로 다시 시작한다.

**Falsifiable Hypothesis**:
> 친구 감시자를 연결한 사용자의 2주차 WAU₃₊ 도달률이 미연결 사용자 대비 **+10%p 이상**이면 Accountability가 작동한다.

**Acceptance Criteria**:
- [ ] 친구 초대 코드로 상호 동의한 관계만 생성
- [ ] 친구 감시자는 허용된 MonitoringTarget만 조회
- [ ] 기본 공유 범위는 Focus Session / Top Pick / Timetable Task 중 사용자가 선택
- [ ] 랭킹, 누적 시간 순위, 친구 대비 부진 알림은 절대 제공하지 않음
- [ ] 친구 감시자는 격려/확인 목적이며 부모/교사 대시보드로 확장하지 않음
- [ ] 연결 해제는 학생이 언제든 즉시 가능

### Hero Story #3: My Pace, Not Theirs (Differentiation)

> **As a** 친구 인스타에서 13시간 공부 인증 본 후 자존감 무너진 고2 학생,
> **I want to** 내 페이스에 맞는 추천을 받고 싶다,
> **So that** 비교에 휩쓸리지 않고 내 리듬을 찾는다.

**Falsifiable Hypothesis**:
> 시간대 추천 받은 사용자의 그 시간대 집중 시작률이 일반 시간대 대비 **+20%p 이상** 높지 않으면 추천은 작동하지 않은 것.

**Acceptance Criteria**:
- [ ] 가입 후 7일차에 "당신의 황금 시간대" 카드 자동 노출
- [ ] 추천 시간대 도달 시 푸시 알림 (옵트인 사용자)
- [ ] 학교 시간(8-15시)은 추천 후보에서 자동 제외
- [ ] 22시 이후도 추천 후보에서 자동 제외 (수면 보호)
- [ ] BehaviorProfile.preferredFocusStart/End 기반 fallback
- [ ] 친구 비교 데이터 절대 노출 안 됨
- [ ] (옵션) 같은 학년/지역 익명 평균 노출 — 개인 비교 X

### Anti-stories — 의도적으로 만들지 않는 것

| Anti-story | 왜 만들지 않는가 |
|----------|--------------|
| "친구 공부 시간 랭킹" | 10대 정신건강 악영향, 비교 우울증 가속 |
| "부모님 실시간 모니터링 대시보드" | 학생 신뢰 파괴, 사춘기 거부감 |
| "복잡한 일주일 계획표" | B2 위반 (계획 입력 마찰 ↑) |
| "장기 학습 분석 대시보드" | 인지 부하 ↑ |
| "무료 인강 / 문제 콘텐츠" | 메가스터디 영역, 사업 변질 |
| "AI가 자동으로 시간표 생성" | B7 위반 |
| "학교 시간 알림" | B4 위반 |

---

## 4. Behavioral & Neuroscience Framework

### 4-0. 문제 재정의에서 기능 원칙으로

Movra의 행동과학/신경과학 프레임워크는 기능을 멋있게 포장하기 위한 장식이 아니다. 문제 재정의에서 확인한 세 가지 실패, 즉 **선택 피로**, **즉각 보상 부재**, **학습된 무력감**을 제품 설계 원칙으로 번역하기 위한 기준이다.

| 문제 재정의 | 설계 원칙 | 핵심 기능 |
|------------|----------|----------|
| 선택지가 많아 시작하지 못함 | 먼저 머릿속 계획을 비우고, 오늘 지킬 핵심만 남긴다 | MindSweep, TopPick |
| 행동 직후 보상이 없어 동기가 꺼짐 | 작은 시작 직후 보상을 만든다 | 3/5분 Focus Session, Tiny Win |
| 실패 반복으로 다시 시작을 피함 | 실패를 처벌하지 않고 복귀 명분을 준다 | Recovery Card, Daily Reflection |
| 목표가 일상 자극 속에서 흐려짐 | 목표를 반복 노출하고 실행 맥락과 연결한다 | Future Vision, Timetable, MorningTask |
| 혼자 하면 쉽게 미룸 | 비교 없이 누가 보고 있다는 책임감만 제공한다 | 친구 Accountability |

> **이중 레이어 (Two-Layer Foundation)**:
> - **레이어 1 — 행동과학 (Fogg B=M·A·P)**: "**무엇이** 행동을 만드는가" — 동기 × 능력 × 트리거
> - **레이어 2 — 신경과학 메커니즘**: "**왜** 그 행동이 뇌에서 작동하는가" — 도파민, RAS, 기저핵, 호손 효과 등
>
> 행동과학은 _design rule_ 이고, 신경과학은 _explanation_ 이다. 두 레이어가 합쳐질 때 PRD는 **"이렇게 만들면 작동한다"** 와 **"왜 작동하는가"** 를 동시에 답할 수 있다.

### 4-1. Layer 1 — Fogg B=M·A·P 매핑

| 기능 | M ↑ | A ↑ | P ↑ |
|------|-----|-----|-----|
| MindSweep 자유 입력 | | ✅ | |
| 3분/5분 프리셋 | | ✅ | |
| Tiny Win | ✅ | | |
| Recovery Card | ✅ | ✅ | ✅ |
| If-Then 회고 | | ✅ | |
| 순공 타이밍 추천 | | ✅ | ✅ |
| 수능 D-Day | ✅ | | ✅ |
| 친구 스터디룸 | ✅ | | |
| 친구 감시자(Accountability) | ✅ | | ✅ |
| 학교 시간 무음 모드 | | ✅ | |
| Web Push 알림 | | | ✅ |
| 미래 시각화 (Future Vision) | ✅ | | ✅ |
| TopPick 선택 | | ✅ | ✅ |
| 기상 직후 할 일 (MorningTask) | | ✅ | ✅ |
| 오늘 시간 블록 (Timetable) | | ✅ | ✅ |
| 성장 리포트 | ✅ | | |

### 4-2. Layer 2 — 신경과학 메커니즘 매핑

각 기능이 활용하는 **뇌의 자연 회로**를 명시한다. 모든 메커니즘은 **합리적 근거가 있는 메커니즘 수준**으로만 기술하며, 의사과학(좌뇌/우뇌, 뇌파 동기화 등)은 절대 사용하지 않는다.

| 기능 | 활용하는 뇌 회로 / 심리 메커니즘 | 메커니즘 설명 |
|------|---------------------------|------------|
| **MindSweep + TopPick 선택** | **인지적 오프로딩 + 선택 과부하 감소** | 머릿속 할 일을 밖으로 적어 작업 기억 부담을 줄이고, 그중 핵심 TopPick만 고르게 하면 선택지가 줄어 실행 직전 망설임이 감소한다. 핵심은 의지력을 더 쓰게 하는 것이 아니라, 선택해야 할 수를 줄여 실행 에너지를 보존하는 것이다. |
| **미래 시각화 (Future Vision)** | **RAS (Reticular Activating System) — 망상활성계** | 뇌간의 RAS는 의식이 깨어 있는 동안 외부 자극 중 "내게 중요한 것"을 골라내는 주의 필터. 목표 이미지를 반복 노출하면 RAS가 일상 자극 중 목표 관련 정보를 자동으로 강조해서 인식하게 됨. 즉 "원하는 차를 정하면 그 차만 보이는" 효과. |
| **기상 직후 할 일 (MorningTask)** | **기저핵 습관 회로 + 기상 직후 코르티솔 피크** | MorningTask는 핵심 루프가 아니라, 전날 고른 TopPick을 다음날 아침 첫 행동으로 이어주는 보조 장치다. 기상 직후 반복 행동을 만들 수 있지만, MindSweep/TopPick보다 뒤에 노출한다. |
| **3분/5분 프리셋** | **활성화 에너지 (Activation Energy) 최소화 + 측좌핵 도파민 사전분비** | 시작 직전 측좌핵(Nucleus Accumbens)은 보상 예측만으로도 도파민을 분비. "5분만"이라는 작은 약속은 시작 장벽을 낮춰 도파민 사전분비를 유도하고, 실제 시작 후에는 **자이가르닉 효과(Zeigarnik effect)** 로 지속 시간이 늘어남. |
| **Tiny Win** | **도파민 보상 루프 (Mesolimbic Pathway)** | 행동 → 즉각 보상 사이의 시간 간격이 짧을수록 도파민 강화 효과가 강함 (Skinner의 강화 스케줄). 작은 성취를 즉시 기록·시각화하면 행동-보상 연결이 신경 회로에 새겨져 다음날 같은 행동을 반복할 확률이 상승. |
| **순공 타이머 + 통계** | **메타인지 (Metacognition) — 배외측 전전두엽** | 자기 행동을 객관적으로 관찰하면 배외측 전전두엽(DLPFC)이 활성화되며 자기조절 능력이 강화됨. 시간을 시각화하는 것 자체가 자기조절의 첫 단계 (Self-Monitoring → Self-Regulation). |
| **If-Then 회고 (Daily Reflection)** | **실행 의도 (Implementation Intentions) — 사전 결정의 신경 위임** | "X가 일어나면 Y를 한다"는 조건식을 미리 만들면 그 결정 권한이 PFC(의식적 통제)에서 기저핵(자동 반응)으로 위임됨. 실제 상황 발생 시 의지력 동원 없이 즉시 행동 가능. 이 메커니즘은 학습 행동에서 실행률을 평균 2-3배 끌어올린다는 연구 결과가 누적되어 있음. |
| **Recovery Card (자기연민)** | **자기연민 (Self-Compassion) → 부교감신경 활성화** | 실패 후 자책은 코르티솔 분비를 지속시켜 회피 행동을 강화함 (HPA axis 과활성). 반대로 자기연민적 메시지는 부교감신경을 활성화하고 옥시토신 분비를 유도해 회복 속도를 빠르게 함. 죄책감 어휘 사용 금지가 핵심. |
| **친구 스터디룸 (사회적 촉진)** | **거울뉴런 (Mirror Neurons) + 사회적 촉진 (Zajonc)** | 같은 공간에서 같은 행동을 하는 타인을 관찰하면 거울뉴런 시스템이 활성화되어 자신도 같은 행동을 모방하기 쉬워짐. 단순 존재만으로 단순 과제 수행이 향상되는 사회적 촉진 효과(Zajonc 1965). 단, **랭킹/비교는 사회적 위협 회로(편도체 과활성)를 자극하므로 절대 도입하지 않음.** |
| **감시자 시스템** | **호손 효과 (Hawthorne Effect) + 사회적 책임 회로** | 누군가 지켜보고 있다는 인식만으로 행동의 질과 빈도가 향상됨. 사회적 책임은 ACC(전대상피질)와 mPFC(내측 전전두엽)을 활성화하여 자기 모니터링을 강화. **단, 강제 감시가 아니라 선택적 합의(opt-in)가 핵심** — 강제 감시는 위협 반응을 유발. |
| **수능 D-Day 시즌 모드** | **목표 근접 효과 (Goal Gradient Effect) + 도파민 예측 강화** | 목표에 가까워질수록 동기 강도가 비선형적으로 증가하는 현상 (Hull 1932, Kivetz et al. 2006). 측좌핵의 도파민 분비가 목표 근접도에 비례. D-Day 카운터는 이 회로를 의도적으로 활성화. |
| **성장 리포트 (주간/월간)** | **서사적 정체성 (Narrative Identity) + 기억 응고화 (Memory Consolidation)** | 자신의 행동을 이야기로 정리하는 과정에서 해마(Hippocampus)와 mPFC가 협력해 경험을 장기 기억으로 응고화. "나는 꾸준히 하는 사람"이라는 정체성 서사가 형성되면 미래 행동의 일관성이 강화됨 (자기인식 가설, Bem). |
| **학교 시간 / 수면 시간 무음** | **인지 부하 제거 + 수면-기억 응고화 보호** | 학교 시간 알림은 작업 기억(Working Memory) 점유로 학습 효율 ↓. 22시 이후 알림은 멜라토닌 분비 억제 + 학습 내용의 수면 중 응고화 방해. **알림이 도움이 아니라 방해가 되는 시간대를 차단하는 것이 신경학적으로 정당함.** |

### 4-3. 우리가 의도적으로 피하는 뇌 회로

같은 신경과학을 알고 있어도 **만들지 않을 것**:

| 회로 | 무엇을 만들지 않는가 | 왜 피하는가 |
|------|------------------|------------|
| **편도체 위협 반응 (Amygdala Threat Response)** | 친구 랭킹, 손실 프레이밍 ("어제 ___시간 놓쳤어요") | 학습된 회피 행동을 강화 → 장기 이탈로 이어짐 |
| **변동 보상 도파민 중독 (Variable Reward Hijack)** | 가챠/뽑기, 무한 스크롤, 알림 폭격 | 슬롯머신 메커니즘으로 도파민 시스템 둔감화 → 결과적으로 동기 ↓ |
| **사회적 비교 우울 (Social Comparison Depression)** | 공개 시간 순위, 친구 대비 부진 알림 | 10대 우울증의 주요 기제. 절대 안전선. |
| **수면-각성 리듬 교란** | 22시-7시 알림, 무한 야간 푸시 | 멜라토닌 분비 교란 + 청소년 신체발달 저해 |

### 4-4. 신규 기능 컷오프 기준 (이중 검증)

> **Rule of Two-Layer**: 신규 기능 제안 시 다음 두 질문에 모두 답할 수 있어야 만든다.
>
> 1. **B=MAP 어디를 강화하는가?** (M / A / P 중 1개 이상 명시)
> 2. **어떤 뇌 회로 / 심리 메커니즘을 활용하는가?** (위 §4-2 표에 추가 가능한 형태로)

학생 페르소나에서는 **A (Ability) + P (트리거)** 가 압도적으로 우선한다. 학생은 동기(M)는 입시라는 외부 압력으로 이미 있다. 부족한 건 시작 능력과 적절한 타이밍의 트리거다. 신경과학 관점에서도 동일하다 — **MindSweep을 통한 인지적 오프로딩 + TopPick을 통한 선택 과부하 감소 + 도파민 사전분비 + RAS 주의 필터** 의 4축이 핵심.

### 4-5. 솔직한 검증 강도 (Honest Calibration)

신경과학 메커니즘을 마케팅에 활용하기 전에 **검증 수준을 솔직히 구분**한다. 우리는 강한 증거가 있는 것만 외부 메시지로 사용한다.

| 메커니즘 | 검증 강도 | 외부 메시지 사용 |
|---------|---------|-------------|
| 도파민 보상 루프 (Tiny Win) | **강함** (반세기 누적) | ✅ 사용 |
| 실행 의도 If-Then (Gollwitzer 1999~) | **강함** (메타분석 다수) | ✅ 사용 |
| 사회적 촉진 (Zajonc 1965) | **강함** | ✅ 사용 |
| 호손 효과 | **중간** (일부 재현 실패) | ⚠️ 신중 사용, "감시 효과"로 일반화 |
| 자기연민 효과 (Neff) | **중간** (성인 데이터 위주, 청소년 데이터 부족) | ⚠️ "회복 심리"로 표현 |
| RAS 주의 필터 | **중간** (메커니즘은 명확, 효과 크기는 가변) | ⚠️ "주의 필터" 정도로 표현 |
| 선택 과부하 / 인지적 오프로딩 | **중간-강함** (인지심리학·HCI 누적 근거) | ✅ "선택 부담을 줄인다" 수준으로 사용 |
| Ego Depletion (의지력 한정 자원) | **약함** (재현 실패 다수) | ❌ 마케팅 사용 금지 |
| 좌뇌/우뇌 학습 스타일 | **의사과학** | ❌ 영구 금지 |
| 뇌파 동기화 / 알파파 학습 | **의사과학** | ❌ 영구 금지 |

> **원칙**: 마케팅 메시지에서 ⚠️ 등급은 "메커니즘은 알려져 있고, 효과 크기는 개인차가 있다"는 식의 약한 주장만 가능하다. ❌ 등급은 절대 금지.

---

## 5. Functional Requirements

### 5-1. MoSCoW (with Falsifiable Conditions)

#### Must Have (Phase 1, 0-8주)

| 기능 | BC | 가설 | 폐기 조건 | 현재 구현 |
|------|------|------|---------|---------|
| 6문항 진단 + 시험 정보 | personalization | B4 검증 | 그룹별 NSM 차이 p>0.05 | ✅ 백엔드 완료 (시험 정보 추가 필요) |
| Future Vision | visioning | RAS 기반 목표 노출 사용자의 D7 NSM +10%p | 미달 시 노출 위치 재설계 | ✅ 백엔드 완료 |
| **MindSweep 자유 입력** | planning | 머릿속 계획을 밖으로 꺼낸 사용자의 TopPick 선택률 ≥ 60% | 미달 시 입력 UI 단순화 | ✅ 백엔드 완료 |
| **TopPick 선택** | planning | TopPick 선택자의 첫 세션 시작률 +15%p | 미달 시 선택 개수/카피 재설계 | ✅ 백엔드 완료 |
| MorningTask | planning | 전날 TopPick을 다음날 첫 행동으로 넘긴 사용자의 D2 시작률 +10%p | 미달 시 보조 기능으로 축소 | ✅ 백엔드 완료 |
| Timetable + Slot | planning | "오늘 시간 블록" 등록자의 당일 실행률 +15%p | 미달 시 UI 단순화 | ✅ 백엔드 완료 |
| Focus Session + 3/5/10/25분 프리셋 | focus | B2 검증 | 5분 프리셋 사용률 < 60% | ✅ 백엔드 완료 (3분 추가 필요) |
| Recovery Card | focus | B3 검증 | D+1 복귀 +10%p 미달 | ✅ 백엔드 완료 |
| Daily Reflection (If-Then) | feedback | "회고 작성자가 비작성자 +20%p NSM" | 미달 | ✅ 백엔드 완료 |
| Tiny Win | feedback | "Tiny Win 작성이 D2 복귀 +10%p" | 미달 | ✅ 백엔드 완료 |
| **학교 시간 무음 정책** | infra/notification | B4 검증 | 옵트인률 < 70% | ❌ 신규 필요 |
| **수면 시간 무음 (22-07시)** | infra/notification | (미성년자 보호 의무) | — | ❌ 신규 필요 |
| Web Push 인프라 | infra | "옵트인자 D7 NSM 1.5x" | 미달 | ❌ 신규 필요 |
| 모바일/태블릿 반응형 웹 | client | (모든 베팅의 전제) | — | ❌ 신규 필요 |

#### Should Have (Phase 2, 8-16주)

| 기능 | 가설 | 폐기 조건 |
|------|------|---------|
| 수능/내신 D-Day 캘린더 | "D-Day 등록자 NSM +25%" | 미달 |
| 시험 직후 회복 모드 (1주일) | "내신 D+1 코호트 복귀율 +15%p" | 미달 |
| 순공 타이밍 추천 (학교/수면 제외) | Hero #3 검증 | 추천 시간대 활성화 +20%p 미달 |
| 주간 미니 리포트 | "리포트 열람자 다음주 NSM +10%p" | 미달 |
| 친구 스터디룸 (랭킹 없음) | "참여자 NSM +15%" | 미달 |
| 친구 감시자(Accountability) | "연결 사용자 2주차 WAU₃₊ +10%p" | 미달 |
| recoveryStyle별 푸시 톤 | "톤 매칭 D+1 복귀 +5%p" | 미달 |

#### Could Have (Phase 3, 16-26주) — **MVP 단계의 유일한 유료 상품**

| 기능 | 가설 | 폐기 조건 |
|------|------|---------|
| **🎯 AI 성장 리포트 (단일 SKU)** — 1회 결제 → 30일 분석 → 종합 리포트 | "30일+ 데이터 보유자의 ≥1.5%가 직접 결제" (B6 검증) | 결제 전환율 < 1% AND 사후 취소율 > 10% 시 폐기 |
| 수능 시즌 모드 (D-30 자동 전환) | B5 검증 — 무료 기능 (결제 없이 작동) | NSM +25% 미달 |

> **MVP 결정**: Phase 3 단계에서는 **AI 성장 리포트 단 하나의 유료 상품**만 시장에 검증한다. MindSweep과 TopPick은 무료 핵심 루프이며, Future Vision, Timetable, MorningTask, 친구 Accountability도 결제 게이트 뒤에 두지 않는다. 다른 premium 후보(규칙 기반 코칭, AI If-Then 추천 등)는 **모두 Won't Have로 강등** — 단일 SKU 검증 결과를 보고 다음 사이클에 재평가.

#### Won't Have (with Falsification Hooks)

| 기능 | 거부 이유 | 재검토 트리거 |
|------|---------|------------|
| 친구/전국 랭킹 | 10대 정신건강 가설 | NPS > +50 도달 + 정신건강 영향 검증 통과 |
| 부모 실시간 모니터링 | 학생 신뢰 파괴 | 영구 |
| 인강/문제 콘텐츠 | 사업 변질 | 영구 |
| AI 자동 계획 생성 | B2/B7 위반 | Phase 3 NSM 천장 시 재검토 |
| 학교 시간 알림 | B4 위반 + 학교 정책 위반 | 영구 |
| 22시 이후 알림 | 미성년자 수면 보호 | 영구 |
| 양방향 DM | 운영 부담 + 미성년자 안전 위험 | 영구 |
| 외모/스타일 캐릭터 커스터마이징 | "공부 도구"의 핵심에서 벗어남 | 영구 |
| **부모 응원 메시지 / 부모 대시보드** | 학생 신뢰 훼손 + 친구 Accountability와 포지션 충돌 | 영구 |
| **규칙 기반 코칭 엔진 (premium feature)** | MVP 단계 단일 SKU 정책 | AI 리포트 SKU 검증 후 (M9+) |
| **AI If-Then 자동 추천 (premium feature)** | MVP 단계 단일 SKU 정책 | AI 리포트 SKU 검증 후 (M9+) |
| **월간/연간 구독 모델** | "1회 결제 단순함" 우선 | 1회 결제 LTV가 낮으면 (M9+) |
| **앱 내 광고** | 학생 신뢰 + 정신건강 영향 | 영구 |

### 5-2. 핵심 알고리즘 사양

#### 5-2-0. MindSweep → TopPick 선택 로직

```
function createMindSweepItem(userId, dailyPlanId, content):
    # 형식 강제 없음: 과목, 시간, 우선순위 없이 자유 텍스트 허용
    task = addGeneralTask(dailyPlanId, content)
    return task

function selectTopPick(userId, dailyPlanId, taskId, estimatedMinutes, memo):
    # UX는 1개를 기본 강조, 도메인은 최대 3개까지 허용
    currentTopPickCount = countTopPicks(dailyPlanId)
    maxTopPicks = resolveMaxTopPicks(userId)  # default 3, LOW executionDifficulty는 UI상 1개 권장

    if currentTopPickCount >= maxTopPicks:
        reject("오늘은 핵심만 남기자")

    markAsTopPicked(taskId, estimatedMinutes, memo)
    suggestFocusSessionPreset(taskId, estimatedMinutes)
    suggestOptionalTimetableSlot(taskId)
```

**Product Rules**:
- MindSweep은 생각을 꺼내는 공간이므로 입력 품질을 평가하지 않는다.
- TopPick은 실행 약속이므로 첫 화면, Focus 시작, Timetable 배치, Accountability 공유의 기준이 된다.
- MorningTask는 TopPick을 다음날로 넘기는 선택형 보조 기능이며 TopPick보다 앞서 노출하지 않는다.

#### 5-2-1. Recovery Card 결정 로직 (학생 특화)

```
function determineRecoveryCard(userId, today):
    yesterday = today - 1 day
    yesterday_focus_seconds = sumFocusSeconds(userId, yesterday)
    yesterday_top_pick_completion = topPickCompletionRate(userId, yesterday)

    # 시험 직후 1주일: 별도 "회복" 모드
    last_exam = getLastExamDate(userId)  # 내신/모평 등
    if last_exam and (today - last_exam).days <= 7:
        return RecoveryCard(type=POST_EXAM_RECOVERY,
                            message=postExamMessage(profile))

    # 7일 이상 무실행: "긴 복귀"
    days_since_last = daysSinceLastSession(userId, today)
    if days_since_last >= 7:
        return RecoveryCard(type=LONG_ABSENCE,
                            message=longAbsenceMessage(profile))

    # 일반 복귀
    if yesterday_focus_seconds == 0 and yesterday_top_pick_completion < 1.0:
        type = BOTH
    elif yesterday_focus_seconds == 0:
        type = MISSED_FOCUS
    elif yesterday_top_pick_completion < 1.0:
        type = INCOMPLETE_TOP_PICK
    else:
        return null

    return RecoveryCard(
        type=type,
        message=messageFor(type, profile.recoveryStyle, profile.coachingMode),
        suggestedDurationMinutes=durationFor(profile.recoveryStyle)
    )
```

#### 5-2-2. 학교 시간 / 수면 시간 알림 정책

```
function shouldSendPush(userId, now):
    # 미성년자 수면 보호 (절대 룰)
    if now.hour >= 22 or now.hour < 7:
        return false

    # 학교 시간 (월-금 8:00-15:30)
    if now.weekday in [MON..FRI] and 8 <= now.hour < 15.5:
        # 사용자가 "학교 무음" 옵트아웃하지 않은 경우만 차단
        if userPrefs.schoolHoursMute is True (default):
            return false

    # 사용자별 일일 알림 빈도 상한
    if dailyPushCount(userId, today) >= MAX_DAILY_PUSH:
        return false

    return true
```

#### 5-2-3. 수능 D-Day 시즌 모드 (Phase 2)

```
function getSeasonMode(userId, today):
    # 학생은 시험 다중 트랙
    nextExam = getNextExam(userId)  # 내신/모평/수능 중 가장 가까운 것

    if not nextExam:
        return BASELINE_MODE

    daysToExam = (nextExam.date - today).days
    examType = nextExam.type

    if examType == SUNUNG and daysToExam <= 30:
        return SUNUNG_INTENSIVE       # Big 3 허용, 25분 프리셋 우선
    if examType == NAESIN and daysToExam <= 14:
        return NAESIN_INTENSIVE       # 과목별 TopPick 분리 허용
    if examType in [MOPYUNG, HAKPYUNG] and daysToExam <= 7:
        return MOPYUNG_FOCUSED        # 모평 직전 약점 보강

    return BASELINE_MODE
```

### 5-3. Data Schema 변경사항 (Phase 1 신규)

```sql
-- 시험 캘린더 (학생 특화)
CREATE TABLE exam_schedule (
    exam_schedule_id BINARY(16) PRIMARY KEY,
    user_id BINARY(16) NOT NULL,
    exam_type VARCHAR(20) NOT NULL,   -- SUNUNG, MOPYUNG, HAKPYUNG, NAESIN
    exam_date DATE NOT NULL,
    subject VARCHAR(50),                -- 내신은 과목별
    created_at DATETIME NOT NULL,
    INDEX idx_user_date (user_id, exam_date)
);

-- 알림 정책 사용자 설정
CREATE TABLE notification_preference (
    user_id BINARY(16) PRIMARY KEY,
    school_hours_mute BOOLEAN DEFAULT TRUE,
    school_hours_start TIME DEFAULT '08:00:00',
    school_hours_end TIME DEFAULT '15:30:00',
    sleep_hours_mute BOOLEAN DEFAULT TRUE,    -- 절대 OFF 불가
    weekend_school_mute BOOLEAN DEFAULT FALSE,
    max_daily_push INT DEFAULT 3
);

-- Web Push 구독
CREATE TABLE web_push_subscription (
    subscription_id BINARY(16) PRIMARY KEY,
    user_id BINARY(16) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    p256dh_key VARCHAR(255) NOT NULL,
    auth_key VARCHAR(100) NOT NULL,
    user_agent VARCHAR(500),
    created_at DATETIME NOT NULL,
    last_active_at DATETIME,
    revoked_at DATETIME,
    UNIQUE KEY uk_user_endpoint (user_id, endpoint)
);

-- 코호트 분석용 활성화 이벤트
CREATE TABLE activation_event (
    activation_event_id BINARY(16) PRIMARY KEY,
    user_id BINARY(16) NOT NULL UNIQUE,
    signup_at DATETIME NOT NULL,
    onboarding_completed_at DATETIME,
    first_session_started_at DATETIME,
    first_session_completed_at DATETIME,
    nsm_first_entry_at DATETIME,
    activation_source VARCHAR(50),     -- 'instagram', 'youtube', 'friend_invite'
    grade_level VARCHAR(10)             -- 'M3', 'H1', 'H2', 'H3'
);
```

---

## 6. UX & The First 5 Minutes

### 6-1. The Critical Path: T+0 → T+5:30

```
T+0:00  가입 시작
        가입 후 즉시 진단으로 진행
        │
T+0:30  진단 시작 화면
        "60초만 답하면, 너에게 맞게 세팅할게"
        │
T+0:45  Q1: "지금 어떤 시험을 준비하고 있어?"
        — 내신 / 모평·수능 / 둘 다 (시험 트랙 분기)
T+1:00  Q2: "계획은 잘 세우는데 안 지켜질 때가 많아?"
        (executionDifficulty)
T+1:15  Q3: "친구나 누가 지켜볼 때 더 잘 돼?"
        (socialPreference)
T+1:30  Q4: "공부 망친 다음 날, 보통 어떻게 해?"
        (recoveryStyle)
T+1:45  Q5: "집중이 잘 되는 시간대는?"
        (학교 시간 자동 제외 옵션)
T+2:00  Q6: "머릿속에 떠도는 오늘 할 일을 편하게 적어줘"
        — 자유 텍스트 입력 (예: "수학 모의고사 1회", "영단어", "국어 지문")
        ※ 이 답은 MindSweep 첫 항목이 됨
        │
T+2:15  "이 중 오늘 꼭 지킬 것 하나만 고르자"
        — 1개 선택 시 TopPick 확정, 1개만 입력했다면 바로 TopPick 제안
        │
T+2:30  진단 완료 + BehaviorProfile 저장
        "좋아. 오늘은 이것만 지키자. 5분만 시작해볼래?"
        │
T+2:45  메인 화면 (TopPick 카드 첫 노출)
        TopPick 기반 "지금 시작" 버튼이 화면 중앙
        │
T+3:00  "지금 시작" 클릭 → 3분/5분/10분/25분 선택 (5분 기본)
T+3:15  타이머 시작 (POST /focus-sessions/start)
        │  잔잔한 progress bar, 다른 UI 최소화
        │
T+8:15  5분 완료
        Web Push 옵트인 모달 ("내일도 같은 시간에 알려줄까?")
        TopPick을 오늘 시간 블록 또는 내일 MorningTask로 넘기는 선택 CTA
        Tiny Win 입력 CTA (선택, 30자)
        │
T+8:45  "내일 또 만나" 마무리 화면
        D2 시드 심기 — 다음날 진입 시 Recovery 또는 환영 메시지 분기
```

### 6-2. 학생 특화 Empty States

| 상황 | ✅ Good (학생 톤) |
|------|------------------|
| MindSweep 0개 | "머릿속에 있는 거 아무렇게나 적어도 돼" |
| TopPick 0개 | "오늘은 이 중 하나만 지키자" |
| 통계 데이터 0일 | "3일만 더 쓰면 너의 패턴이 보여" |
| Recovery Card 데이터 없음 | "오늘이 첫 날이네! 5분만 해보자" |
| 시험 직후 진입 | "시험 끝났네! 며칠은 좀 쉬어도 괜찮아" |
| 친구 스터디룸 0개 | "친구 한 명 초대해볼래? 같이 하면 더 잘 돼" |
| Timetable 0개 | "오늘 5분 블록 하나만 잡아볼래?" |
| Future Vision 없음 | "자주 보고 싶은 목표 이미지를 하나만 걸어둘래?" |

### 6-3. 모바일/태블릿 웹 특화 UX

**모바일 (320-768px)**:
- 단일 컬럼, 한 화면에 한 결정
- "지금 시작" 버튼은 항상 thumb-zone (하단 1/3)
- 학교 시간 진입 감지 → 상단에 "지금 학교? 방과후 알림 예약" 배너

**태블릿 (768-1024px)**:
- 2 컬럼 (좌: MindSweep + TopPick / 우: D-Day + 통계)
- 자습실/스타카페에서 책상 거치 시나리오 (가로 모드 우선)
- iPad에서 인강 + Movra 동시 사용 (split view)

**PWA 핵심 기능**:
- "홈 화면에 추가" 안내 (가입 후 D2 1회만, 학생 거부감 줄이기)
- Service Worker로 오프라인 시 마지막 화면 표시
- Web Push (iOS 16.4+ 필수 안내, 미만은 이메일 fallback)

### 6-4. Edge Cases

#### 🔴 Critical (Day 1 차단)
- 첫 Focus Session 시작 API 실패 → 로컬 타이머 작동, 백그라운드 재시도

#### 🟡 Important (Week 1 내)
- iOS Safari < 16.4 → Web Push 불가 → 이메일/SMS 알림 안내
- 학교에서 가입 시도 → "방과후에 다시" 메시지 + 재방문 리마인더
- 22시 이후 가입 → 동작은 정상, but 첫 알림은 다음날 7시 이후 발송

#### 🟢 Nice to Have
- 동일 날짜 중복 회고 → 기존 회고 수정 화면으로 자동 이동
- WebSocket 연결 끊김 → 자동 재연결 3회 (이미 구현)

---

## 7. Technical Architecture & Critical Path

### 7-1. 시스템 구성

```
[Mobile/Tablet Web Client]  ←—HTTPS / WSS—→  [Spring Boot 3.5 Server]
       │                                              │
       ├─ React/Next.js (제안)                         ├─ MySQL 8.x (주 저장소)
       ├─ Service Worker (PWA, Web Push)              ├─ Redis (Token, Push Subs)
       ├─ STOMP Client (스터디룸)                       ├─ RabbitMQ (WebSocket Broker)
       ├─ IndexedDB (오프라인 캐시)                      ├─ AWS S3 (이미지)
       └─ 학교 시간 자동 감지 (위치 또는 시간 기반)        └─ Web Push (VAPID)
```

### 7-2. Critical Path — 모바일/태블릿 웹 출시까지

```
Week 0-2: 인프라 + 핵심 백엔드 연결
          ├─ VAPID 키 생성, webpush-java 통합
          ├─ /web-push/subscribe, /notification/preferences API
          ├─ 학교/수면 시간 알림 차단 로직 (NotificationGateway)
          ├─ 시험 캘린더 API (CRUD)
          └─ MindSweep / TopPick 모바일 UX 최우선 연결, Future Vision / Timetable / MorningTask / Accountability 보조 UX 연결

Week 2-6: 클라이언트 (React/Next.js + PWA)
          ├─ 디자인 시스템 (학생 친화적 톤)
          ├─ Hero Story #1 (Activation 플로우)
          ├─ Hero Story #2 (Recovery Card)
          ├─ 반응형 레이아웃 (모바일/태블릿)
          └─ 학생 톤 카피라이팅 (전수 검토)

Week 6-8: 베타 인프라
          ├─ Sentry 에러 모니터링
          ├─ Mixpanel/Amplitude 이벤트 추적
          ├─ Feature Flag (실험용)
          └─ 클로즈드 베타 100명 모집 (대치/목동 시드)
```

### 7-3. 성능 SLO

| 지표 | Target | 측정 방법 |
|------|--------|---------|
| API p50 / p95 | 80ms / 250ms | Spring Actuator + Prometheus |
| Web Vitals LCP | < 2.5s (4G mobile) | Lighthouse CI |
| Web Vitals INP | < 200ms | RUM |
| Web Push 발송 → 수신 | < 5s | Push 응답 webhook |
| 첫 Focus Session API | p95 < 150ms | 별도 SLI |
| 가용성 (월) | 99.5% | uptime-kuma |

### 7-4. 기술 부채 정리

| # | 부채 | 우선순위 | 해결 방법 |
|---|------|--------|---------|
| 1 | FocusSession ↔ FocusTimer 이중 구조 | High | focus BC를 SoT로 통합 |
| 2 | Accountability 친구 UX 미구현 | Medium | 이미 구현된 Controller를 친구 감시 플로우에 연결 |
| 3 | 통계 RAW 쿼리 집계 | Medium | DailyFocusSummary 일관성 강화 |
| 4 | 이미지 동기 업로드 | Low | S3 Presigned URL 전환 |
| 5 | **알림 발송 게이트웨이 단일화** | **High** | 학교/수면 룰 적용 위한 NotificationGateway 신규 |

### 7-5. 외부 의존성 & Fallback

| Service | 핵심 영향 | Fallback |
|---------|---------|---------|
| MySQL | **Critical** | RDS Multi-AZ |
| Redis | 토큰 + Push Subs | 토큰: 재로그인 / Push: DB 직접 조회 |
| RabbitMQ | 스터디룸 채팅만 | 채팅 비활성, NSM 영향 없음 |
| Web Push | Recovery 알림 | 인앱 배지 + 다음 진입 시 카드 |
| AWS S3 | 이미지 | 임시 차단, NSM 영향 없음 |

---

## 8. Competitive Moat Analysis

### 8-1. 직접 경쟁자 매트릭스 (한국 고등학생 시장)

| Competitor | 핵심 가치 | 강점 | 약점 (= 진입점) | 학생 DAU 추정 |
|-----------|---------|------|-------------|------------|
| **열품타** | 라이브 스터디룸 + 시간 측정 | 거대 사용자 풀, 친구 기능 | 회고 0, 개인화 0, 복귀 구조 0, 시험 사이클 0 | ~15만 (학생) |
| **메가스터디 앱** | 인강 + 일정 | 콘텐츠 통합, 부모 신뢰 | 행동 지속 기능 부재, 자기관리 약함 | ~8만 |
| **콴다** | 수학 사진 풀이 | 학습 보조 강력 | 자기관리 0 | ~10만 |
| **산타 (toeic)** | 영어 AI 학습 | 개인화 학습 | 행동 지속 기능 0 | ~3만 (학생) |
| **노션** | 자유 커스터마이징 | 무한 유연성 | 진입 장벽 매우 높음, 자기 설계 부담 | (범용) |
| **Forest** | 게이미피케이션 타이머 | 시각적 만족감 | 한국 학생 정서 부적합, 회고 0 | (글로벌) |

### 8-2. Movra의 6겹 해자 (Layered Moat)

```
Layer 6: 신경과학 기반 설계 신뢰도
         (검증된 메커니즘 위에 모든 기능을 얹는 설계 철학)
              ↑
Layer 5: AI 성장 리포트 — 학생이 자기 돈으로 산 가치
         ("학생 직접 결제"는 가장 강력한 PMF 시그널.
          친구 Accountability보다 결제 모방은 쉽지만, 데이터 품질과 자기 이해가 해자)
              ↑
Layer 4: 학생 행동 데이터 네트워크 효과
         (시험 사이클별 패턴 축적 → AI 리포트 정확도 ↑)
              ↑
Layer 3: 한국 입시 정서 특화 톤 & 시즌 모드
         (수능 D-Day, 내신 직후 회복 모드)
              ↑
Layer 2: 학교 시간 / 수면 시간 무음 정책
         (학생 신뢰 — 경쟁자가 따라하기 어려움)
              ↑
Layer 1: 실패-복귀 구조 + 통합 루프
         (MindSweep + TopPick + 회고 + 개인화 + 복귀 결합)
```

**Layer 5의 의미 (수정)**:
부모 결제(B2B2C)는 한쪽이 결제하고 다른 쪽이 사용하는 구조라서, 학생이 정말로 가치를 본다는 직접 시그널이 약하다. 반면 **학생이 자기 용돈으로 결제**한다는 건 가장 강력한 **PMF (Product-Market Fit) 시그널** 이다. 30일 사용 후 학생 본인이 결제하는 비율은 단순한 매출 지표가 아니라 "이 앱이 학생에게 진짜 도움이 되었나"의 가장 정직한 답이다. 이 시그널 위에 데이터(Layer 4)가 축적되면 **AI 리포트의 정확도 ↑ → 결제 전환율 ↑** 의 강화 루프 형성.

**Layer 6의 의미**:
경쟁자(열품타, 메가스터디)가 "회고 기능"이나 "개인화"를 표면적으로 따라할 수는 있다. 그러나 **각 기능이 어떤 신경 회로를 활용하는지에 대한 일관된 설계 철학**은 단기간에 모방하기 어렵다. 이 레이어는 마케팅 자산이자 동시에 **PRD 단계의 의사결정 기준**으로 작동한다 (§4-4 컷오프 룰 참조).

**Why won't 열품타 / 메가스터디 just build this?**

| Competitor | 못 만드는 이유 |
|-----------|------------|
| **열품타** | 핵심 가치가 "라이브 스터디룸". 회고/개인화 도입 시 단순함이 깨짐 → 30만 DAU 위협. 도메인 모델도 "Room+Timer" 중심 |
| **메가스터디** | 핵심은 인강 콘텐츠 사업. 자기관리는 보조 기능. 학생 행동 데이터 운영 노하우 부재 |
| **콴다** | 학습 보조 (수학 풀이) 핵심. 시간 관리/회고는 영역 밖 |

> **Honest Counter**: 만약 열품타가 6개월 내 회고/복귀 기능을 출시하면 B7 폐기. 그때 Movra는 "내신 회복 전문" 또는 "수능 D-30 시즌 모드"로 더 좁은 wedge로 후퇴.

### 8-3. Defensibility 우선순위

1. **친구 기반 Accountability 네트워크** (가장 강함, 이미 백엔드 구현됨 — Phase 2)
2. **학교/수면 시간 무음 정책** (Day 1 도입, 정책으로 내장)
3. **시즌 모드 + 시험 캘린더 통합** (Phase 2)
4. **데이터 축적 기반 개인화** (시간 의존 — 가장 천천히 강화)

---

## 9. GTM, Pricing & Distribution

### 9-1. 단계별 출시 전략

#### Phase 1: 클로즈드 베타 (M1, 5월 중간고사 시즌)
- **타겟**: 대치동/목동/중계동 학원 다니는 고2-고3 100명
- **시드 채널**:
  - 학원 강사 추천 (대치동 입시 학원 3곳 강사 제휴)
  - 공부 유튜버 마이크로 인플루언서 2-3명 (구독 1-5만급)
  - 인스타 공부 계정 협업 (#공부스타그램)
- **검증 게이트**:
  - Week 4 NSM ≥ 30명, 활성화율 ≥ 30%
  - 학생 NPS ≥ +10, 친구 초대/Accountability 연결률 ≥ 20%

#### 9-1-1. Audience별 메시지 레이어링 (뇌과학 narrative의 그룹별 표현)

> **원칙**: **학생이 직접 결제자**이므로 학생 메시지가 가장 중요하다. 부모는 더 이상 결제 채널이 아니라 **신뢰감 형성 채널** (학생이 부모에게 보여줄 때 안전한 앱). 학원은 권위 채널.
>
> 같은 뇌 메커니즘을 세 그룹에게 다른 어휘로 전달한다. 메시지 일관성은 **공통 메커니즘 표(§4-2)에서 파생되었다는 점**으로 유지된다.

| 메커니즘 | 학생 메시지 (인스타/틱톡, **결제 정당화**) | 부모 메시지 (안심) | 학원/교사 메시지 (B2B 권위) |
|---------|---------------------------|------------------|---------------------|
| **도파민 보상 (Tiny Win)** | "5분 했더니 진짜 또 하고 싶어짐 ㅋㅋ" | "아이가 작은 성취를 반복하는 구조" | "Skinner 강화 스케줄 기반 즉각 피드백" |
| **선택 피로 감소 (MindSweep → TopPick)** | "머릿속 할 일 다 적고, 오늘은 하나만" | "선택 부담을 줄여주는 설계" | "인지적 오프로딩 + 선택 과부하 감소" |
| **실행 의도 (If-Then)** | "'폰 보고 싶을 때 → 서랍에' 이렇게 적어두면 진짜 됨" | "사전 결정 효과로 의지력 의존도 ↓" | "Gollwitzer Implementation Intentions" |
| **자기연민 (Recovery Card)** | "어제 망쳤어도 괜찮아, 오늘이 있어" | "자책감이 아닌 부드러운 복귀 메시지" | "회복 심리학 기반 재진입 메커니즘" |
| **AI 성장 리포트 (단일 유료)** | "한 달 동안 내 뇌가 어떻게 공부했는지 ₩만원에 알 수 있음" | "(부모는 결제하지 않음 — 자녀가 직접 결정)" | "30일 행동 데이터 기반 개인화 분석" |
| **RAS (Future Vision)** | "원하는 거 자주 보면 진짜 그쪽으로 됨" | "주의 필터를 활용한 목표 지향 설계" | "선택적 주의 메커니즘 시스템" |
| **사회적 촉진 (스터디룸)** | "혼자 하면 망함, 같이 하면 돼" | "비교/랭킹 없이 안전한 스터디룸" | "Zajonc 모델 기반 비경쟁적 facilitation" |
| **친구 Accountability** | "친구가 보고 있으면 이상하게 시작하게 됨" | "상호 동의 기반, 부모 감시 아님" | "Hawthorne effect 기반 opt-in 책임 구조" |

**채널별 메시지 톤 가이드**:

| 채널 | 청자 | 메시지 톤 | 뇌과학 명시 정도 | 결제 유도 |
|------|------|---------|------------|---------|
| 인스타 릴스 | 학생 | 또래 공감, 탈자책 | 거의 안 함 | **간접** (체험 후 자발) |
| 틱톡 | 학생 | 짧고 강한 한 줄 | 거의 안 함 | 간접 |
| 공부 유튜버 PPL | 학생 | 인플루언서 어휘 | 약하게 | **약하게** (체험 후 리포트 가치 언급) |
| 인앱 결제 페이지 | 학생 | 또래 톤 + 데이터 시각화 | **중간** (Layer 6 활용) | **직접** |
| 부모 카페 콘텐츠 | 부모 | 차분한 설명 | 강하게 | 안 함 (안심 목적) |
| 학원 제휴 자료 | 학원/교사 | 전문 용어 | **가장 강하게** | 안 함 (B2B 권위 형성) |
| 앱 내 일반 카피 | 학생 | 또래 공감 | 거의 안 함 | 안 함 |

#### Phase 2: 오픈 베타 (M2-3, 6-7월 기말 시즌)
- **확장**: 일반 인문계/자연계 고등학생
- **채널**:
  - 인스타 릴스 + 틱톡 (공부 자기관리 콘텐츠)
  - 공부 유튜버 PPL (강민철, 이지영 등 대형 PPL은 보류)
  - SEO: "공부 슬럼프", "수능 의지력", "내신 망함" 키워드
  - 부모 카페 (맘카페, 강남맘 카페) 협업 콘텐츠
- **검증 게이트**: M3 WAU₃₊ ≥ 500명

#### Phase 3: 시즌 정점 + Movra+ 출시 (M4-6, 8-10월 수능 시즌)
- **시즌 캠페인**: "수능 D-100", "D-30" 자동 진입 모드
- **Movra+ 결제 게이트 오픈**: 학생 직접 결제 채널
- **검증 게이트**: M6 WAU₃₊ ≥ 5,000명, 학생 결제 전환율 ≥ 1.5%

### 9-2. Distribution Channels (학생 시장 특화)

| Channel | 타겟 | 예상 CAC | 효과 |
|---------|-----|---------|------|
| **인스타 릴스 콘텐츠** | 학생 직접 | 낮음 (organic) | High (10대 SNS 침투율 90%+) |
| **공부 유튜버 PPL** | 학생 직접 | 중간 | High (신뢰도 높음) |
| **학원 강사 추천** | 학생 + 부모 | 무료 (제휴) | Very High (학원 권위) |
| **부모 카페 콘텐츠** | 부모 → 학생 | 낮음 | Medium (신뢰 형성, 직접 결제 보조) |
| **틱톡** | 중3-고1 | 낮음 | Medium (확장 타겟) |
| **카카오톡 친구 초대** | 학생 → 학생 | 무료 | Medium (K-factor 0.15-0.2) |
| **수능 D-Day 시즌 광고** | 부모 | 높음 | High (시즌 한정) |

### 9-3. Pricing Model — Direct B2C (Single SKU)

#### 9-3-1. 단일 상품 정의 — AI 성장 리포트

| 항목 | 내용 |
|------|------|
| **상품명** | AI 성장 리포트 (My 30-Day Brain Story) |
| **결제 구조** | **1회 결제 → 30일 분석 → 리포트 생성** (자동 갱신 없음) |
| **결제 시점** | 가입 후 언제든 가능 (단, **30일+ 데이터 보유자에게만** 인앱 결제 CTA 노출 — 데이터 부족 사용자는 결제 게이트 자체 비노출) |
| **분석 기간** | 결제 후 30일 동안 누적된 데이터 (이전 30일 데이터 포함 가능, 사용자 선택) |
| **리포트 생성 방식** | 30일 차에 자동 생성, 인앱에서 열람 + PDF 다운로드 가능 |
| **재결제** | 가능 (이전 리포트 보존, 새 30일 사이클 시작) |

#### 9-3-2. 가격 결정 프레임워크

> **결정**: MVP 단계에서 가격은 **A/B 테스트로 결정한다.** PRD 단계에서 단일 가격을 못 박지 않는다.

**A/B 후보 가격**:

| 가격 | 가설 | Trade-off |
|------|------|---------|
| ₩9,900 | 진입 장벽 최소화, 전환율 최대화 | "AI 리포트"의 지각된 가치 ↓ 위험 |
| ₩14,900 | 균형점 — "한 달분"의 가격감 | 전환율 중간 |
| ₩19,900 | 프리미엄 포지셔닝 | 전환율 ↓ but ARPU ↑ |

**A/B 운영 가이드**:
- Phase 3 launch 시점에 ₩9,900 vs ₩14,900 동시 노출 (50:50)
- 4주간 데이터 수집 (각 그룹 200명 이상)
- 비교 지표: 결제 전환율 × 가격 = 사용자당 매출 (ARPU)
- ₩19,900 후보는 1차 A/B 결과 보고 추가 실험 여부 결정

**가격 정당화 narrative**:
- 한국 고등학생 평균 용돈 4-8만원/월 기준 약 **12-25%**
- "한 달치 음료수 1주일분"의 심리적 임계 (₩9,900 ≈ 학교 매점 음료 + 빵 5회)
- "한 달 분석 + 종합 리포트"는 학원 1회 컨설팅(보통 5-10만원)의 1/5-1/10 가격
- **뇌과학 narrative 활용**: "한 달 동안 너의 뇌가 어떻게 학습했는지" — Layer 6 신뢰도 자산이 결제 정당화에 직접 기여

#### 9-3-3. AI 성장 리포트 컨텐츠 사양

> **MVP 단계 컨텐츠** (이 외 추가 컨텐츠는 검증 후 확장):

| 섹션 | 컨텐츠 | 활용 데이터 | 신경과학 매핑 |
|------|------|----------|------------|
| **1. 너의 30일** | 총 집중 시간, 평균 일일 집중, 가장 집중한 날 | FocusSession 30일 | 메타인지 강화 |
| **2. 너의 황금 시간대** | 시간대별 집중 효율, 추천 시간대 | FocusSession × hourOfDay | RAS 활용도 분석 |
| **3. 무너지고 일어난 패턴** | Recovery 횟수, 평균 복귀 시간, 가장 강한 회복 사례 | Recovery Card 노출 + 다음날 행동 | 자기연민 / 회복 회로 |
| **4. 너의 If-Then 사전** | 자주 등장한 실패 패턴 + 다음 액션 (AI 자연어 분석) | DailyReflection 텍스트 분석 | 실행 의도 |
| **5. 너의 TopPick 성공 패턴** | 어떤 종류 작업의 완료율이 높았는가 | TopPick 카테고리 분석 | 선택 피로 감소 패턴 |
| **6. 다음 30일 추천** | AI가 제안하는 다음 30일 액션 플랜 3개 | 위 5개 섹션 종합 | 개인화 코칭 |
| **7. 부록 — 너의 뇌 회로 활용도** | (선택적) 어떤 뇌 메커니즘을 가장 잘 활용했는가 | 종합 분석 | Layer 6 신뢰도 |

**AI 모델**: Claude Haiku 기반 (1 리포트 토큰 비용 < $0.10, 마진 충분)
**개인정보 처리**: 회고 텍스트는 리포트 생성에만 사용, 학습 데이터로 절대 미사용 (옵트인 + 익명화 시에도)

#### 9-3-4. 무료 / 유료 구분

**무료 (영구)** — 핵심 NSM 루프 전부:
- MindSweep, TopPick, Focus Session, Recovery Card, Daily Reflection
- Tiny Win, Future Vision, MorningTask, Timetable, 일/주 통계
- 시험 캘린더, D-Day, 친구 스터디룸, 친구 Accountability
- 학교/수면 시간 무음 정책
- 광고 없음 (절대)

**유료 (단일 SKU)**:
- **AI 성장 리포트만**

> **Strong Opinion**: MindSweep과 TopPick은 제품의 무료 핵심 루프다. Future Vision, Timetable, MorningTask, 친구 Accountability도 결제 게이트 뒤에 두지 않는다. 다른 premium feature(무제한 회고 히스토리, 시즌 모드 강화 등)는 모두 **무료** 또는 **Won't Have**. 단일 SKU 모델의 단순함이 MVP의 가치다.

#### 9-3-5. 미성년자 결제 정책 (Direct Payment 정책)

> **결정**: 미성년자 결제 시 **부모 동의 게이트를 두지 않는다.** 마찰 최소화 우선.

| 영역 | 정책 | 리스크 인식 |
|------|------|---------|
| 결제 게이트 | 별도 보호자 인증/동의 없이 결제 가능 | 한국 민법 제5조에 의해 사후 취소 가능성 — 모니터링 필수 |
| 결제 수단 | 카카오페이, 네이버페이, 신용/체크카드 | 본인 명의 결제 수단 한정 (가족 카드 명의자 자동 검증) |
| 결제 사후 보호 | 결제 후 7일 내 무조건 환불 가능 ("first-time refund guarantee") | 사후 취소 챠지백을 줄이기 위한 자율 환불 |
| 모니터링 트리거 | 사후 취소율 > 8% 7일 연속 시 결제 카피/환불 UX/가격 재검토 | B6 폐기 조건 |
| 카피 정책 | 결제 페이지에서 "보호자와 상의 후 결제하세요" 안내 1줄 표시 | 법적 자기방어 |

#### 9-3-6. Anti-pattern (절대 안 함)

- ❌ 결제 시점 압박 ("지금 결제하면 30% 할인" 같은 카운트다운)
- ❌ Recovery Card에 결제 CTA (가장 약한 순간 — 신뢰 파괴)
- ❌ 회고/통계 무료 기능을 결제 게이트로 묶기
- ❌ 부모에게 자녀 결제 알림 (학생 신뢰 파괴 — 결제 자체는 직접이지만 사후 통보 X)
- ❌ 무료 코호트에 광고
- ❌ 자동 갱신 구독 (1회 결제만 — 사춘기 학생 자동결제 = 환불 분쟁 폭탄)
- ❌ 만 14세 미만 결제 유도 (PIPA 의무)

### 9-4. Virality Mechanics (현실 인식)

학습 행동은 본질적으로 비-사회적이라 K-factor가 낮음. 다음 vector만 베팅:

| Vector | 메커니즘 | 예상 K-factor |
|------|--------|--------------|
| **친구 스터디룸 초대 (카톡)** | 비공개 방 코드 카톡 공유 | 0.20-0.30 (학생 SNS 활용도 높음) |
| **친구 Accountability 초대** | 친구가 서로 진행 상황을 보기 위해 초대 | 0.10-0.20 |
| **Tiny Win 인스타 공유** | "오늘의 작은 승리" 카드 공유 (Phase 2) | 0.10-0.20 |

> **현실 인식**: K-factor에 베팅하지 않는다. SEO + 인플루언서 + 학원 제휴가 본진.

---

## 10. Privacy, Notifications & Operating Cadence

### 10-1. Data Privacy & Ethics (미성년자 강화)

| 영역 | 정책 |
|------|------|
| **데이터 보관** | AWS Seoul, PIPA 100% 준수, 미성년자 보호 강화 |
| **부모 동의 게이트** | MVP에서는 두지 않음. 첫 행동 마찰 제거가 우선 |
| **데이터 최소화** | 회고 본문은 ML 학습용으로 절대 미사용 (Phase 3에서도 옵트인 + 익명화 필수) |
| **데이터 이동성** | 사용자가 모든 데이터 JSON export 가능 |
| **계정 탈퇴** | 사용자 요청 시 즉시 영구 삭제 |
| **3rd Party 공유** | 광고/분석 외부 업체 행동 데이터 절대 미제공 |
| **부모 데이터 접근** | 학생 데이터를 부모에게 직접 노출하지 않음 |

### 10-2. Notification Strategy — 학생 특화

**핵심 원칙**: 알림은 도구가 아니라 **약속**이다.

#### 절대 룰 (옵트아웃 불가)

| 시간대 | 정책 | 이유 |
|------|------|------|
| 22:00-07:00 | **알림 절대 차단** | 미성년자 수면 보호 |
| 평일 8:00-15:30 | **기본 차단** (옵트아웃 가능) | 학교 정책 + B4 베팅 |
| 평일 0시-7시, 22-24시 | 차단 | 수면 |

#### 알림 분류와 빈도 상한

| 종류 | 트리거 | 최대 빈도 | 옵트아웃 영향 |
|------|------|---------|------------|
| **Recovery Push** | 어제 0초 + 오늘 21시까지 미진입 | 1회/일 | 핵심. 옵트아웃 시 NSM 큰 타격 |
| **Timing Push** | 추천 시간대 진입 (Phase 2) | 1회/일 | 중간 |
| **D-Day Push** | 수능/내신 D-30, D-7, D-1 | 시험당 3회 | 높음 |
| **Streak Push** | 7일 연속 마일스톤 | 주 1회 | 낮음 |

#### 톤 가이드라인

| Style | 톤 | 학생용 예시 |
|------|-----|----------|
| QUICK_RESTART | 활기차게 | "준비됐어? 5분만 가자 🔥" |
| NEEDS_REFLECTION | 차분하게 | "오늘은 한 줄만 적어볼래?" |
| SLOW_REBUILDER | 매우 부드럽게 | "오늘은 3분이면 충분해" |
| (default) | 중립 | "오늘 다시 만나" |

> **절대 안 하는 것**:
> - "어제 ___ 시간 놓쳤어요" (손실 프레이밍)
> - "친구는 13시간 했는데 너는?" (비교)
> - "부모님이 걱정하셔" (외부 압박)

### 10-3. Operating Cadence

| 주기 | 회의 | 참석 | 산출물 |
|------|------|------|------|
| **Daily** | NSM 대시보드 점검 (5분) | PM, Eng Lead | Slack 핫 이슈 |
| **Weekly** | NSM 리뷰 + 베팅 진행도 | 전체 팀 | 한 페이지 리포트 |
| **Bi-weekly** | 사용자 인터뷰 5명 (학생 3 + 부모 2) | PM, Designer | 인사이트 문서 |
| **Monthly** | 베팅 검증 결과, 폐기/유지 결정 | 전체 + 어드바이저 | 베팅 점수표 |
| **시즌 (수능 전후)** | 시즌 대응 회의 | 전체 | 시즌 캠페인 운영 |

### 10-4. Experimentation Framework

| 실험 | 가설 | Sample Size | Phase |
|------|------|---------|------|
| MindSweep → TopPick vs 직접 한 가지 입력 | TopPick 선택군 첫 세션 +15%p | 그룹당 100명 | Phase 1 |
| TopPick 1개 강조 vs 3개 허용 강조 | 1개 강조군 첫 완료 +10%p | 그룹당 100명 | Phase 1 |
| Recovery Card 노출 유무 | 노출군 D2 +10%p | 그룹당 200명 | Phase 1 |
| 학교 시간 무음 vs 알림 | 무음 그룹 만족도 +20% | 그룹당 100명 | Phase 1 |
| 5분 vs 10분 기본값 | 5분 그룹 첫 완료 +15%p | 그룹당 100명 | Phase 1 |
| 진단 6문항 vs 3문항 | 3문항 활성화 +5%p | 그룹당 100명 | Phase 1 |
| 시험 직후 회복 모드 유무 | 회복 모드 D+1 복귀 +15%p | 그룹당 100명 | Phase 2 |
| 친구 Accountability 연결 유무 | 연결군 2주차 WAU₃₊ +10%p | 그룹당 200명 | Phase 2 |

---

## 11. Risks, Pre-mortem & Kill Criteria

### 11-1. Pre-mortem — 6개월 뒤 실패한다면

> **사고 실험**: 2026년 10월(수능 한 달 전), Movra는 사용자 부족으로 서비스 종료를 검토 중이다. 무엇이 잘못됐는가?

| Failure Mode | Likelihood | 사전 Mitigation |
|------------|---------|--------------|
| **학생이 "또 다른 잔소리 앱"으로 인식** | High | 학생 톤 카피라이팅 전수 검토, "어제 안 했네요" 어휘 절대 금지 |
| **학생이 자기 돈으로 결제 안 함 (결제력 한계)** | **Very High** (가장 큰 리스크) | 가격 A/B (₩9,900 vs ₩14,900) + 결제 시점 트리거 정밀 설계 + 30일+ 데이터 보유자에게만 노출 |
| **AI 리포트 컨텐츠가 학생 기대에 못 미침** | High | Phase 3 베타 단계에서 무료 리포트 50명 정성 평가 → 본 출시 전 컨텐츠 보강 |
| **미성년 결제 사후 취소(chargeback) 폭증** | Medium-High | 7일 무조건 환불 정책 + 사후 취소율 8% 초과 시 결제 카피/가격/환불 UX 재설계 |
| **부모가 자녀 결제 알게 되어 환불 분쟁** | Medium | 자동 갱신 없는 1회 결제 모델 + 결제 페이지에 "보호자 상의" 안내 1줄 |
| **열품타가 회고 기능 출시** | Medium | B7 모니터링, 출시 시 즉시 wedge 좁히기 (내신 회복 등) |
| **학교에서 폰 수거 정책 강화** | Medium | 학교 시간 비의존 설계 (방과후/주말 중심) |
| **PWA Web Push가 iOS에서 불안정** | Medium-High | iOS 16.4+ 명시 + 이메일 fallback 이중화 |
| **사춘기 학생이 진단 자체를 거부** | Medium | 진단 skip 후에도 NSM 도달 가능한 default 경로 |
| **수능 D-Day 시즌 모드가 너무 늦게 등장** | Medium | Phase 1 후반에 D-Day MVP라도 출시 |

### 11-2. Kill Criteria — 언제 피벗하는가

```
KILL #1 (Activation 실패):
  M1 종료 시점 활성화율 < 25%
  → 첫 5분 UX 전체 재설계

KILL #2 (Recovery 실패):
  M2 종료 시점 Recovery Card 노출군 D+1 복귀가 대조군 +5%p 미달
  → B3 폐기, Recovery 기능 제거 또는 재설계

KILL #3 (PMF 실패):
  M3 종료 시점 NSM < 250명 (목표 500명의 50% 미달)
  → 페르소나 재정의 (학생 → 대학생/취준생 등)

KILL #4 (Defensibility 실패):
  열품타가 회고/복귀 기능 출시 + 30일 내 우리 NSM 정체
  → 더 좁은 wedge로 후퇴 ("내신 회복 전용" 등)

KILL #5 (Monetization 실패):
  M6 종료 시점 학생 결제 전환율 < 0.8% (목표 1.5%의 50%)
  → 가격 재구조화 또는 B2B (학원 단체 라이센스)로 피벗 검토
  → 단, 가격 A/B 양 그룹 모두 미달 시에만 KILL — 한쪽 그룹만 미달이면 다른 가격 채택

KILL #6 (정책 위반):
  학교/수면 시간 알림 발송이 단 1건이라도 발생
  → 즉시 NotificationGateway 장애 처리, 사용자 사과 공지

KILL #7 (Chargeback 폭증):
  결제 후 7일 내 사후 취소율 > 12% 2주 연속 발생
  → 결제 모델/가격/환불 UX 재설계
  → B6 베팅 폐기 결정
```

### 11-3. Open Questions

| # | Question | Owner | Deadline |
|---|---------|------|---------|
| Q1 | 진단 6문항 → 3문항 단축 시 정확도 vs 활성화 트레이드오프 | PM | Pre-launch A/B (Week 6) |
| Q2 | iOS Safari < 16.4 사용자 비율은? | Eng | Week 2 (RUM) |
| Q3 | 학교 시간 자동 감지(시간 기반)와 위치 기반 중 어느 쪽? | Eng + PM | Week 3 |
| Q4 | 친구 스터디룸/Accountability가 또래 비교 우울증을 유발하지 않는가? | PM + UX | Phase 2 인터뷰 |
| Q5 | 시험 일정 입력은 강제? 선택? | PM | Phase 2 |
| Q6 | **AI 성장 리포트 가격 A/B**: ₩9,900 vs ₩14,900 — 어느 쪽이 ARPU 우위? | PM | Phase 3 launch +4w |
| Q7 | **AI 리포트 컨텐츠**: 7개 섹션 중 학생이 가장 가치를 느끼는 섹션은? | PM + UX | Phase 3 베타 50명 정성 평가 |
| Q8 | **결제 시점 트리거**: 가입 즉시 노출 vs 30일 사용 후만 노출 — 전환율 차이? | PM | Phase 3 A/B |
| Q9 | **AI 리포트 PDF vs 인앱 only**: 학생이 부모에게 보여주려 PDF 원하는 비율? | PM + UX | Phase 3 인터뷰 |
| Q10 | **재결제 의향**: 첫 리포트 받은 사용자 중 30일 후 재결제 비율은? | PM | Phase 3 +60d |

### 11-4. Assumption Tracking

| Assumption | 검증 방법 |
|----------|---------|
| 고등학생은 매일 같은 디바이스로 접속 | 디바이스 변경 빈도 |
| Web Push가 iOS Safari에서 충분히 작동 | iOS 버전별 발송→수신 성공률 |
| 학원 강사 제휴가 가능하다 | 시드 학원 3곳 컨택 결과 (M0) |
| 학생은 자기 시험일을 정확히 안다 | 시험 입력 정확도 |
| **학생은 자기 용돈으로 학습 도구에 결제 의향이 있다** | Phase 3 결제 게이트 노출 후 30일 전환율 |
| **학생은 본인 명의 결제 수단(체크카드/카카오페이)을 갖고 있다** | Phase 3 결제 시도 사용자 결제 수단 분포 |
| **AI 분석 리포트가 단순한 통계 표시 이상의 가치를 제공한다** | 리포트 받은 사용자 NPS + 재결제율 |
| 학생은 학교 시간 알림 차단을 선호한다 | 옵트인 분포 (default ON 기준) |

---

## Appendix A. Phased Roadmap Summary

```
═══════════════════════════════════════════════════════════════
Phase 1 — Activation 검증 + 정책 내장 (Week 0-8, 5월 중간고사)
═══════════════════════════════════════════════════════════════
목표: 첫 5분 UX 완성 + 학교/수면 시간 무음 정책 내장 + 베타 100명
핵심 베팅 검증: B1, B2, B3, B4
주요 작업:
  Week 0-2: Web Push 인프라, 학교/수면 무음 게이트웨이, 기존 MindSweep/TopPick API 최우선 연결 + Future Vision/Timetable/MorningTask 보조 연결
  Week 2-6: 클라이언트 (Hero #1, #2)
  Week 6-8: 클로즈드 베타 100명 (대치/목동/중계 학원 시드)
검증 게이트: NSM ≥ 30명, 활성화율 ≥ 30%, 학생 NPS ≥ +10

═══════════════════════════════════════════════════════════════
Phase 2 — Retention + 시험 사이클 (Week 8-16, 6-7월 기말 시즌)
═══════════════════════════════════════════════════════════════
목표: 시험 캘린더 + 회복 모드 + 오픈 베타 + WAU₃₊ 500명
핵심 베팅 검증: B5
주요 작업:
  Week 8-10: 시험 캘린더 + 시험 직후 회복 모드
  Week 10-12: 순공 타이밍 추천 (Hero #3)
  Week 12-14: 친구 스터디룸 + 친구 Accountability (랭킹 없음)
  Week 14-16: 오픈 베타 + 인스타/유튜브 콘텐츠 마케팅
검증 게이트: WAU₃₊ ≥ 500명, M1 retention ≥ 6%

═══════════════════════════════════════════════════════════════
Phase 3 — 시즌 정점 + AI 성장 리포트 출시 (Week 16-26, 8-10월 수능 시즌)
═══════════════════════════════════════════════════════════════
목표: 수능 D-30 시즌 모드 + 단일 SKU "AI 성장 리포트" 출시 + WAU₃₊ 5,000명
핵심 베팅 검증: B5, B6, B8
주요 작업:
  Week 16-18: 시즌 모드 + 시험 캘린더 고도화 (무료)
  Week 18-20: AI 리포트 생성 파이프라인 구축 (Claude Haiku 기반)
              - 7개 섹션 컨텐츠 템플릿 + 데이터 분석 로직
              - 베타 50명 무료 리포트 정성 평가 → 컨텐츠 보강
  Week 20-22: 학생 직접 결제 시스템 + 가격 A/B 인프라
              - 카카오페이/네이버페이/카드 통합
              - 7일 무조건 환불 시스템
              - 사후 취소율 모니터링 대시보드
  Week 22-24: AI 성장 리포트 정식 출시 (₩9,900 vs ₩14,900 50:50 A/B)
  Week 24-26: 수능 D-Day 캠페인 운영 + 결제 전환 데이터 수집
검증 게이트:
  - WAU₃₊ ≥ 5,000명
  - 학생 결제 전환율 ≥ 1.5% (30일+ 데이터 보유자 기준)
  - 결제 후 7일 사후 취소율 ≤ 8%
  - 가격 A/B 결과로 ARPU 우위 가격 결정

═══════════════════════════════════════════════════════════════
Phase 4 — 검증 결과 기반 확장 (Week 26+, 11월 수능 후)
═══════════════════════════════════════════════════════════════
조건별 분기:
  - Phase 3 결제 검증 성공 (B6/B8 통과) → 재결제 사이클 + 리포트 컨텐츠 확장
  - Phase 3 결제 검증 실패 → 가격 재구조 또는 B2B (학원 단체 라이센스) 검토
  - Web Push 한계 도달 시 → iOS/Android 네이티브 앱 개발
```

## Appendix B. Analytics Event Schema (Phase 1)

```typescript
type CoreEvents = {
  signup: {
    source: 'instagram' | 'youtube' | 'tutor_referral' | 'organic';
    grade_level: 'M3' | 'H1' | 'H2' | 'H3' | 'OTHER';
  };
  onboarding_started: {};
  onboarding_completed: { duration_sec: number; exam_track: 'NAESIN' | 'SUNUNG' | 'BOTH' };
  onboarding_skipped: { at_question: number };
  big1_selected: { source: 'onboarding_q6' | 'mind_sweep' | 'manual' };
  focus_session_started: {
    duration_preset_min: 3 | 5 | 10 | 25;
    from: 'main' | 'recovery_card' | 'study_room';
  };
  focus_session_completed: { actual_seconds: number; preset_seconds: number };
  focus_session_abandoned: { actual_seconds: number; preset_seconds: number };
  recovery_card_shown: { recovery_type: string; recovery_style: string };
  recovery_card_actioned: { action: 'start' | 'reflect' | 'dismiss' };
  daily_reflection_created: { has_if_then: boolean; took_seconds: number };
  future_vision_created: { has_weekly_image: boolean; has_yearly_image: boolean };
  morning_task_created: { source: 'night_before' | 'same_day' | 'manual' };
  timetable_slot_created: { slot_type: 'DIRECT' | 'TASK_ASSIGNED' | 'TOP_PICK' };
  accountability_invite_sent: { targets: string[] };
  accountability_joined: { targets: string[] };

  // Phase 3 추가 — AI 성장 리포트 결제 funnel
  ai_report_cta_shown: { days_of_data: number };  // 결제 CTA 노출 시점
  ai_report_paywall_viewed: { price_variant: 9900 | 14900 };  // A/B
  ai_report_purchase_attempted: { price_variant: number; payment_method: string };
  ai_report_purchase_completed: { price_variant: number; payment_method: string };
  ai_report_refund_requested: { days_after_purchase: number; reason?: string };
  ai_report_generated: { user_age_days: number };  // 30일 후 리포트 생성
  ai_report_viewed: { sections_viewed: number };
  ai_report_pdf_downloaded: {};
  ai_report_repurchase: { days_since_first: number };  // 재결제
  web_push_optin: { granted: boolean; ios_version?: string };
  school_hours_mute_toggled: { enabled: boolean };
  exam_registered: { exam_type: string; days_to_exam: number };
};
```

---

> **"우리는 무엇을 만드는가"**:
> 학교, 학원, 자습실을 오가는 고등학생이
> 어제 무너졌어도 오늘 5분 안에 책상에 앉게 만드는 **무료 도구**.
>
> 그리고 30일이 지난 시점에,
> **"너의 30일이 어떻게 흘러갔는지" 학생 본인에게 보여주는 AI 성장 리포트**.
> 이게 우리의 **유일한 유료 상품**이다.
>
> 우리는 의지력에 기대지 않는다. 우리는 **뇌가 이미 가진 회로**를 활용한다.
> 도파민 보상, RAS 주의 필터, 기저핵 습관 회로, 사회적 촉진,
> 그리고 자기연민이 회복을 만든다는 사실에 베팅한다.
>
> **"우리는 무엇을 만들지 않는가"**:
> 또 하나의 일정관리 앱. 게이미피케이션. 인강 콘텐츠.
> 친구 비교 랭킹. 부모 감시 도구. 부모 결제 채널.
> 부모 동의 게이트.
> 학교 시간에 울리는 알림. 22시 이후 알림.
> 자동 갱신 구독. 앱 내 광고. 다양한 premium feature 번들.
> 사이비 뇌과학 마케팅. 검증되지 않은 의지력 신화.
