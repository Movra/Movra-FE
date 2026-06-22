import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import characterDefault from "../assets/auth/character-default.webp";
import { recordAnalyticsEventSafely } from "../features/analytics/api";
import { useAuth } from "../features/auth/useAuth";
import { AppSidebar } from "../features/core-loop/AppSidebar";
import { getHomeToday } from "../features/core-loop/api";
import {
  getFriendAccountabilityText,
  getNextExamLabel,
} from "../features/core-loop/displayUtils";
import {
  createDailyReflection,
  createTinyWin,
  deleteTinyWin,
  getDailyReflection,
  getTinyWins,
  type TinyWin,
  updateDailyReflection,
  updateTinyWinContent,
  updateTinyWinTitle,
} from "../features/feedback/api";
import { ApiClientError } from "../shared/api/client";
import { getErrorMessage } from "../shared/api/errors";
import { queryKeys } from "../shared/queryKeys";
import { PageHeader } from "../shared/ui/PageHeader";
import { usePageGate } from "../shared/ui/usePageGate";
import styles from "./ReflectionPage.module.css";

type DailyReflectionFormState = {
  ifCondition: string;
  thenAction: string;
  whatBrokeDown: string;
  whatWentWell: string;
};

type TinyWinFormState = {
  content: string;
  title: string;
};

type TinyWinDialogState =
  | { mode: "create" }
  | { mode: "edit"; tinyWin: TinyWin }
  | null;

const homeTodayKey = queryKeys.homeToday();
const tinyWinsKey = queryKeys.tinyWins();

function createEmptyDailyReflectionForm(): DailyReflectionFormState {
  return {
    ifCondition: "",
    thenAction: "",
    whatBrokeDown: "",
    whatWentWell: "",
  };
}

function createEmptyTinyWinForm(): TinyWinFormState {
  return { content: "", title: "" };
}

function createTinyWinFormFrom(tinyWin: TinyWin): TinyWinFormState {
  return { content: tinyWin.content, title: tinyWin.title };
}

function sortTinyWins(items: TinyWin[]): TinyWin[] {
  return [...items].sort((left, right) => {
    if (left.localDate === right.localDate) {
      return left.tinyWinId.localeCompare(right.tinyWinId);
    }
    return left.localDate < right.localDate ? 1 : -1;
  });
}

export function ReflectionPage() {
  const { accessToken, logout } = useAuth();
  const token = accessToken ?? "";
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const focusParam = searchParams.get("focus");
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  const [reflectionForm, setReflectionForm] = useState<DailyReflectionFormState>(
    createEmptyDailyReflectionForm,
  );
  const [tinyWinDialog, setTinyWinDialog] = useState<TinyWinDialogState>(null);
  const [tinyWinForm, setTinyWinForm] = useState<TinyWinFormState>(
    createEmptyTinyWinForm,
  );
  const [quickTinyWinForm, setQuickTinyWinForm] = useState<TinyWinFormState>(
    createEmptyTinyWinForm,
  );
  const [deleteTarget, setDeleteTarget] = useState<TinyWin | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [conflictDetected, setConflictDetected] = useState(false);
  const tinyWinTitleRef = useRef<HTMLInputElement | null>(null);
  const focusNewHandledRef = useRef(false);

  const homeQuery = useQuery({
    enabled: Boolean(token),
    queryFn: ({ signal }) => getHomeToday({ signal, token }),
    queryKey: homeTodayKey,
  });
  const home = homeQuery.data;
  const shouldRedirectToOnboarding = usePageGate({
    behaviorProfile: home?.behaviorProfile,
  });
  const targetDate = dateOverride ?? homeQuery.data?.targetDate ?? "";
  const dailyReflectionKey = queryKeys.dailyReflection(targetDate);
  const dailyReflectionQuery = useQuery({
    enabled: Boolean(token && targetDate),
    queryFn: ({ signal }) => getDailyReflection({ signal, targetDate, token }),
    queryKey: dailyReflectionKey,
  });
  const tinyWinsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: ({ signal }) => getTinyWins({ signal, token }),
    queryKey: tinyWinsKey,
  });

  const savedReflection = dailyReflectionQuery.data ?? null;
  const tinyWins = useMemo(
    () => sortTinyWins(tinyWinsQuery.data ?? []),
    [tinyWinsQuery.data],
  );

  useEffect(() => {
    if (savedReflection) {
      setReflectionForm({
        ifCondition: savedReflection.ifCondition,
        thenAction: savedReflection.thenAction,
        whatBrokeDown: savedReflection.whatBrokeDown,
        whatWentWell: savedReflection.whatWentWell,
      });
    } else {
      setReflectionForm(createEmptyDailyReflectionForm());
    }
  }, [savedReflection?.dailyReflectionId, targetDate, savedReflection]);

  useEffect(() => {
    if (focusNewHandledRef.current) {
      return;
    }

    if (focusParam !== "new") {
      return;
    }

    if (tinyWinsQuery.isLoading || tinyWinsQuery.isError) {
      return;
    }

    focusNewHandledRef.current = true;
    setTinyWinForm(createEmptyTinyWinForm());
    setTinyWinDialog({ mode: "create" });
  }, [focusParam, tinyWinsQuery.isError, tinyWinsQuery.isLoading]);

  useEffect(() => {
    if (tinyWinDialog?.mode === "create" && tinyWinTitleRef.current) {
      tinyWinTitleRef.current.focus();
    }
  }, [tinyWinDialog]);

  const createReflectionMutation = useMutation({
    mutationFn: () =>
      createDailyReflection({
        token,
        values: {
          ifCondition: reflectionForm.ifCondition.trim(),
          reflectionDate: targetDate,
          thenAction: reflectionForm.thenAction.trim(),
          whatBrokeDown: reflectionForm.whatBrokeDown.trim(),
          whatWentWell: reflectionForm.whatWentWell.trim(),
        },
      }),
    onError: (error) => {
      if (error instanceof ApiClientError && error.status === 409) {
        setActionNotice(null);
        setActionError(null);
        setConflictDetected(true);
        return;
      }

      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      void recordAnalyticsEventSafely({
        eventType: "DAILY_REFLECTION_CREATED",
        properties: {
          has_if_then: Boolean(
            reflectionForm.ifCondition.trim() && reflectionForm.thenAction.trim(),
          ),
          source: "reflection_page",
          target_date: targetDate,
        },
        token,
      });
      setActionError(null);
      setConflictDetected(false);
      setActionNotice("회고를 저장했습니다.");
      await queryClient.invalidateQueries({ queryKey: dailyReflectionKey });
    },
  });

  const updateReflectionMutation = useMutation({
    mutationFn: () => {
      if (!savedReflection) {
        throw new Error("수정할 회고를 찾지 못했습니다.");
      }

      return updateDailyReflection({
        dailyReflectionId: savedReflection.dailyReflectionId,
        token,
        values: {
          ifCondition: reflectionForm.ifCondition.trim(),
          thenAction: reflectionForm.thenAction.trim(),
          whatBrokeDown: reflectionForm.whatBrokeDown.trim(),
          whatWentWell: reflectionForm.whatWentWell.trim(),
        },
      });
    },
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("회고를 수정했습니다.");
      await queryClient.invalidateQueries({ queryKey: dailyReflectionKey });
    },
  });

  const createTinyWinMutation = useMutation({
    mutationFn: (values: TinyWinFormState) =>
      createTinyWin({
        token,
        values: {
          content: values.content.trim(),
          title: values.title.trim(),
        },
      }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async (_data, values) => {
      void recordAnalyticsEventSafely({
        eventType: "TINY_WIN_CREATED",
        properties: {
          content_length: values.content.trim().length,
          source: "reflection_page",
          target_date: targetDate,
        },
        token,
      });
      setActionError(null);
      setActionNotice("작은 성취를 추가했습니다.");
      setTinyWinDialog(null);
      setTinyWinForm(createEmptyTinyWinForm());
      setQuickTinyWinForm(createEmptyTinyWinForm());
      await queryClient.invalidateQueries({ queryKey: tinyWinsKey });
    },
  });

  const updateTinyWinMutation = useMutation({
    mutationFn: async ({
      tinyWin,
      values,
    }: {
      tinyWin: TinyWin;
      values: TinyWinFormState;
    }) => {
      const trimmedTitle = values.title.trim();
      const trimmedContent = values.content.trim();

      if (trimmedTitle !== tinyWin.title) {
        await updateTinyWinTitle({
          tinyWinId: tinyWin.tinyWinId,
          token,
          values: { title: trimmedTitle },
        });
      }

      if (trimmedContent !== tinyWin.content) {
        await updateTinyWinContent({
          tinyWinId: tinyWin.tinyWinId,
          token,
          values: { content: trimmedContent },
        });
      }
    },
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("작은 성취를 수정했습니다.");
      setTinyWinDialog(null);
      await queryClient.invalidateQueries({ queryKey: tinyWinsKey });
    },
  });

  const deleteTinyWinMutation = useMutation({
    mutationFn: (tinyWinId: string) =>
      deleteTinyWin({ tinyWinId, token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("작은 성취를 삭제했습니다.");
      setDeleteTarget(null);
      setTinyWinDialog(null);
      await queryClient.invalidateQueries({ queryKey: tinyWinsKey });
    },
  });

  if (homeQuery.isLoading) {
    return (
      <section className={styles.centerState} aria-live="polite">
        <img src={characterDefault} alt="" aria-hidden="true" />
        <p>회고를 불러오는 중입니다.</p>
      </section>
    );
  }

  if (homeQuery.isError) {
    return (
      <section className={styles.centerState} aria-live="assertive">
        <img src={characterDefault} alt="" aria-hidden="true" />
        <h1>회고 화면을 불러오지 못했습니다.</h1>
        <p>{getErrorMessage(homeQuery.error)}</p>
        <button onClick={() => homeQuery.refetch()} type="button">
          다시 시도
        </button>
      </section>
    );
  }

  if (!home) {
    return null;
  }

  if (shouldRedirectToOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  function updateReflectionField<K extends keyof DailyReflectionFormState>(
    field: K,
    value: DailyReflectionFormState[K],
  ) {
    setReflectionForm((current) => ({ ...current, [field]: value }));
  }

  function updateTinyWinField<K extends keyof TinyWinFormState>(
    field: K,
    value: TinyWinFormState[K],
  ) {
    setTinyWinForm((current) => ({ ...current, [field]: value }));
  }

  function updateQuickTinyWinField<K extends keyof TinyWinFormState>(
    field: K,
    value: TinyWinFormState[K],
  ) {
    setQuickTinyWinForm((current) => ({ ...current, [field]: value }));
  }

  function isReflectionFormReady() {
    return (
      reflectionForm.ifCondition.trim() !== "" &&
      reflectionForm.thenAction.trim() !== "" &&
      reflectionForm.whatBrokeDown.trim() !== "" &&
      reflectionForm.whatWentWell.trim() !== ""
    );
  }

  function handleReflectionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isReflectionFormReady()) {
      setActionNotice(null);
      setActionError("회고를 저장하려면 네 칸을 모두 채워주세요.");
      return;
    }

    if (savedReflection) {
      updateReflectionMutation.mutate();
      return;
    }

    createReflectionMutation.mutate();
  }

  function handleConflictReload() {
    setConflictDetected(false);
    void queryClient.invalidateQueries({ queryKey: dailyReflectionKey });
  }

  function openCreateTinyWinDialog() {
    setTinyWinForm(createEmptyTinyWinForm());
    setTinyWinDialog({ mode: "create" });
  }

  function openEditTinyWinDialog(tinyWin: TinyWin) {
    setTinyWinForm(createTinyWinFormFrom(tinyWin));
    setTinyWinDialog({ mode: "edit", tinyWin });
  }

  function handleTinyWinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = tinyWinForm.title.trim();
    const trimmedContent = tinyWinForm.content.trim();

    if (!trimmedTitle || !trimmedContent) {
      setActionNotice(null);
      setActionError("제목과 내용을 모두 입력해주세요.");
      return;
    }

    if (tinyWinDialog?.mode === "edit") {
      updateTinyWinMutation.mutate({
        tinyWin: tinyWinDialog.tinyWin,
        values: { content: trimmedContent, title: trimmedTitle },
      });
      return;
    }

    createTinyWinMutation.mutate({
      content: trimmedContent,
      title: trimmedTitle,
    });
  }

  function handleQuickTinyWinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = quickTinyWinForm.title.trim();
    const trimmedContent = quickTinyWinForm.content.trim();

    if (!trimmedTitle || !trimmedContent) {
      setActionNotice(null);
      setActionError("작은 성취의 제목과 내용을 모두 입력해주세요.");
      return;
    }

    createTinyWinMutation.mutate({
      content: trimmedContent,
      title: trimmedTitle,
    });
  }

  const reflectionSaving =
    createReflectionMutation.isPending || updateReflectionMutation.isPending;
  const tinyWinSaving =
    createTinyWinMutation.isPending || updateTinyWinMutation.isPending;
  const friendText = getFriendAccountabilityText(home.friendAccountability);
  const profileSubtitle = getNextExamLabel(home);
  const completedReflectionFieldCount = [
    reflectionForm.whatWentWell,
    reflectionForm.whatBrokeDown,
    reflectionForm.ifCondition,
    reflectionForm.thenAction,
  ].filter((value) => value.trim() !== "").length;
  const reflectionProgress = Math.round((completedReflectionFieldCount / 4) * 100);
  const todayTinyWins = tinyWins.filter(
    (tinyWin) => tinyWin.localDate === targetDate,
  );
  const visibleTinyWins = todayTinyWins.length > 0 ? todayTinyWins : tinyWins.slice(0, 5);

  return (
    <section className={styles.page} aria-labelledby="reflection-title">
      <AppSidebar
        friendText={friendText}
        onLogout={logout}
        profileSubtitle={profileSubtitle}
      />

      <div className={styles.contentShell}>
        <PageHeader
          className={styles.pageHeader}
          description="오늘의 흐름을 정리하고, 다음번에 바로 쓸 행동 하나를 남겨요."
          eyebrow="Reflection"
          title="회고"
          titleId="reflection-title"
          actions={
            <div className={styles.headerStatus} aria-label="회고 작성 상태">
              <span>{savedReflection ? "저장된 회고" : "작성 중인 회고"}</span>
              <strong>{completedReflectionFieldCount}/4</strong>
              <small>{reflectionProgress}% 작성</small>
            </div>
          }
        />

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

        <main className={styles.reflectionGrid}>
          <section
            aria-labelledby="daily-reflection-title"
            className={styles.reflectionPanel}
          >
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.panelEyebrow}>Daily Review</span>
                <h2 id="daily-reflection-title">오늘 회고</h2>
              </div>
              <span className={styles.statusPill}>
                {savedReflection ? "저장됨" : "초안"}
              </span>
            </div>

            <div className={styles.reflectionMetaBar}>
              <label className={styles.datePickerField} htmlFor="reflection-date">
                <span>날짜</span>
                <input
                  className={styles.dateInput}
                  id="reflection-date"
                  onChange={(event) =>
                    setDateOverride(event.target.value || null)
                  }
                  type="date"
                  value={targetDate}
                />
              </label>
              <div className={styles.progressSummary}>
                <div>
                  <span>필수 항목</span>
                  <strong>{completedReflectionFieldCount} / 4</strong>
                </div>
                <div className={styles.progressTrack} aria-hidden="true">
                  <span style={{ width: `${reflectionProgress}%` }} />
                </div>
              </div>
            </div>

            {dailyReflectionQuery.isLoading ? (
              <p>회고를 불러오는 중입니다.</p>
            ) : dailyReflectionQuery.isError ? (
              <p className={styles.error} role="alert">
                회고를 불러오지 못했습니다.
              </p>
            ) : null}

            <form
              aria-label="하루 회고"
              className={styles.reflectionForm}
              id="daily-reflection-form"
              onSubmit={handleReflectionSubmit}
            >
              <section className={styles.reflectionStep}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepNumber}>1</span>
                  <div>
                    <h3>잘된 흐름 붙잡기</h3>
                    <p>계속 가져가고 싶은 행동을 한 문장으로 적어요.</p>
                  </div>
                </div>
                <label className={styles.formField} htmlFor="what-went-well">
                  <span>오늘 잘한 것</span>
                  <textarea
                    className={styles.textarea}
                    id="what-went-well"
                    maxLength={500}
                    onChange={(event) =>
                      updateReflectionField("whatWentWell", event.target.value)
                    }
                    placeholder="아침에 계획대로 시작함"
                    value={reflectionForm.whatWentWell}
                  />
                </label>
              </section>

              <section className={styles.reflectionStep}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepNumber}>2</span>
                  <div>
                    <h3>막힌 지점 확인하기</h3>
                    <p>비난보다 패턴을 찾는 데 집중해요.</p>
                  </div>
                </div>
                <label className={styles.formField} htmlFor="what-broke-down">
                  <span>무너진 지점</span>
                  <textarea
                    className={styles.textarea}
                    id="what-broke-down"
                    maxLength={1000}
                    onChange={(event) =>
                      updateReflectionField("whatBrokeDown", event.target.value)
                    }
                    placeholder="어디에서 흐름이 끊겼나요?"
                    value={reflectionForm.whatBrokeDown}
                  />
                </label>
              </section>

              <section className={styles.reflectionStep}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepNumber}>3</span>
                  <div>
                    <h3>다음 행동 정하기</h3>
                    <p>상황과 행동을 연결해 다음번 선택을 더 쉽게 만들어요.</p>
                  </div>
                </div>
                <div className={styles.ifThenGrid}>
                  <label className={styles.formField} htmlFor="if-condition">
                    <span>If</span>
                    <textarea
                      className={styles.textarea}
                      id="if-condition"
                      maxLength={500}
                      onChange={(event) =>
                        updateReflectionField("ifCondition", event.target.value)
                      }
                      placeholder="다음에 이런 상황이면"
                      value={reflectionForm.ifCondition}
                    />
                  </label>
                  <label className={styles.formField} htmlFor="then-action">
                    <span>Then</span>
                    <textarea
                      className={styles.textarea}
                      id="then-action"
                      maxLength={500}
                      onChange={(event) =>
                        updateReflectionField("thenAction", event.target.value)
                      }
                      placeholder="이 행동으로 돌아오기"
                      value={reflectionForm.thenAction}
                    />
                  </label>
                </div>
              </section>

              <div className={styles.formFooter}>
                <p>
                  {completedReflectionFieldCount === 4
                    ? "저장할 준비가 됐습니다."
                    : "네 칸을 모두 채우면 오늘 회고를 저장할 수 있어요."}
                </p>
                <button
                  className={styles.primaryButton}
                  disabled={reflectionSaving}
                  type="submit"
                >
                  {savedReflection ? "회고 수정" : "회고 저장"}
                </button>
              </div>
            </form>

            {conflictDetected ? (
              <div className={styles.conflict} role="alert">
                <span>
                  이미 오늘 회고가 저장되어 있습니다. 새로고침 후 수정해주세요.
                </span>
                <button onClick={handleConflictReload} type="button">
                  다시 불러오기
                </button>
              </div>
            ) : null}
          </section>

          <section
            aria-labelledby="tiny-win-title"
            className={styles.tinyWinPanel}
          >
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.panelEyebrow}>Tiny Win</span>
                <h2 id="tiny-win-title">작은 성취</h2>
              </div>
              <button
                className={styles.secondaryButton}
                onClick={openCreateTinyWinDialog}
                type="button"
              >
                + 작은 성취 추가
              </button>
            </div>

            <form
              className={styles.quickTinyWinForm}
              onSubmit={handleQuickTinyWinSubmit}
            >
              <div className={styles.quickFormHeader}>
                <strong>지금 떠오른 성취</strong>
                <span>짧게 남겨도 충분해요.</span>
              </div>
              <label className={styles.formField}>
                빠른 제목
                <input
                  className={styles.input}
                  maxLength={30}
                  onChange={(event) =>
                    updateQuickTinyWinField("title", event.target.value)
                  }
                  placeholder="예: 20분 집중"
                  value={quickTinyWinForm.title}
                />
              </label>
              <label className={styles.formField}>
                성취 내용
                <textarea
                  className={`${styles.textarea} ${styles.compactTextarea}`}
                  maxLength={3000}
                  onChange={(event) =>
                    updateQuickTinyWinField("content", event.target.value)
                  }
                  placeholder="오늘 해낸 일을 한 줄로 적어보세요."
                  value={quickTinyWinForm.content}
                />
              </label>
              <button
                className={styles.primaryButton}
                disabled={createTinyWinMutation.isPending}
                type="submit"
              >
                빠르게 남기기
              </button>
            </form>

            {tinyWinsQuery.isLoading ? (
              <p>작은 성취 목록을 불러오는 중입니다.</p>
            ) : tinyWinsQuery.isError ? (
              <div className={styles.emptyPanel} role="alert">
                <strong>작은 성취 목록을 불러오지 못했습니다.</strong>
                <button
                  className={styles.secondaryButton}
                  onClick={() => tinyWinsQuery.refetch()}
                  type="button"
                >
                  다시 시도
                </button>
              </div>
            ) : tinyWins.length === 0 ? (
              <div className={styles.emptyPanel}>
                <strong>아직 남긴 작은 성취가 없어요.</strong>
                <button
                  className={styles.secondaryButton}
                  onClick={openCreateTinyWinDialog}
                  type="button"
                >
                  + 작은 성취 추가
                </button>
              </div>
            ) : (
              <div className={styles.tinyWinHistory}>
                <div className={styles.tinyWinListHeader}>
                  <span>
                    {todayTinyWins.length > 0 ? "오늘 남긴 성취" : "최근 성취"}
                  </span>
                  <small>{tinyWins.length}개 기록</small>
                </div>
                <ul className={styles.tinyWinList}>
                  {visibleTinyWins.map((tinyWin) => (
                    <li key={tinyWin.tinyWinId}>
                      <button
                        className={styles.tinyWinItem}
                        onClick={() => openEditTinyWinDialog(tinyWin)}
                        type="button"
                      >
                        <span className={styles.tinyWinItemHeader}>
                          <strong>{tinyWin.title}</strong>
                          <span className={styles.tinyWinItemDate}>
                            {tinyWin.localDate}
                          </span>
                        </span>
                        <p className={styles.tinyWinItemPreview}>
                          {tinyWin.content}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </main>

        {tinyWinDialog ? (
          <div className={styles.modalBackdrop}>
            <form
              aria-label={
                tinyWinDialog.mode === "create"
                  ? "작은 성취 추가"
                  : "작은 성취 수정"
              }
              className={styles.dialog}
              onSubmit={handleTinyWinSubmit}
              role="dialog"
            >
              <header>
                <h2>
                  {tinyWinDialog.mode === "create"
                    ? "작은 성취 추가"
                    : "작은 성취 수정"}
                </h2>
                <button
                  aria-label="작은 성취 대화상자 닫기"
                  onClick={() => setTinyWinDialog(null)}
                  type="button"
                >
                  ×
                </button>
              </header>
              <label className={styles.formField}>
                제목
                <input
                  className={styles.input}
                  maxLength={30}
                  onChange={(event) =>
                    updateTinyWinField("title", event.target.value)
                  }
                  ref={tinyWinTitleRef}
                  value={tinyWinForm.title}
                />
              </label>
              <label className={styles.formField}>
                내용
                <textarea
                  className={styles.textarea}
                  maxLength={3000}
                  onChange={(event) =>
                    updateTinyWinField("content", event.target.value)
                  }
                  value={tinyWinForm.content}
                />
              </label>
              <div className={styles.dialogActions}>
                {tinyWinDialog.mode === "edit" ? (
                  <button
                    className={styles.dangerButton}
                    onClick={() => setDeleteTarget(tinyWinDialog.tinyWin)}
                    type="button"
                  >
                    삭제
                  </button>
                ) : null}
                <button
                  className={styles.secondaryButton}
                  onClick={() => setTinyWinDialog(null)}
                  type="button"
                >
                  취소
                </button>
                <button
                  className={styles.primaryButton}
                  disabled={tinyWinSaving}
                  type="submit"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {deleteTarget ? (
          <div className={styles.modalBackdrop}>
            <div
              aria-label="작은 성취 삭제 확인"
              className={styles.dialog}
              role="dialog"
            >
              <header>
                <h2>작은 성취 삭제</h2>
                <button
                  aria-label="작은 성취 삭제 대화상자 닫기"
                  onClick={() => setDeleteTarget(null)}
                  type="button"
                >
                  ×
                </button>
              </header>
              <p>
                <strong>{deleteTarget.title}</strong>을(를) 삭제할까요?
              </p>
              <div className={styles.dialogActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setDeleteTarget(null)}
                  type="button"
                >
                  취소
                </button>
                <button
                  className={styles.dangerButton}
                  disabled={deleteTinyWinMutation.isPending}
                  onClick={() =>
                    deleteTinyWinMutation.mutate(deleteTarget.tinyWinId)
                  }
                  type="button"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
