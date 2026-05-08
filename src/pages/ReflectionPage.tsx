import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import characterDefault from "../assets/auth/character-default.png";
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
  const [deleteTarget, setDeleteTarget] = useState<TinyWin | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [conflictDetected, setConflictDetected] = useState(false);
  const tinyWinTitleRef = useRef<HTMLInputElement | null>(null);
  const focusNewHandledRef = useRef(false);

  const homeQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getHomeToday({ token }),
    queryKey: homeTodayKey,
  });
  const targetDate = dateOverride ?? homeQuery.data?.targetDate ?? "";
  const dailyReflectionKey = queryKeys.dailyReflection(targetDate);
  const dailyReflectionQuery = useQuery({
    enabled: Boolean(token && targetDate),
    queryFn: () => getDailyReflection({ targetDate, token }),
    queryKey: dailyReflectionKey,
  });
  const tinyWinsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getTinyWins({ token }),
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
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("작은 성취를 추가했습니다.");
      setTinyWinDialog(null);
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

  const home = homeQuery.data;
  if (!home) {
    return null;
  }

  if (home.behaviorProfile === null) {
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

  const reflectionSaving =
    createReflectionMutation.isPending || updateReflectionMutation.isPending;
  const tinyWinSaving =
    createTinyWinMutation.isPending || updateTinyWinMutation.isPending;
  const friendText = getFriendAccountabilityText(home.friendAccountability);
  const profileSubtitle = getNextExamLabel(home);

  return (
    <section className={styles.page} aria-labelledby="reflection-title">
      <AppSidebar
        friendText={friendText}
        onLogout={logout}
        profileSubtitle={profileSubtitle}
      />

      <div className={styles.contentShell}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.kicker}>Reflection</p>
            <h1 id="reflection-title">회고</h1>
            <p>오늘 잘한 것과 If-Then을 짧게 남기고, 작은 성취도 함께 기록해요.</p>
          </div>
          <button
            className={styles.primaryButton}
            onClick={openCreateTinyWinDialog}
            type="button"
          >
            + 작은 성취 추가
          </button>
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

        <main className={styles.reflectionGrid}>
          <section
            aria-labelledby="daily-reflection-title"
            className={styles.reflectionPanel}
          >
            <div className={styles.panelHeader}>
              <h2 id="daily-reflection-title">하루 회고</h2>
              <span>{savedReflection ? "저장됨" : "초안"}</span>
            </div>
            <div className={styles.dateRow}>
              <label className={styles.formField} htmlFor="reflection-date">
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
              onSubmit={handleReflectionSubmit}
            >
              <div className={styles.formField}>
                <label htmlFor="what-went-well">오늘 잘한 것</label>
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
              </div>
              <div className={styles.formField}>
                <label htmlFor="what-broke-down">무너진 지점</label>
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
              </div>
              <div className={styles.formField}>
                <label htmlFor="if-condition">If</label>
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
              </div>
              <div className={styles.formField}>
                <label htmlFor="then-action">Then</label>
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
              </div>

              <div className={styles.dialogActions}>
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
              <h2 id="tiny-win-title">작은 성취</h2>
              <span>{tinyWins.length}개</span>
            </div>

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
              <ul className={styles.tinyWinList}>
                {tinyWins.map((tinyWin) => (
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
