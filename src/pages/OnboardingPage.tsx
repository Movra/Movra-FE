import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import characterDefault from "../assets/auth/character-default.png";
import characterMindSweep from "../assets/auth/character-mindsweep.png";
import characterRecovery from "../assets/auth/character-recovery.png";
import characterSuccess from "../assets/auth/character-success.png";
import characterTopPick from "../assets/auth/character-toppick.png";
import movraLogo from "../assets/auth/movra-logo-cropped.png";
import { ApiClientError } from "../shared/api/client";
import { recordAnalyticsEventSafely } from "../features/analytics/api";
import { useAuth } from "../features/auth/useAuth";
import {
  createBehaviorProfile,
  getBehaviorProfile,
  getOnboardingContext,
  updateBehaviorProfile,
} from "../features/onboarding/api";
import type {
  BehaviorProfileRequest,
  CoachingMode,
  ExamTrack,
  ExecutionDifficulty,
  RecoveryStyle,
  SocialPreference,
} from "../features/onboarding/types";
import { queryKeys } from "../shared/queryKeys";
import styles from "./OnboardingPage.module.css";

const totalSteps = 6;

const stepLabels = [
  "환영합니다",
  "나에 대해 알아보기",
  "공부 스타일",
  "하루 루틴",
  "목표 설정",
  "마무리",
];

const stepVisuals = [
  {
    alt: "환영하는 Movra 기본 캐릭터",
    description: "긴 진단 대신 오늘 시작에 필요한 기본값만 가볍게 맞춥니다.",
    image: characterDefault,
    stage: "첫 설정",
    title: "처음 만나는 루프",
  },
  {
    alt: "노트에 현재 상태를 적는 Movra 캐릭터",
    description: "지금의 실행 난이도를 알아야 TopPick 개수와 시작 강도를 맞출 수 있습니다.",
    image: characterMindSweep,
    stage: "상태 정리",
    title: "지금 상태를 꺼내기",
  },
  {
    alt: "TopPick을 고르는 Movra 캐릭터",
    description: "혼자 움직일지, 친구의 존재가 필요한지에 따라 이후 흐름을 조절합니다.",
    image: characterTopPick,
    stage: "선택 방식",
    title: "나에게 맞는 자극",
  },
  {
    alt: "다시 일어나는 Movra 캐릭터",
    description: "무너진 다음 날에도 부담 없이 복귀할 수 있도록 Recovery Card 톤을 정합니다.",
    image: characterRecovery,
    stage: "회복 방식",
    title: "다시 시작하는 말",
  },
  {
    alt: "TopPick을 고르는 Movra 캐릭터",
    description: "시험 흐름을 알면 홈 화면에서 더 가까운 목표를 먼저 보여줄 수 있습니다.",
    image: characterTopPick,
    stage: "목표 방향",
    title: "오늘과 연결될 목표",
  },
  {
    alt: "작은 성공을 축하하는 Movra 캐릭터",
    description: "데이터가 쌓이기 전까지 기본 집중 시간과 코칭 톤으로 사용합니다.",
    image: characterSuccess,
    stage: "집중 기준",
    title: "시작하기 좋은 시간",
  },
] as const;

const defaultProfile: BehaviorProfileRequest = {
  coachingMode: "GENTLE",
  examTrack: "UNDECIDED",
  executionDifficulty: "MEDIUM",
  preferredFocusEndHour: 21,
  preferredFocusStartHour: 9,
  recoveryStyle: "QUICK_RESTART",
  socialPreference: "LOW",
};

const statusOptions: Array<{
  description: string;
  emoji: string;
  id: string;
  label: string;
  value: ExecutionDifficulty;
}> = [
  {
    description: "계획한 대로 차근히 진행 중이에요",
    emoji: "☀️",
    id: "steady",
    label: "잘 하고 있어!",
    value: "LOW",
  },
  {
    description: "조금씩 나아지고 있어요. 계속 해보고 싶어요",
    emoji: "🌱",
    id: "growing",
    label: "올라가는 중!",
    value: "MEDIUM",
  },
  {
    description: "계획은 있는데 마음처럼 잘 안 돼요",
    emoji: "☁️",
    id: "shaking",
    label: "흔들리는 중..",
    value: "HIGH",
  },
  {
    description: "잠시 쉬고 싶고, 다시 시작이 어려워요",
    emoji: "🪶",
    id: "tired",
    label: "지친 것 같아요",
    value: "HIGH",
  },
];

const socialOptions: Array<{
  description: string;
  emoji: string;
  label: string;
  value: SocialPreference;
}> = [
  {
    description: "내 페이스를 지키는 편이 편해요",
    emoji: "🌿",
    label: "혼자 조용히",
    value: "LOW",
  },
  {
    description: "가끔 친구의 존재가 도움이 돼요",
    emoji: "🤝",
    label: "적당히 함께",
    value: "MEDIUM",
  },
  {
    description: "서로 확인하면 더 잘 움직여요",
    emoji: "👥",
    label: "같이 확인하기",
    value: "HIGH",
  },
];

const recoveryOptions: Array<{
  description: string;
  emoji: string;
  label: string;
  value: RecoveryStyle;
}> = [
  {
    description: "짧게라도 바로 다시 시작하고 싶어요",
    emoji: "⚡",
    label: "빠른 재시작",
    value: "QUICK_RESTART",
  },
  {
    description: "왜 흔들렸는지 먼저 정리하고 싶어요",
    emoji: "💡",
    label: "차분한 회고",
    value: "NEEDS_REFLECTION",
  },
  {
    description: "부드럽게 낮은 강도로 돌아오고 싶어요",
    emoji: "🌙",
    label: "천천히 회복",
    value: "SLOW_REBUILDER",
  },
];

const examOptions: Array<{
  description: string;
  emoji: string;
  label: string;
  value: ExamTrack;
}> = [
  {
    description: "아직 정하지 않았어요",
    emoji: "🧭",
    label: "아직 몰라요",
    value: "UNDECIDED",
  },
  {
    description: "학교 시험과 수행을 먼저 챙겨요",
    emoji: "📘",
    label: "내신 중심",
    value: "NAESIN",
  },
  {
    description: "모의고사와 수능 흐름을 챙겨요",
    emoji: "🎯",
    label: "모평/수능 중심",
    value: "MOPYUNG_SUNUNG",
  },
  {
    description: "내신과 수능을 함께 가져가요",
    emoji: "🧩",
    label: "둘 다",
    value: "BOTH",
  },
];

const coachingOptions: Array<{
  description: string;
  emoji: string;
  label: string;
  value: CoachingMode;
}> = [
  {
    description: "부담을 낮추는 말이 좋아요",
    emoji: "🍃",
    label: "다정하게",
    value: "GENTLE",
  },
  {
    description: "담백하게 필요한 말만 원해요",
    emoji: "🫧",
    label: "차분하게",
    value: "NEUTRAL",
  },
  {
    description: "조금 더 단단하게 잡아줘도 괜찮아요",
    emoji: "🔥",
    label: "분명하게",
    value: "STRICT",
  },
];

const focusHourOptions = Array.from({ length: 24 }, (_, hour) => hour);

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "온보딩 저장 중 문제가 발생했습니다.";
}

export function OnboardingPage() {
  const { accessToken, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("mode") === "edit";
  const token = accessToken ?? "";
  const [stepIndex, setStepIndex] = useState(0);
  const [profile, setProfile] = useState<BehaviorProfileRequest>(defaultProfile);
  const [statusChoiceId, setStatusChoiceId] = useState("growing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const onboardingStartedRecordedRef = useRef(false);

  const onboardingContextQuery = useQuery({
    queryFn: getOnboardingContext,
    queryKey: ["onboarding-context"],
  });

  const behaviorProfileQuery = useQuery({
    enabled: isEditMode && Boolean(token),
    queryFn: () => getBehaviorProfile({ token }),
    queryKey: queryKeys.behaviorProfileMe(),
  });

  useEffect(() => {
    if (!isEditMode) {
      return;
    }
    const data = behaviorProfileQuery.data;
    if (!data) {
      return;
    }
    setProfile({
      coachingMode: data.coachingMode,
      examTrack: data.examTrack,
      executionDifficulty: data.executionDifficulty,
      preferredFocusEndHour: data.preferredFocusEndHour,
      preferredFocusStartHour: data.preferredFocusStartHour,
      recoveryStyle: data.recoveryStyle,
      socialPreference: data.socialPreference,
    });
  }, [behaviorProfileQuery.data, isEditMode]);

  useEffect(() => {
    if (isEditMode || !token || onboardingStartedRecordedRef.current) {
      return;
    }

    onboardingStartedRecordedRef.current = true;
    void recordAnalyticsEventSafely({
      eventType: "ONBOARDING_STARTED",
      properties: { source: "onboarding_page" },
      token,
    });
  }, [isEditMode, token]);

  const createProfileMutation = useMutation({
    mutationFn: ({
      values,
    }: {
      source: "completed" | "skipped";
      values: BehaviorProfileRequest;
    }) =>
      createBehaviorProfile({ token, values }),
    onError: (error) => {
      if (error instanceof ApiClientError && error.status === 409) {
        queryClient.removeQueries({ queryKey: ["home-today"] });
        navigate("/", { replace: true });
        return;
      }

      setErrorMessage(getErrorMessage(error));
    },
    onSuccess: (_data, variables) => {
      if (variables.source === "skipped") {
        void recordAnalyticsEventSafely({
          eventType: "ONBOARDING_SKIPPED",
          properties: { at_question: stepIndex + 1, source: "onboarding_page" },
          token,
        });
      }

      void recordAnalyticsEventSafely({
        eventType: "BEHAVIOR_PROFILE_CREATED",
        properties: {
          source:
            variables.source === "skipped"
              ? "onboarding_skipped"
              : "onboarding_completed",
        },
        token,
      });
      queryClient.removeQueries({ queryKey: ["home-today"] });
      navigate("/", { replace: true });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (values: BehaviorProfileRequest) =>
      updateBehaviorProfile({ token, values }),
    onError: (error) => {
      setErrorMessage(getErrorMessage(error));
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["home-today"] });
      queryClient.removeQueries({ queryKey: queryKeys.behaviorProfileMe() });
      navigate("/settings", { replace: true });
    },
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  function updateProfile<K extends keyof BehaviorProfileRequest>(
    key: K,
    value: BehaviorProfileRequest[K],
  ) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function submitProfile(values: BehaviorProfileRequest) {
    if (!token) {
      setErrorMessage("로그인이 필요합니다.");
      return;
    }

    if (values.preferredFocusStartHour >= values.preferredFocusEndHour) {
      setErrorMessage("집중 종료 시간은 시작 시간보다 늦어야 합니다.");
      return;
    }

    setErrorMessage(null);
    if (isEditMode) {
      updateProfileMutation.mutate(values);
      return;
    }
    createProfileMutation.mutate({ source: "completed", values });
  }

  function goNext() {
    if (stepIndex < totalSteps - 1) {
      setStepIndex((current) => current + 1);
      return;
    }

    submitProfile(profile);
  }

  function goPrevious() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function skipOnboarding() {
    if (!token) {
      setErrorMessage("濡쒓렇?몄씠 ?꾩슂?⑸땲??");
      return;
    }

    createProfileMutation.mutate({ source: "skipped", values: defaultProfile });
  }

  const progressValue = ((stepIndex + 1) / totalSteps) * 100;
  const currentVisual = stepVisuals[stepIndex];
  const quietPolicyText = onboardingContextQuery.data?.pendingSchoolHours
    ? "지금은 학교 시간대라 알림은 조용히 둘게요."
    : "답변은 나만 보이며, 내 루프를 맞추는 데만 사용해요.";

  return (
    <section className={styles.page} aria-labelledby="onboarding-title">
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <img className={styles.logo} src={movraLogo} alt="Movra" />
          <p>무너져도, 다시 시작하는 힘</p>
        </div>

        <div className={styles.sidebarScene} aria-label="현재 온보딩 단계">
          <img
            className={styles.characterImage}
            src={currentVisual.image}
            alt={currentVisual.alt}
          />
        </div>

        <div className={styles.sideProgress}>
          <span>온보딩 진행 중</span>
          <strong>
            {stepIndex + 1} <small>/ {totalSteps}</small>
          </strong>
          <div className={styles.sideTrack}>
            <span style={{ width: `${progressValue}%` }} />
          </div>
        </div>

        <ol className={styles.stepList} aria-label="온보딩 단계">
          {stepLabels.map((label, index) => (
            <li
              className={
                index === stepIndex
                  ? styles.currentStep
                  : index < stepIndex
                    ? styles.doneStep
                    : undefined
              }
              key={label}
            >
              <span>{index + 1}</span>
              <p>{label}</p>
              {index < stepIndex ? <strong aria-label="완료">✓</strong> : null}
            </li>
          ))}
        </ol>

        <p className={styles.policyNote}>{quietPolicyText}</p>
      </aside>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ width: `${progressValue}%` }} />
          </div>
          <strong className={styles.progressCount}>
            {stepIndex + 1} / {totalSteps}
          </strong>
          {isEditMode ? null : (
            <button
              className={styles.skipButton}
              disabled={createProfileMutation.isPending}
              onClick={skipOnboarding}
              type="button"
            >
              건너뛰기
            </button>
          )}
        </div>

        <section className={styles.card}>
          <div className={styles.mobileCompanion} aria-hidden="true">
            <img src={currentVisual.image} alt="" />
            <span>{currentVisual.stage}</span>
          </div>

          {stepIndex === 0 ? (
            <div className={styles.introStep}>
              <span className={styles.badge}>
                <span aria-hidden="true">🌱</span>
                질문 1
              </span>
              <h1 id="onboarding-title">지금의 공부 루프를 가볍게 맞춰볼게요.</h1>
              <p>
                정답을 고르는 시간이 아니라, Movra가 오늘의 시작 난이도를
                맞추기 위한 짧은 설정이에요.
              </p>
              <div className={styles.introGrid}>
                <div>
                  <strong>5분 안에 끝나요</strong>
                  <span>긴 진단 대신 바로 실행으로 이어가요.</span>
                </div>
                <div>
                  <strong>언제든 바꿀 수 있어요</strong>
                  <span>성향은 고정값이 아니라 현재 상태예요.</span>
                </div>
              </div>
            </div>
          ) : null}

          {stepIndex === 1 ? (
            <div>
              <span className={styles.badge}>
                <span aria-hidden="true">🌱</span>
                질문 2
              </span>
              <h1 id="onboarding-title">지금 가장 나에게 가까운 상태는?</h1>
              <p className={styles.subtitle}>
                너무 고민하지 말고, 지금 느낌 그대로 골라줘요.
              </p>
              <div className={styles.optionGrid}>
                {statusOptions.map((option) => (
                  <button
                    className={
                      statusChoiceId === option.id
                        ? `${styles.optionCard} ${styles.selectedOption}`
                        : styles.optionCard
                    }
                    key={option.id}
                    onClick={() => {
                      setStatusChoiceId(option.id);
                      updateProfile("executionDifficulty", option.value);
                    }}
                    type="button"
                  >
                    {statusChoiceId === option.id ? (
                      <span className={styles.selectedCheck} aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                    <span className={styles.optionEmoji} aria-hidden="true">
                      {option.emoji}
                    </span>
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {stepIndex === 2 ? (
            <div>
              <span className={styles.badge}>
                <span aria-hidden="true">🤝</span>
                질문 3
              </span>
              <h1 id="onboarding-title">공부할 때 친구의 존재는 어느 정도가 좋아요?</h1>
              <p className={styles.subtitle}>
                나에게 맞는 사회적 자극의 세기를 정해볼게요.
              </p>
              <div className={styles.optionGridThree}>
                {socialOptions.map((option) => (
                  <button
                    className={
                      profile.socialPreference === option.value
                        ? `${styles.optionCard} ${styles.selectedOption}`
                        : styles.optionCard
                    }
                    key={option.value}
                    onClick={() => updateProfile("socialPreference", option.value)}
                    type="button"
                  >
                    {profile.socialPreference === option.value ? (
                      <span className={styles.selectedCheck} aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                    <span className={styles.optionEmoji} aria-hidden="true">
                      {option.emoji}
                    </span>
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {stepIndex === 3 ? (
            <div>
              <span className={styles.badge}>
                <span aria-hidden="true">💡</span>
                질문 4
              </span>
              <h1 id="onboarding-title">무너진 다음에는 어떤 도움이 편해요?</h1>
              <p className={styles.subtitle}>
                Recovery Card가 말을 거는 방식을 맞출게요.
              </p>
              <div className={styles.optionGridThree}>
                {recoveryOptions.map((option) => (
                  <button
                    className={
                      profile.recoveryStyle === option.value
                        ? `${styles.optionCard} ${styles.selectedOption}`
                        : styles.optionCard
                    }
                    key={option.value}
                    onClick={() => updateProfile("recoveryStyle", option.value)}
                    type="button"
                  >
                    {profile.recoveryStyle === option.value ? (
                      <span className={styles.selectedCheck} aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                    <span className={styles.optionEmoji} aria-hidden="true">
                      {option.emoji}
                    </span>
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {stepIndex === 4 ? (
            <div>
              <span className={styles.badge}>
                <span aria-hidden="true">🎯</span>
                질문 5
              </span>
              <h1 id="onboarding-title">지금 가장 가까운 목표는 무엇인가요?</h1>
              <p className={styles.subtitle}>
                시험 흐름에 맞춰 홈 화면의 우선순위를 조절할게요.
              </p>
              <div className={styles.optionGrid}>
                {examOptions.map((option) => (
                  <button
                    className={
                      profile.examTrack === option.value
                        ? `${styles.optionCard} ${styles.selectedOption}`
                        : styles.optionCard
                    }
                    key={option.value}
                    onClick={() => updateProfile("examTrack", option.value)}
                    type="button"
                  >
                    {profile.examTrack === option.value ? (
                      <span className={styles.selectedCheck} aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                    <span className={styles.optionEmoji} aria-hidden="true">
                      {option.emoji}
                    </span>
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {stepIndex === 5 ? (
            <div>
              <span className={styles.badge}>
                <span aria-hidden="true">✨</span>
                질문 6
              </span>
              <h1 id="onboarding-title">집중하기 좋은 시간과 톤을 정해볼게요.</h1>
              <p className={styles.subtitle}>
                데이터가 쌓이기 전까지 추천 시간의 기본값으로 사용돼요.
              </p>
              <div className={styles.finishGrid}>
                <label className={styles.selectField}>
                  시작 시간
                  <select
                    onChange={(event) =>
                      updateProfile(
                        "preferredFocusStartHour",
                        Number(event.target.value),
                      )
                    }
                    value={profile.preferredFocusStartHour}
                  >
                    {focusHourOptions.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}:00
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.selectField}>
                  종료 시간
                  <select
                    onChange={(event) =>
                      updateProfile(
                        "preferredFocusEndHour",
                        Number(event.target.value),
                      )
                    }
                    value={profile.preferredFocusEndHour}
                  >
                    {focusHourOptions.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}:00
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={styles.optionGridThree}>
                {coachingOptions.map((option) => (
                  <button
                    className={
                      profile.coachingMode === option.value
                        ? `${styles.optionCard} ${styles.selectedOption}`
                        : styles.optionCard
                    }
                    key={option.value}
                    onClick={() => updateProfile("coachingMode", option.value)}
                    type="button"
                  >
                    {profile.coachingMode === option.value ? (
                      <span className={styles.selectedCheck} aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                    <span className={styles.optionEmoji} aria-hidden="true">
                      {option.emoji}
                    </span>
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <p className={styles.answerNote}>
            정답은 없어요. 어떤 선택도 괜찮아요.
          </p>

          {errorMessage ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}
        </section>

        <div className={styles.bottomBar}>
          <button
            className={styles.previousButton}
            disabled={
              stepIndex === 0 ||
              createProfileMutation.isPending ||
              updateProfileMutation.isPending
            }
            onClick={goPrevious}
            type="button"
          >
            이전
          </button>
          <button
            className={styles.nextButton}
            disabled={
              createProfileMutation.isPending ||
              updateProfileMutation.isPending
            }
            onClick={goNext}
            type="button"
          >
            {stepIndex === totalSteps - 1
              ? createProfileMutation.isPending ||
                updateProfileMutation.isPending
                ? "저장 중"
                : "완료"
              : "다음"}
          </button>
        </div>
      </main>
    </section>
  );
}
