import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

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
  updateNotificationPreference,
} from "../features/notification/api";
import type { NotificationPreferenceUpdateRequest } from "../features/notification/types";
import { getErrorMessage } from "../shared/api/errors";
import { queryKeys } from "../shared/queryKeys";
import styles from "./SettingsPage.module.css";

const homeTodayKey = queryKeys.homeToday();
const notificationPreferenceKey = queryKeys.notificationPreference();

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
        </div>
      </div>
    </section>
  );
}
