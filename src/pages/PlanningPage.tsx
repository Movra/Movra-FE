import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate, NavLink } from "react-router-dom";

import characterDefault from "../assets/auth/character-default.png";
import characterMindSweep from "../assets/auth/character-mindsweep.png";
import { AppSidebar } from "../features/core-loop/AppSidebar";
import { useAuth } from "../features/auth/useAuth";
import {
  completeMindSweep,
  createMindSweep,
  deleteMindSweep,
  getHomeToday,
  selectTopPick,
  uncompleteMindSweep,
  unselectTopPick,
  updateMindSweep,
} from "../features/core-loop/api";
import {
  getFriendAccountabilityText,
  getNextExamLabel,
} from "../features/core-loop/displayUtils";
import { formatTopPickLimit, getTopPickLimit } from "../features/core-loop/topPickPolicy";
import type { DailyPlanTask, HomeToday, TopPick } from "../features/core-loop/types";
import { getErrorMessage } from "../shared/api/errors";
import { queryKeys } from "../shared/queryKeys";
import styles from "./PlanningPage.module.css";

const homeTodayKey = queryKeys.homeToday();
const estimatedMinuteOptions = [30, 60, 80, 90, 120] as const;
const toastVisibleMs = 1000;
const toastFadeMs = 240;

type FlowStep = "mindSweep" | "topPick";
type CreateMindSweepContext = {
  previousHome?: HomeToday;
};
type PlanningIconType =
  | "back"
  | "bookmark"
  | "calendar"
  | "check"
  | "delete"
  | "edit"
  | "plus"
  | "send"
  | "settings"
  | "star";

type EditableTaskRowProps = {
  completedLabel: string;
  deleteLabel: string;
  editInputLabel: string;
  editingValue: string;
  isEditing: boolean;
  isTopPicked?: boolean;
  onCancelEdit: () => void;
  onDelete: () => void;
  onEditingValueChange: (value: string) => void;
  onSaveEdit: (event: FormEvent<HTMLFormElement>) => void;
  onStartEdit: () => void;
  onToggle: () => void;
  task: DailyPlanTask;
  toggleLabel: string;
};

function PlanningIcon({ type }: { type: PlanningIconType }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {type === "back" ? <path d="m15 18-6-6 6-6" /> : null}
      {type === "bookmark" ? (
        <path d="M6 4h12v17l-6-4-6 4V4Z" />
      ) : null}
      {type === "calendar" ? (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </>
      ) : null}
      {type === "check" ? <path d="m5 12 4 4L19 6" /> : null}
      {type === "delete" ? (
        <>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6 18 20H6L5 6" />
          <path d="M10 11v5M14 11v5" />
        </>
      ) : null}
      {type === "edit" ? (
        <>
          <path d="M12 20h9" />
          <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" />
        </>
      ) : null}
      {type === "plus" ? <path d="M12 5v14M5 12h14" /> : null}
      {type === "send" ? (
        <>
          <path d="m5 12 14-7-7 14-2-5-5-2Z" />
          <path d="m10 14 4-4" />
        </>
      ) : null}
      {type === "settings" ? (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.3 3.1h5l.3-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" />
        </>
      ) : null}
      {type === "star" ? (
        <path d="m12 3 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7L6.8 19l1-5.8-4.2-4.1 5.8-.8L12 3Z" />
      ) : null}
    </svg>
  );
}

function TaskIcon({ checked }: { checked: boolean }) {
  return checked ? (
    <span className={styles.checkedIcon} aria-hidden="true">
      <PlanningIcon type="check" />
    </span>
  ) : (
    <span className={styles.emptyCheckIcon} aria-hidden="true" />
  );
}

function formatDisplayDate(targetDate: string) {
  const [year, month, day] = targetDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return targetDate;
  }

  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(
    2,
    "0",
  )} (${weekdays[date.getDay()]})`;
}

function getTopPickForTask(task: DailyPlanTask, topPicks: TopPick[]) {
  return topPicks.find((topPick) => topPick.taskId === task.taskId) ?? null;
}

function isTaskTopPicked(task: DailyPlanTask, topPicks: TopPick[]) {
  return Boolean(task.topPicked || getTopPickForTask(task, topPicks));
}

function getTaskEstimatedMinutes(task: DailyPlanTask, topPicks: TopPick[]) {
  return (
    getTopPickForTask(task, topPicks)?.estimatedMinutes ??
    task.topPickDetail?.estimatedMinutes ??
    null
  );
}

function EditableTaskRow({
  completedLabel,
  deleteLabel,
  editInputLabel,
  editingValue,
  isEditing,
  isTopPicked = false,
  onCancelEdit,
  onDelete,
  onEditingValueChange,
  onSaveEdit,
  onStartEdit,
  onToggle,
  task,
  toggleLabel,
}: EditableTaskRowProps) {
  return (
    <li className={task.completed ? styles.completedTaskRow : styles.taskRow}>
      <button
        aria-label={toggleLabel}
        className={styles.checkButton}
        onClick={onToggle}
        type="button"
      >
        <TaskIcon checked={task.completed} />
      </button>

      <div className={styles.taskContent}>
        {isEditing ? (
          <form className={styles.inlineEditForm} onSubmit={onSaveEdit}>
            <label className={styles.visuallyHidden} htmlFor={`edit-${task.taskId}`}>
              {editInputLabel}
            </label>
            <input
              id={`edit-${task.taskId}`}
              maxLength={255}
              onChange={(event) => onEditingValueChange(event.target.value)}
              value={editingValue}
            />
            <button className={styles.saveTextButton} type="submit">
              저장
            </button>
            <button
              className={styles.cancelTextButton}
              onClick={onCancelEdit}
              type="button"
            >
              취소
            </button>
          </form>
        ) : (
          <>
            <span>{task.content}</span>
            <div className={styles.taskMeta}>
              {isTopPicked ? <strong>TopPick</strong> : null}
              {task.completed ? <em>{completedLabel}</em> : null}
            </div>
          </>
        )}
      </div>

      <div className={styles.rowActions}>
        <button
          aria-label={`${task.content} 수정`}
          className={styles.iconButton}
          disabled={task.completed || isEditing}
          onClick={onStartEdit}
          type="button"
        >
          <PlanningIcon type="edit" />
        </button>
        <button
          aria-label={deleteLabel}
          className={styles.iconButton}
          disabled={task.completed}
          onClick={onDelete}
          type="button"
        >
          <PlanningIcon type="delete" />
        </button>
      </div>
    </li>
  );
}

export function PlanningPage() {
  const { accessToken, logout } = useAuth();
  const token = accessToken ?? "";
  const queryClient = useQueryClient();
  const [flowStep, setFlowStep] = useState<FlowStep>("mindSweep");
  const [mindSweepInput, setMindSweepInput] = useState("");
  const [taskContentOrder, setTaskContentOrder] = useState<string[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskContent, setEditingTaskContent] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(80);
  const [topPickMemo, setTopPickMemo] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [toastLeaving, setToastLeaving] = useState(false);

  const homeQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getHomeToday({ token }),
    queryKey: homeTodayKey,
  });

  const home = homeQuery.data;
  const dailyPlan = home?.todayDailyPlan ?? null;
  const dailyPlanId = dailyPlan?.dailyPlanId ?? "";
  const tasks = useMemo(() => dailyPlan?.tasks ?? [], [dailyPlan?.tasks]);
  const orderedTasks = useMemo(() => {
    const orderIndex = (content: string) => {
      const index = taskContentOrder.indexOf(content);

      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };

    return [...tasks].sort(
      (left, right) => orderIndex(left.content) - orderIndex(right.content),
    );
  }, [taskContentOrder, tasks]);
  const topPicks = home?.topPicks ?? [];
  const topPickLimit = getTopPickLimit(home?.behaviorProfile?.executionDifficulty);
  const selectedTask =
    orderedTasks.find((task) => task.taskId === selectedTaskId) ??
    orderedTasks[0] ??
    null;
  const selectedTaskTopPick = selectedTask
    ? getTopPickForTask(selectedTask, topPicks)
    : null;
  const selectedTaskIsTopPicked = selectedTask
    ? isTaskTopPicked(selectedTask, topPicks)
    : false;
  const topPickLimitReached =
    topPicks.length >= topPickLimit && !selectedTaskIsTopPicked;

  useEffect(() => {
    setTaskContentOrder((currentOrder) => {
      const nextOrder = [...currentOrder];

      tasks.forEach((task) => {
        if (!nextOrder.includes(task.content)) {
          nextOrder.push(task.content);
        }
      });

      return nextOrder.length === currentOrder.length ? currentOrder : nextOrder;
    });
  }, [tasks]);

  useEffect(() => {
    if (
      selectedTaskId &&
      orderedTasks.some((task) => task.taskId === selectedTaskId)
    ) {
      return;
    }

    setSelectedTaskId(
      orderedTasks.find((task) => !task.completed)?.taskId ??
        orderedTasks[0]?.taskId ??
        "",
    );
  }, [orderedTasks, selectedTaskId]);

  useEffect(() => {
    if (!selectedTask) {
      setEstimatedMinutes(80);
      setTopPickMemo("");
      return;
    }

    setEstimatedMinutes(
      selectedTaskTopPick?.estimatedMinutes ??
        selectedTask.topPickDetail?.estimatedMinutes ??
        80,
    );
    setTopPickMemo(selectedTaskTopPick?.memo ?? selectedTask.topPickDetail?.memo ?? "");
  }, [selectedTask, selectedTaskTopPick]);

  useEffect(() => {
    if (!actionError && !actionNotice) {
      return undefined;
    }

    setToastLeaving(false);

    const fadeTimer = window.setTimeout(() => {
      setToastLeaving(true);
    }, toastVisibleMs);
    const clearTimer = window.setTimeout(() => {
      setActionError(null);
      setActionNotice(null);
      setToastLeaving(false);
    }, toastVisibleMs + toastFadeMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [actionError, actionNotice]);

  async function refreshHome() {
    await queryClient.invalidateQueries({ queryKey: homeTodayKey });
  }

  function handleMutationError(error: unknown) {
    setToastLeaving(false);
    setActionNotice(null);
    setActionError(getErrorMessage(error));
  }

  function handleMutationNotice(message: string) {
    setToastLeaving(false);
    setActionError(null);
    setActionNotice(message);
  }

  const createMindSweepMutation = useMutation<
    void,
    unknown,
    string,
    CreateMindSweepContext
  >({
    mutationFn: (content: string) => createMindSweep({ content, dailyPlanId, token }),
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: homeTodayKey });

      const previousHome = queryClient.getQueryData<HomeToday>(homeTodayKey);
      const optimisticTask: DailyPlanTask = {
        completed: false,
        content,
        taskId: `optimistic-${Date.now()}`,
        taskType: "GENERAL",
        topPicked: false,
      };

      if (previousHome?.todayDailyPlan) {
        queryClient.setQueryData<HomeToday>(homeTodayKey, {
          ...previousHome,
          todayDailyPlan: {
            ...previousHome.todayDailyPlan,
            tasks: [...previousHome.todayDailyPlan.tasks, optimisticTask],
          },
        });
      }

      setTaskContentOrder((currentOrder) =>
        currentOrder.includes(content) ? currentOrder : [...currentOrder, content],
      );
      setMindSweepInput("");

      return { previousHome };
    },
    onError: (error, _content, context) => {
      if (context?.previousHome) {
        queryClient.setQueryData(homeTodayKey, context.previousHome);
      }

      handleMutationError(error);
    },
    onSuccess: async () => {
      handleMutationNotice("MindSweep에 할 일을 추가했습니다.");
      await refreshHome();
    },
  });

  const updateMindSweepMutation = useMutation({
    mutationFn: ({ content, taskId }: { content: string; taskId: string }) =>
      updateMindSweep({ content, dailyPlanId, taskId, token }),
    onError: handleMutationError,
    onSuccess: async () => {
      setEditingTaskId(null);
      setEditingTaskContent("");
      handleMutationNotice("MindSweep 할 일을 수정했습니다.");
      await refreshHome();
    },
  });

  const deleteMindSweepMutation = useMutation({
    mutationFn: (taskId: string) => deleteMindSweep({ dailyPlanId, taskId, token }),
    onError: handleMutationError,
    onSuccess: async () => {
      handleMutationNotice("MindSweep 할 일을 삭제했습니다.");
      await refreshHome();
    },
  });

  const toggleMindSweepMutation = useMutation({
    mutationFn: (task: DailyPlanTask) =>
      task.completed
        ? uncompleteMindSweep({ dailyPlanId, taskId: task.taskId, token })
        : completeMindSweep({ dailyPlanId, taskId: task.taskId, token }),
    onError: handleMutationError,
    onSuccess: async () => {
      handleMutationNotice("MindSweep 완료 상태를 바꿨습니다.");
      await refreshHome();
    },
  });

  const selectTopPickMutation = useMutation({
    mutationFn: ({ memo, taskId }: { memo: string; taskId: string }) =>
      selectTopPick({
        dailyPlanId,
        estimatedMinutes,
        memo,
        taskId,
        token,
      }),
    onError: handleMutationError,
    onSuccess: async () => {
      handleMutationNotice("오늘의 TopPick을 선택했습니다.");
      await refreshHome();
    },
  });

  const unselectTopPickMutation = useMutation({
    mutationFn: (taskId: string) => unselectTopPick({ dailyPlanId, taskId, token }),
    onError: handleMutationError,
    onSuccess: async () => {
      handleMutationNotice("TopPick 선택을 해제했습니다.");
      await refreshHome();
    },
  });

  if (homeQuery.isLoading) {
    return (
      <section className={styles.centerState} aria-live="polite">
        <img src={characterMindSweep} alt="" aria-hidden="true" />
        <p>오늘의 계획을 불러오는 중입니다.</p>
      </section>
    );
  }

  if (homeQuery.isError) {
    return (
      <section className={styles.centerState} aria-live="assertive">
        <img src={characterDefault} alt="" aria-hidden="true" />
        <h1>계획을 불러오지 못했습니다.</h1>
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

  if (home.behaviorProfile === null) {
    return <Navigate to="/onboarding" replace />;
  }

  function handleCreateMindSweep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = mindSweepInput.trim();

    if (!content || !dailyPlanId) {
      return;
    }

    setTaskContentOrder((currentOrder) =>
      currentOrder.includes(content) ? currentOrder : [...currentOrder, content],
    );
    createMindSweepMutation.mutate(content);
  }

  function startEditingTask(task: DailyPlanTask) {
    setEditingTaskId(task.taskId);
    setEditingTaskContent(task.content);
  }

  function handleUpdateMindSweep(
    event: FormEvent<HTMLFormElement>,
    taskId: string,
  ) {
    event.preventDefault();
    const content = editingTaskContent.trim();

    if (!content || !dailyPlanId) {
      return;
    }

    updateMindSweepMutation.mutate({ content, taskId });
  }

  function handleSubmitTopPick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTask || !dailyPlanId) {
      return;
    }

    if (selectedTaskIsTopPicked) {
      unselectTopPickMutation.mutate(selectedTask.taskId);
      return;
    }

    if (topPickLimitReached || selectedTask.completed) {
      return;
    }

    if (!topPickMemo.trim()) {
      return;
    }

    selectTopPickMutation.mutate({
      memo: topPickMemo.trim(),
      taskId: selectedTask.taskId,
    });
  }

  const completedTaskCount = orderedTasks.filter((task) => task.completed).length;
  const selectedEstimatedText = selectedTask
    ? getTaskEstimatedMinutes(selectedTask, topPicks)
    : null;
  const currentTopPickCount = topPicks.length;
  const topPickLimitText = formatTopPickLimit(topPickLimit);
  const topPickHelpText =
    topPickLimit === 1
      ? "TopPick은 오늘 반드시 지킬 한 가지 핵심 실행입니다."
      : `TopPick은 오늘 반드시 지킬 핵심 실행을 최대 ${topPickLimit}개까지 고르는 방식입니다.`;
  const topPickIntroText =
    topPickLimit === 1
      ? "너무 많은 일은 시작을 방해해요. 오늘, 반드시 지킬 단 하나만 고르세요."
      : `온보딩 응답에 맞춰 오늘 반드시 지킬 실행을 최대 ${topPickLimit}개까지 고르세요.`;
  const topPickListNote =
    topPickLimit === 1
      ? "TopPick은 하루에 하나만 선택할 수 있어요."
      : `TopPick은 하루에 최대 ${topPickLimit}개까지 선택할 수 있어요.`;
  const topPickLimitNote =
    topPickLimit === 1
      ? "오늘 선택 가능한 TopPick을 이미 골랐어요. 먼저 기존 선택을 해제해 주세요."
      : `오늘 선택 가능한 TopPick ${topPickLimit}개를 모두 골랐어요. 먼저 기존 선택을 해제해 주세요.`;
  const nextExamLabel = getNextExamLabel(home);
  const friendAccountabilityText = getFriendAccountabilityText(
    home.friendAccountability,
  );

  return (
    <section className={styles.page} aria-labelledby="planning-title">
      <AppSidebar
        friendText={friendAccountabilityText}
        onLogout={logout}
        profileSubtitle={nextExamLabel}
      />

      <div className={styles.contentShell}>
        {actionError ? (
          <p
            className={`${styles.error} ${toastLeaving ? styles.toastLeaving : ""}`}
            role="alert"
          >
            {actionError}
          </p>
        ) : null}
        {actionNotice ? (
          <p
            className={`${styles.success} ${
              toastLeaving ? styles.toastLeaving : ""
            }`}
            role="status"
          >
            {actionNotice}
          </p>
        ) : null}

        {flowStep === "mindSweep" ? (
          <main className={styles.mindStage} aria-labelledby="planning-title">
            <header className={styles.mindHeader}>
              <div>
                <p className={styles.kicker}>Daily Planning</p>
                <h1 id="planning-title">MindSweep</h1>
                <span aria-hidden="true" className={styles.titleUnderline} />
              </div>

              <div className={styles.dateControls} aria-label="오늘 날짜">
                <span className={styles.todayPill}>
                  <PlanningIcon type="calendar" />
                  오늘
                </span>
                <time dateTime={home.targetDate}>
                  {formatDisplayDate(home.targetDate)}
                </time>
                <NavLink to="/settings" aria-label="설정">
                  <PlanningIcon type="settings" />
                </NavLink>
              </div>
            </header>

            <section className={styles.mindIntro} aria-label="MindSweep 안내">
              <h2>
                지금 내 머릿속에 떠오르는 모든 할 일을
                <br />
                <strong>자유롭게</strong> 적어보세요.
              </h2>
              <aside className={styles.helperNote}>
                <strong>완벽하게 정리하지 않아도 괜찮아요.</strong>
                <span>일단 꺼내는 게 가장 중요해요.</span>
              </aside>
            </section>

            <section className={styles.mindBoard} aria-labelledby="mind-list-title">
              <div className={styles.mindBoardHeader}>
                <h2 id="mind-list-title">오늘 머릿속에서 꺼낸 일</h2>
                <span>
                  {completedTaskCount}/{orderedTasks.length}
                </span>
              </div>

              {orderedTasks.length === 0 ? (
                <div className={styles.emptyState}>
                  <img src={characterMindSweep} alt="" aria-hidden="true" />
                  <strong>아직 적어둔 할 일이 없어요.</strong>
                  <p>아래 입력창에 가장 먼저 떠오르는 일을 적어보세요.</p>
                </div>
              ) : (
                <ul className={styles.taskList}>
                  {orderedTasks.map((task) => (
                    <EditableTaskRow
                      completedLabel="완료"
                      deleteLabel={`${task.content} 삭제`}
                      editInputLabel="MindSweep 할 일 수정"
                      editingValue={editingTaskContent}
                      isEditing={editingTaskId === task.taskId}
                      isTopPicked={isTaskTopPicked(task, topPicks)}
                      key={task.taskId}
                      onCancelEdit={() => setEditingTaskId(null)}
                      onDelete={() => deleteMindSweepMutation.mutate(task.taskId)}
                      onEditingValueChange={setEditingTaskContent}
                      onSaveEdit={(event) =>
                        handleUpdateMindSweep(event, task.taskId)
                      }
                      onStartEdit={() => startEditingTask(task)}
                      onToggle={() => toggleMindSweepMutation.mutate(task)}
                      task={task}
                      toggleLabel={
                        task.completed
                          ? `${task.content} 완료 취소`
                          : `${task.content} 완료`
                      }
                    />
                  ))}
                </ul>
              )}
            </section>

            <form className={styles.addTaskDock} onSubmit={handleCreateMindSweep}>
              <label className={styles.visuallyHidden} htmlFor="mind-sweep-input">
                MindSweep 할 일 입력
              </label>
              <span aria-hidden="true">
                <PlanningIcon type="plus" />
              </span>
              <input
                id="mind-sweep-input"
                maxLength={255}
                onChange={(event) => setMindSweepInput(event.target.value)}
                placeholder="할 일을 빠르게 입력하세요..."
                value={mindSweepInput}
              />
              <button
                aria-label="MindSweep 할 일 추가"
                disabled={!mindSweepInput.trim() || createMindSweepMutation.isPending}
                type="submit"
              >
                <PlanningIcon type="send" />
              </button>
            </form>

            <div className={styles.flowFooter}>
              <p>
                MindSweep를 마쳤다면, 오늘 반드시 지킬 한 가지를 골라요.
              </p>
              <button
                disabled={orderedTasks.length === 0}
                onClick={() => setFlowStep("topPick")}
                type="button"
              >
                TopPick 선정하기
              </button>
            </div>
          </main>
        ) : (
          <main className={styles.topPickStage} aria-labelledby="top-pick-title">
            <section className={styles.topPickCard} aria-labelledby="top-pick-title">
              <header className={styles.topPickHero}>
                <button
                  aria-label="MindSweep로 돌아가기"
                  className={styles.backButton}
                  onClick={() => setFlowStep("mindSweep")}
                  type="button"
                >
                  <PlanningIcon type="back" />
                </button>
                <button
                  className={styles.helpButton}
                  onClick={() =>
                    handleMutationNotice(topPickHelpText)
                  }
                  type="button"
                >
                  TopPick이란?
                </button>
                <p className={styles.kicker}>Daily Planning</p>
                <h1 id="top-pick-title">
                  오늘의 TopPick <strong>{topPickLimitText}</strong>를 선택해 주세요
                </h1>
                <p>{topPickIntroText}</p>
              </header>

              <form className={styles.topPickForm} onSubmit={handleSubmitTopPick}>
                <div className={styles.topPickColumns}>
                  <div className={styles.pickListColumn}>
                    <div className={styles.columnHeader}>
                      <strong>MindSweep에서 가져온 할 일</strong>
                      <span>{orderedTasks.length}개</span>
                    </div>
                    <div className={styles.pickList} role="listbox">
                      {orderedTasks.length === 0 ? (
                        <p className={styles.emptyText}>
                          먼저 MindSweep에 할 일을 적어주세요.
                        </p>
                      ) : (
                        orderedTasks.map((task) => {
                          const isSelected = selectedTask?.taskId === task.taskId;
                          const isTopPicked = isTaskTopPicked(task, topPicks);
                          const taskEstimatedMinutes = getTaskEstimatedMinutes(
                            task,
                            topPicks,
                          );

                          return (
                            <button
                              aria-selected={isSelected}
                              className={[
                                styles.pickItem,
                                isSelected ? styles.selectedPickItem : "",
                                isTopPicked ? styles.topPickedItem : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              disabled={task.completed}
                              key={task.taskId}
                              onClick={() => setSelectedTaskId(task.taskId)}
                              role="option"
                              type="button"
                            >
                              <span className={styles.pickCheck} aria-hidden="true">
                                {isSelected ? <PlanningIcon type="check" /> : null}
                              </span>
                              <strong>{task.content}</strong>
                              <small>
                                {taskEstimatedMinutes
                                  ? `${taskEstimatedMinutes}분`
                                  : "예상 시간 미정"}
                              </small>
                              <span className={styles.bookmarkIcon} aria-hidden="true">
                                <PlanningIcon type="bookmark" />
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                    <p className={styles.listNote}>
                      {topPickListNote}
                    </p>
                  </div>

                  <div className={styles.pickDetail}>
                    <div className={styles.pickDetailHeader}>
                      <span>선택된 TopPick</span>
                      <strong>
                        {currentTopPickCount}/{topPickLimit}
                      </strong>
                    </div>

                    <div className={styles.selectedTaskPreview}>
                      <span className={styles.starBadge} aria-hidden="true">
                        <PlanningIcon type="star" />
                      </span>
                      <div>
                        <h2>{selectedTask?.content ?? "선택된 할 일이 없어요"}</h2>
                        <span aria-hidden="true" className={styles.previewUnderline} />
                        {selectedEstimatedText ? (
                          <p>현재 예상 시간 {selectedEstimatedText}분</p>
                        ) : null}
                      </div>
                    </div>

                    <fieldset
                      className={styles.estimateGroup}
                      disabled={!selectedTask || selectedTaskIsTopPicked}
                    >
                      <legend>예상 시간</legend>
                      <div>
                        {estimatedMinuteOptions.map((minutes) => (
                          <label
                            className={
                              estimatedMinutes === minutes
                                ? styles.selectedMinute
                                : styles.minuteOption
                            }
                            key={minutes}
                          >
                            <input
                              checked={estimatedMinutes === minutes}
                              name="estimatedMinutes"
                              onChange={() => setEstimatedMinutes(minutes)}
                              type="radio"
                              value={minutes}
                            />
                            {minutes === 120 ? "120분+" : `${minutes}분`}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <label className={styles.memoField}>
                      메모 <span>(필수)</span>
                      <textarea
                        disabled={!selectedTask || selectedTaskIsTopPicked}
                        maxLength={150}
                        onChange={(event) => setTopPickMemo(event.target.value)}
                        placeholder="이 일을 해내기 위한 나만의 한 줄 다짐을 적어보세요."
                        required={!selectedTaskIsTopPicked}
                        value={topPickMemo}
                      />
                      <small>{topPickMemo.length}/150</small>
                    </label>

                    <div className={styles.tipBox}>
                      <strong>TIP</strong>
                      <p>구체적인 계획은 실행 확률을 높여줘요.</p>
                      <span>예: 3시 30분부터 책상에서 집중하기</span>
                    </div>
                  </div>
                </div>

                <button
                  className={
                    selectedTaskIsTopPicked
                      ? styles.secondaryCtaButton
                      : styles.ctaButton
                  }
                  disabled={
                    !selectedTask ||
                    selectedTask.completed ||
                    (topPickLimitReached && !selectedTaskIsTopPicked) ||
                    (!selectedTaskIsTopPicked && !topPickMemo.trim()) ||
                    selectTopPickMutation.isPending ||
                    unselectTopPickMutation.isPending
                  }
                  type="submit"
                >
                  {selectedTaskIsTopPicked
                    ? "이 항목의 TopPick 선택 해제하기"
                    : "이 항목을 오늘의 TopPick으로 선택하기"}
                </button>

                {topPickLimitReached ? (
                  <p className={styles.limitNote}>
                    {topPickLimitNote}
                  </p>
                ) : (
                  <p className={styles.secureNote}>선택한 TopPick은 나만 볼 수 있어요.</p>
                )}
              </form>
            </section>
          </main>
        )}
      </div>
    </section>
  );
}
