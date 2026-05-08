import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import type {
  BehaviorProfile,
  CoachingMode,
  ExamTrack,
  ExecutionDifficulty,
  RecoveryStyle,
  SocialPreference,
} from "../features/onboarding/types";

import characterDefault from "../assets/auth/character-default.png";
import { useAuth } from "../features/auth/useAuth";
import { AppSidebar } from "../features/core-loop/AppSidebar";
import { getHomeToday } from "../features/core-loop/api";
import {
  getFriendAccountabilityText,
  getNextExamLabel,
} from "../features/core-loop/displayUtils";
import {
  getNotificationPreference,
  getVapidPublicKey,
  subscribeWebPush,
  updateNotificationPreference,
} from "../features/notification/api";
import type { NotificationPreferenceUpdateRequest } from "../features/notification/types";
import { subscribeBrowserToWebPush } from "../features/notification/webPush";
import { getErrorMessage } from "../shared/api/errors";
import { queryKeys } from "../shared/queryKeys";
import styles from "./SettingsPage.module.css";

const homeTodayKey = queryKeys.homeToday();
const notificationPreferenceKey = queryKeys.notificationPreference();
const webPushEndpointStorageKey = "movra:webPushEndpoint";

const executionDifficultyLabels: Record<ExecutionDifficulty, string> = {
  HIGH: "어려움",
  LOW: "쉬움",
  MEDIUM: "보통",
};

const socialPreferenceLabels: Record<SocialPreference, string> = {
  HIGH: "같이 확인하기",
  LOW: "혼자 조용히",
  MEDIUM: "적당히 함께",
};

const recoveryStyleLabels: Record<RecoveryStyle, string> = {
  NEEDS_REFLECTION: "차분한 회고",
  QUICK_RESTART: "빠른 재시작",
  SLOW_REBUILDER: "천천히 회복",
};

const examTrackLabels: Record<ExamTrack, string> = {
  BOTH: "둘 다",
  MOPYUNG_SUNUNG: "모평/수능 중심",
  NAESIN: "내신 중심",
  UNDECIDED: "아직 몰라요",
};

const coachingModeLabels: Record<CoachingMode, string> = {
  GENTLE: "다정하게",
  NEUTRAL: "차분하게",
  STRICT: "분명하게",
};

function describeFocusHours(profile: BehaviorProfile) {
  return `${profile.preferredFocusStartHour}:00 ~ ${profile.preferredFocusEndHour}:00`;
}

function isWebPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    typeof window.Notification !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof navigator.serviceWorker !== "undefined" &&
    "PushManager" in window &&
    typeof window.PushManager !== "undefined"
  );
}

type NotificationFormState = NotificationPreferenceUpdateRequest;

function createDefaultNotificationForm(): NotificationFormState {
  return {
    accountabilityEnabled: false,
    dailyFocusEnabled: true,
    dailyTimetableEnabled: true,
    dailyTopPicksEnabled: true,
    maxDailyPushCount: 3,
    schoolHoursEnd: "15:30",
    schoolHoursQuietEnabled: true,
    schoolHoursStart: "08:00",
    sleepHoursQuietEnabled: true,
    weekendSchoolQuietEnabled: false,
  };
}

export function SettingsPage() {
  const { accessToken, logout } = useAuth();
  const token = accessToken ?? "";
  const queryClient = useQueryClient();
  const [notificationForm, setNotificationForm] = useState<NotificationFormState>(
    createDefaultNotificationForm,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [webPushSupported] = useState(() => isWebPushSupported());
  const [webPushPermission, setWebPushPermission] =
    useState<NotificationPermission>(() =>
      isWebPushSupported() ? window.Notification.permission : "default",
    );
  const [storedEndpoint, setStoredEndpoint] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? window.localStorage.getItem(webPushEndpointStorageKey)
      : null,
  );
  const [webPushPending, setWebPushPending] = useState(false);
  const [webPushExistingMatchesStored, setWebPushExistingMatchesStored] =
    useState(false);

  const homeQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getHomeToday({ token }),
    queryKey: homeTodayKey,
  });

  const preferenceQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getNotificationPreference({ token }),
    queryKey: notificationPreferenceKey,
  });

  const preference = preferenceQuery.data ?? null;

  useEffect(() => {
    if (!preference) {
      return;
    }
    setNotificationForm({
      accountabilityEnabled: preference.accountabilityEnabled,
      dailyFocusEnabled: preference.dailyFocusEnabled,
      dailyTimetableEnabled: preference.dailyTimetableEnabled,
      dailyTopPicksEnabled: preference.dailyTopPicksEnabled,
      maxDailyPushCount: preference.maxDailyPushCount,
      schoolHoursEnd: preference.schoolHoursEnd,
      schoolHoursQuietEnabled: preference.schoolHoursQuietEnabled,
      schoolHoursStart: preference.schoolHoursStart,
      sleepHoursQuietEnabled: true,
      weekendSchoolQuietEnabled: preference.weekendSchoolQuietEnabled,
    });
  }, [preference]);

  useEffect(() => {
    if (!webPushSupported) {
      return;
    }
    if (webPushPermission !== "granted") {
      setWebPushExistingMatchesStored(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (cancelled) return;
        if (existing && storedEndpoint && existing.endpoint === storedEndpoint) {
          setWebPushExistingMatchesStored(true);
        } else {
          setWebPushExistingMatchesStored(false);
        }
      } catch {
        if (!cancelled) {
          setWebPushExistingMatchesStored(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storedEndpoint, webPushPermission, webPushSupported]);

  const updatePreferenceMutation = useMutation({
    mutationFn: (values: NotificationPreferenceUpdateRequest) =>
      updateNotificationPreference({ token, values }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: (data) => {
      setActionError(null);
      setActionNotice("알림 설정을 저장했습니다.");
      queryClient.setQueryData(notificationPreferenceKey, data);
    },
  });

  if (homeQuery.isLoading) {
    return (
      <section className={styles.centerState} aria-live="polite">
        <img src={characterDefault} alt="" aria-hidden="true" />
        <p>설정을 불러오는 중입니다.</p>
      </section>
    );
  }

  if (homeQuery.isError) {
    return (
      <section className={styles.centerState} aria-live="assertive">
        <img src={characterDefault} alt="" aria-hidden="true" />
        <h1>설정 화면을 불러오지 못했습니다.</h1>
        <p>{getErrorMessage(homeQuery.error)}</p>
        <button onClick={() => homeQuery.refetch()} type="button">
          다시 시도
        </button>
      </section>
    );
  }

  const home = homeQuery.data;
  if (!home) {
    return null;
  }

  if (home.behaviorProfile === null) {
    return <Navigate to="/onboarding" replace />;
  }

  function updateNotificationField<K extends keyof NotificationFormState>(
    field: K,
    value: NotificationFormState[K],
  ) {
    setNotificationForm((current) => ({ ...current, [field]: value }));
  }

  async function handleWebPushClick() {
    if (!webPushSupported) {
      return;
    }
    setWebPushPending(true);
    setActionError(null);
    setActionNotice(null);
    try {
      let permission = window.Notification.permission;
      if (permission === "default") {
        permission = await window.Notification.requestPermission();
      }
      if (permission !== "granted") {
        setWebPushPermission(permission);
        setActionError("브라우저 설정에서 알림 권한을 허용해 주세요.");
        return;
      }
      setWebPushPermission(permission);

      const { publicKey } = await getVapidPublicKey();
      const subscription = await subscribeBrowserToWebPush(publicKey);
      await subscribeWebPush({
        token,
        values: {
          contentEncoding: "aes128gcm",
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          userAgent: navigator.userAgent,
        },
      });
      window.localStorage.setItem(
        webPushEndpointStorageKey,
        subscription.endpoint,
      );
      setStoredEndpoint(subscription.endpoint);
      setWebPushExistingMatchesStored(true);
      setActionNotice("Web Push 알림 등록을 완료했어요.");
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setWebPushPending(false);
    }
  }

  function handleNotificationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (notificationForm.schoolHoursStart >= notificationForm.schoolHoursEnd) {
      setActionNotice(null);
      setActionError("학교 시간 시작은 종료 시간보다 빨라야 합니다.");
      return;
    }

    if (
      notificationForm.maxDailyPushCount < 0 ||
      notificationForm.maxDailyPushCount > 10
    ) {
      setActionNotice(null);
      setActionError("하루 최대 푸시 수는 0~10 사이여야 합니다.");
      return;
    }

    setActionError(null);
    updatePreferenceMutation.mutate({
      ...notificationForm,
      sleepHoursQuietEnabled: true,
    });
  }

  const friendText = getFriendAccountabilityText(home.friendAccountability);
  const profileSubtitle = getNextExamLabel(home);
  const preferenceLoading = preferenceQuery.isLoading;
  const preferenceError = preferenceQuery.isError;
  const updatePending = updatePreferenceMutation.isPending;

  return (
    <section className={styles.page} aria-labelledby="settings-title">
      <AppSidebar
        friendText={friendText}
        onLogout={logout}
        profileSubtitle={profileSubtitle}
      />

      <div className={styles.contentShell}>
        <header className={styles.pageHeader}>
          <p className={styles.kicker}>Settings</p>
          <h1 id="settings-title">설정</h1>
          <p>알림 정책과 Web Push, 행동 프로필을 한 곳에서 관리해요.</p>
        </header>

        {actionError ? (
          <p className={styles.error} role="alert">
            {actionError}
          </p>
        ) : null}
        {actionNotice ? (
          <p className={styles.success} role="status">
            {actionNotice}
          </p>
        ) : null}

        <div className={styles.sectionGrid}>
          <section
            aria-labelledby="notification-section-title"
            className={styles.section}
          >
            <h2 id="notification-section-title">알림 설정</h2>
            <p>홈, 회고, 친구 알림을 켜고 끌 수 있어요. 수면 시간 무음은 항상 켜져 있어요.</p>

            {preferenceLoading ? (
              <p>알림 설정을 불러오는 중입니다.</p>
            ) : preferenceError ? (
              <p className={styles.error} role="alert">
                알림 설정을 불러오지 못했습니다.
              </p>
            ) : null}

            <form aria-label="알림 설정" onSubmit={handleNotificationSubmit}>
              <div className={styles.toggleList}>
                <label className={styles.toggleRow}>
                  <span>일일 집중 알림</span>
                  <input
                    checked={notificationForm.dailyFocusEnabled}
                    onChange={(event) =>
                      updateNotificationField(
                        "dailyFocusEnabled",
                        event.target.checked,
                      )
                    }
                    type="checkbox"
                  />
                </label>
                <label className={styles.toggleRow}>
                  <span>일일 TopPick 알림</span>
                  <input
                    checked={notificationForm.dailyTopPicksEnabled}
                    onChange={(event) =>
                      updateNotificationField(
                        "dailyTopPicksEnabled",
                        event.target.checked,
                      )
                    }
                    type="checkbox"
                  />
                </label>
                <label className={styles.toggleRow}>
                  <span>일일 시간표 알림</span>
                  <input
                    checked={notificationForm.dailyTimetableEnabled}
                    onChange={(event) =>
                      updateNotificationField(
                        "dailyTimetableEnabled",
                        event.target.checked,
                      )
                    }
                    type="checkbox"
                  />
                </label>
                <label className={styles.toggleRow}>
                  <span>Accountability 알림</span>
                  <input
                    checked={notificationForm.accountabilityEnabled}
                    onChange={(event) =>
                      updateNotificationField(
                        "accountabilityEnabled",
                        event.target.checked,
                      )
                    }
                    type="checkbox"
                  />
                </label>
                <label className={styles.toggleRow}>
                  <span>학교 시간 무음</span>
                  <input
                    checked={notificationForm.schoolHoursQuietEnabled}
                    onChange={(event) =>
                      updateNotificationField(
                        "schoolHoursQuietEnabled",
                        event.target.checked,
                      )
                    }
                    type="checkbox"
                  />
                </label>
                <label className={styles.toggleRow}>
                  <span>주말 학교 시간 무음</span>
                  <input
                    checked={notificationForm.weekendSchoolQuietEnabled}
                    onChange={(event) =>
                      updateNotificationField(
                        "weekendSchoolQuietEnabled",
                        event.target.checked,
                      )
                    }
                    type="checkbox"
                  />
                </label>
                <label className={styles.toggleRow}>
                  <span>수면 시간 무음</span>
                  <input checked disabled type="checkbox" />
                </label>
                <p className={styles.policyNote}>
                  수면 시간 무음은 정책상 항상 켜져 있어요.
                </p>
              </div>

              <div className={styles.timeRow}>
                <label className={styles.field}>
                  <span>학교 시간 시작</span>
                  <input
                    className={styles.input}
                    onChange={(event) =>
                      updateNotificationField(
                        "schoolHoursStart",
                        event.target.value,
                      )
                    }
                    type="time"
                    value={notificationForm.schoolHoursStart}
                  />
                </label>
                <label className={styles.field}>
                  <span>학교 시간 종료</span>
                  <input
                    className={styles.input}
                    onChange={(event) =>
                      updateNotificationField(
                        "schoolHoursEnd",
                        event.target.value,
                      )
                    }
                    type="time"
                    value={notificationForm.schoolHoursEnd}
                  />
                </label>
              </div>

              <div className={styles.numberRow}>
                <label className={styles.field}>
                  <span>하루 최대 푸시 수</span>
                  <input
                    className={styles.input}
                    onChange={(event) =>
                      updateNotificationField(
                        "maxDailyPushCount",
                        Number(event.target.value),
                      )
                    }
                    step={1}
                    type="number"
                    value={notificationForm.maxDailyPushCount}
                  />
                </label>
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.primaryButton}
                  disabled={updatePending}
                  type="submit"
                >
                  알림 설정 저장하기
                </button>
              </div>
            </form>
          </section>

          <section
            aria-labelledby="behavior-profile-section-title"
            className={styles.section}
          >
            <h2 id="behavior-profile-section-title">행동 프로필</h2>
            <p>지금 내 루프에 맞춰진 기본값이에요. 언제든 수정할 수 있어요.</p>

            <dl className={styles.profileList}>
              <div>
                <dt>실행 난이도</dt>
                <dd>
                  {executionDifficultyLabels[home.behaviorProfile.executionDifficulty]}
                </dd>
              </div>
              <div>
                <dt>사회적 선호</dt>
                <dd>
                  {socialPreferenceLabels[home.behaviorProfile.socialPreference]}
                </dd>
              </div>
              <div>
                <dt>회복 스타일</dt>
                <dd>
                  {recoveryStyleLabels[home.behaviorProfile.recoveryStyle]}
                </dd>
              </div>
              <div>
                <dt>시험 트랙</dt>
                <dd>{examTrackLabels[home.behaviorProfile.examTrack]}</dd>
              </div>
              <div>
                <dt>선호 집중 시간</dt>
                <dd>{describeFocusHours(home.behaviorProfile)}</dd>
              </div>
              <div>
                <dt>코칭 모드</dt>
                <dd>{coachingModeLabels[home.behaviorProfile.coachingMode]}</dd>
              </div>
            </dl>

            <div className={styles.actions}>
              <Link className={styles.editLink} to="/onboarding?mode=edit">
                수정하기
              </Link>
            </div>
          </section>

          <section
            aria-labelledby="web-push-section-title"
            className={styles.section}
          >
            <h2 id="web-push-section-title">Web Push</h2>
            <p>등록한 브라우저로 알림을 받을 수 있어요.</p>

            {!webPushSupported ? (
              <p>이 브라우저에서는 Web Push를 사용할 수 없습니다.</p>
            ) : webPushPermission === "denied" ? (
              <p>브라우저 설정에서 알림 권한을 허용해 주세요.</p>
            ) : null}

            <div className={styles.actions}>
              <button
                className={styles.primaryButton}
                disabled={
                  !webPushSupported ||
                  webPushPermission === "denied" ||
                  webPushPending
                }
                onClick={handleWebPushClick}
                type="button"
              >
                {webPushExistingMatchesStored
                  ? "다시 등록"
                  : "Web Push 알림 받기"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
