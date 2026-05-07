import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";

import type {
  DailyPlanTask,
  ExamSchedule,
  ExamType,
  HomeToday,
  TimetableSlot,
} from "../core-loop/types";
import {
  assignTaskSlot,
  assignTopPickSlot,
  completeMorningTask,
  createDirectSlot,
  createExamSchedule,
  createFutureVision,
  createMorningTask,
  deleteExamSchedule,
  deleteMorningTask,
  deleteSlot,
  getExamSchedules,
  rescheduleSlot,
  uncompleteMorningTask,
  updateExamSchedule,
  updateMorningTask,
  updateWeeklyFutureVision,
  updateYearlyFutureVision,
  type ExamScheduleRequest,
  type FutureVisionForm,
} from "./api";
import styles from "./PlanningSupportPanel.module.css";

const examSchedulesKey = ["exam-schedules"] as const;

const examTypeOptions: Array<{ label: string; value: ExamType }> = [
  { label: "내신", value: "NAESIN" },
  { label: "모평", value: "MOPYUNG" },
  { label: "학평", value: "HAKPYUNG" },
  { label: "수능", value: "SUNUNG" },
  { label: "기타", value: "OTHER" },
];

type PlanningSupportPanelProps = {
  home: HomeToday;
  token: string;
  onError: (error: unknown) => void;
  onNotice: (message: string) => void;
  onUpdated: () => Promise<unknown>;
};

type SlotAssignment = {
  endTime: string;
  startTime: string;
  taskId: string;
};

type DirectSlotForm = {
  content: string;
  endTime: string;
  startTime: string;
};

function getMorningTasks(home: HomeToday) {
  return home.morningTasks.length > 0
    ? home.morningTasks
    : home.todayDailyPlan?.morningTasks ?? [];
}

function createEmptyExamForm(targetDate: string): ExamScheduleRequest {
  return {
    examDate: targetDate,
    examType: "OTHER",
    subject: "",
    title: "",
  };
}

function getSelectedFile(event: ChangeEvent<HTMLInputElement>) {
  return event.target.files?.[0] ?? null;
}

function formatExamDistance(daysUntil: number) {
  if (daysUntil === 0) {
    return "오늘";
  }

  return daysUntil > 0 ? `D-${daysUntil}` : `${Math.abs(daysUntil)}일 지남`;
}

function getExamTypeLabel(examType: ExamType) {
  return (
    examTypeOptions.find((option) => option.value === examType)?.label ?? "기타"
  );
}

function normalizeExamForm(form: ExamScheduleRequest): ExamScheduleRequest {
  return {
    examDate: form.examDate,
    examType: form.examType,
    subject: form.subject.trim(),
    title: form.title.trim(),
  };
}

function isExamFormReady(form: ExamScheduleRequest) {
  return Boolean(form.examDate && form.subject.trim() && form.title.trim());
}

export function PlanningSupportPanel({
  home,
  onError,
  onNotice,
  onUpdated,
  token,
}: PlanningSupportPanelProps) {
  const queryClient = useQueryClient();
  const dailyPlanId = home.todayDailyPlan?.dailyPlanId ?? home.timetable?.dailyPlanId ?? "";
  const futureVision = home.futureVision;
  const morningTasks = getMorningTasks(home);
  const topPicks = home.topPicks;
  const timetable = home.timetable;
  const timetableId = timetable?.timetableId ?? "";
  const slots = timetable?.slots ?? [];

  const [visionDescription, setVisionDescription] = useState("");
  const [weeklyVisionImage, setWeeklyVisionImage] = useState<File | null>(null);
  const [yearlyVisionImage, setYearlyVisionImage] = useState<File | null>(null);
  const [weeklyUpdateImage, setWeeklyUpdateImage] = useState<File | null>(null);
  const [yearlyUpdateImage, setYearlyUpdateImage] = useState<File | null>(null);
  const [yearlyUpdateDescription, setYearlyUpdateDescription] = useState(
    futureVision?.yearlyVisionDescription ?? "",
  );
  const [morningContent, setMorningContent] = useState("");
  const [editingMorningTaskId, setEditingMorningTaskId] = useState<string | null>(
    null,
  );
  const [editingMorningContent, setEditingMorningContent] = useState("");
  const [topPickSlot, setTopPickSlot] = useState<SlotAssignment>({
    endTime: "09:30",
    startTime: "09:00",
    taskId: "",
  });
  const [taskSlot, setTaskSlot] = useState<SlotAssignment>({
    endTime: "10:30",
    startTime: "10:00",
    taskId: "",
  });
  const [directSlot, setDirectSlot] = useState<DirectSlotForm>({
    content: "",
    endTime: "11:00",
    startTime: "10:30",
  });
  const [reschedulingSlotId, setReschedulingSlotId] = useState<string | null>(
    null,
  );
  const [rescheduleStartTime, setRescheduleStartTime] = useState("09:00");
  const [rescheduleEndTime, setRescheduleEndTime] = useState("09:30");
  const [examForm, setExamForm] = useState<ExamScheduleRequest>(
    createEmptyExamForm(home.targetDate),
  );
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editingExamForm, setEditingExamForm] = useState<ExamScheduleRequest>(
    createEmptyExamForm(home.targetDate),
  );

  useEffect(() => {
    setYearlyUpdateDescription(futureVision?.yearlyVisionDescription ?? "");
  }, [futureVision?.futureVisionId, futureVision?.yearlyVisionDescription]);

  const examSchedulesQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getExamSchedules({ token }),
    queryKey: examSchedulesKey,
  });

  async function refreshHome() {
    await onUpdated();
  }

  async function refreshHomeAndExams() {
    await Promise.all([
      onUpdated(),
      queryClient.invalidateQueries({ queryKey: examSchedulesKey }),
    ]);
  }

  const createFutureVisionMutation = useMutation({
    mutationFn: (values: FutureVisionForm) =>
      createFutureVision({ token, values }),
    onError,
    onSuccess: async () => {
      setVisionDescription("");
      setWeeklyVisionImage(null);
      setYearlyVisionImage(null);
      onNotice("Future Vision을 만들었습니다.");
      await refreshHome();
    },
  });

  const updateWeeklyVisionMutation = useMutation({
    mutationFn: (weeklyVisionImageValue: File) =>
      updateWeeklyFutureVision({
        token,
        weeklyVisionImage: weeklyVisionImageValue,
      }),
    onError,
    onSuccess: async () => {
      setWeeklyUpdateImage(null);
      onNotice("주간 Vision 이미지를 수정했습니다.");
      await refreshHome();
    },
  });

  const updateYearlyVisionMutation = useMutation({
    mutationFn: ({
      yearlyVisionDescription,
      yearlyVisionImage: yearlyVisionImageValue,
    }: {
      yearlyVisionDescription: string;
      yearlyVisionImage: File;
    }) =>
      updateYearlyFutureVision({
        token,
        yearlyVisionDescription,
        yearlyVisionImage: yearlyVisionImageValue,
      }),
    onError,
    onSuccess: async () => {
      setYearlyUpdateImage(null);
      onNotice("연간 Vision을 수정했습니다.");
      await refreshHome();
    },
  });

  const createMorningTaskMutation = useMutation({
    mutationFn: (content: string) =>
      createMorningTask({ content, targetDate: home.targetDate, token }),
    onError,
    onSuccess: async () => {
      setMorningContent("");
      onNotice("MorningTask를 추가했습니다.");
      await refreshHome();
    },
  });

  const updateMorningTaskMutation = useMutation({
    mutationFn: ({ content, taskId }: { content: string; taskId: string }) =>
      updateMorningTask({ content, dailyPlanId, taskId, token }),
    onError,
    onSuccess: async () => {
      setEditingMorningContent("");
      setEditingMorningTaskId(null);
      onNotice("MorningTask를 수정했습니다.");
      await refreshHome();
    },
  });

  const deleteMorningTaskMutation = useMutation({
    mutationFn: (taskId: string) =>
      deleteMorningTask({ dailyPlanId, taskId, token }),
    onError,
    onSuccess: async () => {
      onNotice("MorningTask를 삭제했습니다.");
      await refreshHome();
    },
  });

  const toggleMorningTaskMutation = useMutation({
    mutationFn: (task: DailyPlanTask) =>
      task.completed
        ? uncompleteMorningTask({ dailyPlanId, taskId: task.taskId, token })
        : completeMorningTask({ dailyPlanId, taskId: task.taskId, token }),
    onError,
    onSuccess: async () => {
      onNotice("MorningTask 완료 상태를 바꿨습니다.");
      await refreshHome();
    },
  });

  const assignTopPickSlotMutation = useMutation({
    mutationFn: ({ endTime, startTime, taskId }: SlotAssignment) =>
      assignTopPickSlot({ endTime, startTime, taskId, timetableId, token }),
    onError,
    onSuccess: async () => {
      onNotice("TopPick을 시간 블록에 배정했습니다.");
      await refreshHome();
    },
  });

  const assignTaskSlotMutation = useMutation({
    mutationFn: ({ endTime, startTime, taskId }: SlotAssignment) =>
      assignTaskSlot({ endTime, startTime, taskId, timetableId, token }),
    onError,
    onSuccess: async () => {
      onNotice("할 일을 시간 블록에 배정했습니다.");
      await refreshHome();
    },
  });

  const createDirectSlotMutation = useMutation({
    mutationFn: ({ content, endTime, startTime }: DirectSlotForm) =>
      createDirectSlot({
        content,
        dailyPlanId,
        endTime,
        startTime,
        timetableId,
        token,
      }),
    onError,
    onSuccess: async () => {
      setDirectSlot((current) => ({ ...current, content: "" }));
      onNotice("직접 시간 블록을 추가했습니다.");
      await refreshHome();
    },
  });

  const rescheduleSlotMutation = useMutation({
    mutationFn: ({
      endTime,
      slotId,
      startTime,
    }: {
      endTime: string;
      slotId: string;
      startTime: string;
    }) =>
      rescheduleSlot({ endTime, slotId, startTime, timetableId, token }),
    onError,
    onSuccess: async () => {
      setReschedulingSlotId(null);
      onNotice("시간 블록을 수정했습니다.");
      await refreshHome();
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (slotId: string) => deleteSlot({ slotId, timetableId, token }),
    onError,
    onSuccess: async () => {
      onNotice("시간 블록을 삭제했습니다.");
      await refreshHome();
    },
  });

  const createExamScheduleMutation = useMutation({
    mutationFn: (values: ExamScheduleRequest) =>
      createExamSchedule({ token, values }),
    onError,
    onSuccess: async () => {
      setExamForm(createEmptyExamForm(home.targetDate));
      onNotice("시험 일정을 추가했습니다.");
      await refreshHomeAndExams();
    },
  });

  const updateExamScheduleMutation = useMutation({
    mutationFn: ({
      examScheduleId,
      values,
    }: {
      examScheduleId: string;
      values: ExamScheduleRequest;
    }) => updateExamSchedule({ examScheduleId, token, values }),
    onError,
    onSuccess: async () => {
      setEditingExamId(null);
      onNotice("시험 일정을 수정했습니다.");
      await refreshHomeAndExams();
    },
  });

  const deleteExamScheduleMutation = useMutation({
    mutationFn: (examScheduleId: string) =>
      deleteExamSchedule({ examScheduleId, token }),
    onError,
    onSuccess: async () => {
      onNotice("시험 일정을 삭제했습니다.");
      await refreshHomeAndExams();
    },
  });

  function handleCreateFutureVision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = visionDescription.trim();

    if (!weeklyVisionImage || !yearlyVisionImage || !description) {
      return;
    }

    createFutureVisionMutation.mutate({
      weeklyVisionImage,
      yearlyVisionDescription: description,
      yearlyVisionImage,
    });
  }

  function handleUpdateWeeklyVision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!weeklyUpdateImage) {
      return;
    }

    updateWeeklyVisionMutation.mutate(weeklyUpdateImage);
  }

  function handleUpdateYearlyVision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = yearlyUpdateDescription.trim();

    if (!yearlyUpdateImage || !description) {
      return;
    }

    updateYearlyVisionMutation.mutate({
      yearlyVisionDescription: description,
      yearlyVisionImage: yearlyUpdateImage,
    });
  }

  function handleCreateMorningTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = morningContent.trim();

    if (!content) {
      return;
    }

    createMorningTaskMutation.mutate(content);
  }

  function startEditingMorningTask(task: DailyPlanTask) {
    setEditingMorningTaskId(task.taskId);
    setEditingMorningContent(task.content);
  }

  function handleUpdateMorningTask(
    event: FormEvent<HTMLFormElement>,
    taskId: string,
  ) {
    event.preventDefault();
    const content = editingMorningContent.trim();

    if (!content || !dailyPlanId) {
      return;
    }

    updateMorningTaskMutation.mutate({ content, taskId });
  }

  function handleToggleMorningTask(task: DailyPlanTask) {
    if (!dailyPlanId) {
      return;
    }

    toggleMorningTaskMutation.mutate(task);
  }

  function handleDeleteMorningTask(taskId: string) {
    if (!dailyPlanId) {
      return;
    }

    deleteMorningTaskMutation.mutate(taskId);
  }

  function handleAssignTopPickSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const taskId = topPickSlot.taskId || topPicks[0]?.taskId;

    if (!taskId || !timetableId) {
      return;
    }

    assignTopPickSlotMutation.mutate({ ...topPickSlot, taskId });
  }

  function handleAssignTaskSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const taskId = taskSlot.taskId || home.todayDailyPlan?.tasks[0]?.taskId;

    if (!taskId || !timetableId) {
      return;
    }

    assignTaskSlotMutation.mutate({ ...taskSlot, taskId });
  }

  function handleCreateDirectSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = directSlot.content.trim();

    if (!content || !dailyPlanId || !timetableId) {
      return;
    }

    createDirectSlotMutation.mutate({ ...directSlot, content });
  }

  function startReschedulingSlot(slot: TimetableSlot) {
    setReschedulingSlotId(slot.slotId);
    setRescheduleStartTime(slot.startTime);
    setRescheduleEndTime(slot.endTime);
  }

  function handleRescheduleSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reschedulingSlotId || !timetableId) {
      return;
    }

    rescheduleSlotMutation.mutate({
      endTime: rescheduleEndTime,
      slotId: reschedulingSlotId,
      startTime: rescheduleStartTime,
    });
  }

  function handleDeleteSlot(slotId: string) {
    if (!timetableId) {
      return;
    }

    deleteSlotMutation.mutate(slotId);
  }

  function handleCreateExamSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = normalizeExamForm(examForm);

    if (!isExamFormReady(values)) {
      return;
    }

    createExamScheduleMutation.mutate(values);
  }

  function startEditingExam(exam: ExamSchedule) {
    setEditingExamId(exam.examScheduleId);
    setEditingExamForm({
      examDate: exam.examDate,
      examType: exam.examType,
      subject: exam.subject,
      title: exam.title,
    });
  }

  function handleUpdateExamSchedule(
    event: FormEvent<HTMLFormElement>,
    examScheduleId: string,
  ) {
    event.preventDefault();
    const values = normalizeExamForm(editingExamForm);

    if (!isExamFormReady(values)) {
      return;
    }

    updateExamScheduleMutation.mutate({ examScheduleId, values });
  }

  function updateExamField(
    field: keyof ExamScheduleRequest,
    value: ExamScheduleRequest[keyof ExamScheduleRequest],
  ) {
    setExamForm((current) => ({ ...current, [field]: value }));
  }

  function updateEditingExamField(
    field: keyof ExamScheduleRequest,
    value: ExamScheduleRequest[keyof ExamScheduleRequest],
  ) {
    setEditingExamForm((current) => ({ ...current, [field]: value }));
  }

  const examSchedules = examSchedulesQuery.data ?? [];
  const generalTasks = home.todayDailyPlan?.tasks ?? [];

  return (
    <section className={styles.support} aria-labelledby="planning-support-title">
      <header className={styles.sectionHeader}>
        <div>
          <p className={styles.kicker}>Planning Support</p>
          <h2 id="planning-support-title">계획을 시간표까지 이어가기</h2>
        </div>
        <div className={styles.modeCluster} aria-label="계획 요약">
          <span>{home.seasonMode}</span>
          {home.nextExamSchedule ? (
            <strong>
              {formatExamDistance(home.nextExamSchedule.daysUntil)} ·{" "}
              {home.nextExamSchedule.title}
            </strong>
          ) : (
            <strong>다음 시험 없음</strong>
          )}
        </div>
      </header>

      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="future-vision-title">
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.kicker}>Future Vision</p>
              <h3 id="future-vision-title">이번 주와 올해의 방향</h3>
            </div>
          </div>

          {futureVision ? (
            <div className={styles.visionLayout}>
              <div className={styles.visionPreview}>
                {futureVision.weeklyVisionImageUrl ? (
                  <img
                    alt="주간 Future Vision"
                    src={futureVision.weeklyVisionImageUrl}
                  />
                ) : (
                  <p className={styles.emptyText}>주간 이미지가 없습니다.</p>
                )}
                {futureVision.yearlyVisionImageUrl ? (
                  <img
                    alt="연간 Future Vision"
                    src={futureVision.yearlyVisionImageUrl}
                  />
                ) : (
                  <p className={styles.emptyText}>연간 이미지가 없습니다.</p>
                )}
              </div>
              <p className={styles.body}>{futureVision.yearlyVisionDescription}</p>

              <form className={styles.stackForm} onSubmit={handleUpdateWeeklyVision}>
                <label>
                  주간 이미지 수정
                  <input
                    accept="image/*"
                    onChange={(event) => setWeeklyUpdateImage(getSelectedFile(event))}
                    type="file"
                  />
                </label>
                <button
                  className={styles.secondaryButton}
                  disabled={!weeklyUpdateImage || updateWeeklyVisionMutation.isPending}
                  type="submit"
                >
                  주간 저장
                </button>
              </form>

              <form className={styles.stackForm} onSubmit={handleUpdateYearlyVision}>
                <label>
                  연간 이미지 수정
                  <input
                    accept="image/*"
                    onChange={(event) => setYearlyUpdateImage(getSelectedFile(event))}
                    type="file"
                  />
                </label>
                <label>
                  연간 설명
                  <textarea
                    maxLength={100}
                    onChange={(event) =>
                      setYearlyUpdateDescription(event.target.value)
                    }
                    value={yearlyUpdateDescription}
                  />
                </label>
                <button
                  className={styles.secondaryButton}
                  disabled={
                    !yearlyUpdateImage ||
                    !yearlyUpdateDescription.trim() ||
                    updateYearlyVisionMutation.isPending
                  }
                  type="submit"
                >
                  연간 저장
                </button>
              </form>
            </div>
          ) : (
            <form className={styles.stackForm} onSubmit={handleCreateFutureVision}>
              <label>
                주간 이미지
                <input
                  accept="image/*"
                  onChange={(event) => setWeeklyVisionImage(getSelectedFile(event))}
                  type="file"
                />
              </label>
              <label>
                연간 이미지
                <input
                  accept="image/*"
                  onChange={(event) => setYearlyVisionImage(getSelectedFile(event))}
                  type="file"
                />
              </label>
              <label>
                연간 설명
                <textarea
                  maxLength={100}
                  onChange={(event) => setVisionDescription(event.target.value)}
                  placeholder="올해 지키고 싶은 방향을 100자 이내로 적어보세요"
                  value={visionDescription}
                />
              </label>
              <button
                className={styles.primaryButton}
                disabled={
                  !weeklyVisionImage ||
                  !yearlyVisionImage ||
                  !visionDescription.trim() ||
                  createFutureVisionMutation.isPending
                }
                type="submit"
              >
                Vision 만들기
              </button>
            </form>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="morning-task-title">
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.kicker}>MorningTask</p>
              <h3 id="morning-task-title">아침에 먼저 정리할 일</h3>
            </div>
            <span className={styles.counter}>{morningTasks.length}</span>
          </div>

          <form className={styles.inlineForm} onSubmit={handleCreateMorningTask}>
            <label className={styles.visuallyHidden} htmlFor="new-morning-task">
              새 MorningTask
            </label>
            <input
              id="new-morning-task"
              maxLength={255}
              onChange={(event) => setMorningContent(event.target.value)}
              placeholder="아침에 먼저 처리할 일을 적어보세요"
              value={morningContent}
            />
            <button
              className={styles.primaryButton}
              disabled={!morningContent.trim() || createMorningTaskMutation.isPending}
              type="submit"
            >
              추가
            </button>
          </form>

          {morningTasks.length === 0 ? (
            <p className={styles.emptyText}>아직 MorningTask가 없습니다.</p>
          ) : (
            <ul className={styles.list}>
              {morningTasks.map((task) => (
                <li className={styles.listItem} key={task.taskId}>
                  <div className={styles.itemRow}>
                    <label className={styles.checkboxLabel}>
                      <input
                        checked={task.completed}
                        onChange={() => handleToggleMorningTask(task)}
                        type="checkbox"
                      />
                      <span>{task.content}</span>
                    </label>
                    <div className={styles.actions}>
                      <button
                        className={styles.secondaryButton}
                        disabled={task.completed}
                        onClick={() => startEditingMorningTask(task)}
                        type="button"
                      >
                        수정
                      </button>
                      <button
                        className={styles.dangerButton}
                        onClick={() => handleDeleteMorningTask(task.taskId)}
                        type="button"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {editingMorningTaskId === task.taskId ? (
                    <form
                      className={styles.inlineForm}
                      onSubmit={(event) =>
                        handleUpdateMorningTask(event, task.taskId)
                      }
                    >
                      <label
                        className={styles.visuallyHidden}
                        htmlFor={`edit-morning-${task.taskId}`}
                      >
                        MorningTask 수정
                      </label>
                      <input
                        id={`edit-morning-${task.taskId}`}
                        maxLength={255}
                        onChange={(event) =>
                          setEditingMorningContent(event.target.value)
                        }
                        value={editingMorningContent}
                      />
                      <button className={styles.primaryButton} type="submit">
                        저장
                      </button>
                      <button
                        className={styles.secondaryButton}
                        onClick={() => setEditingMorningTaskId(null)}
                        type="button"
                      >
                        취소
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panelWide} aria-labelledby="timetable-title">
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.kicker}>Timetable</p>
              <h3 id="timetable-title">오늘 시간 블록</h3>
            </div>
            <span className={styles.counter}>{slots.length}</span>
          </div>

          {timetable ? (
            <>
              <div className={styles.assignmentGrid}>
                <form
                  className={styles.stackForm}
                  onSubmit={handleAssignTopPickSlot}
                >
                  <label>
                    TopPick
                    <select
                      disabled={topPicks.length === 0}
                      onChange={(event) =>
                        setTopPickSlot((current) => ({
                          ...current,
                          taskId: event.target.value,
                        }))
                      }
                      value={topPickSlot.taskId || (topPicks[0]?.taskId ?? "")}
                    >
                      {topPicks.length === 0 ? (
                        <option value="">TopPick 없음</option>
                      ) : (
                        topPicks.map((topPick) => (
                          <option key={topPick.taskId} value={topPick.taskId}>
                            {topPick.content}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <div className={styles.timePair}>
                    <label>
                      시작
                      <input
                        onChange={(event) =>
                          setTopPickSlot((current) => ({
                            ...current,
                            startTime: event.target.value,
                          }))
                        }
                        type="time"
                        value={topPickSlot.startTime}
                      />
                    </label>
                    <label>
                      종료
                      <input
                        onChange={(event) =>
                          setTopPickSlot((current) => ({
                            ...current,
                            endTime: event.target.value,
                          }))
                        }
                        type="time"
                        value={topPickSlot.endTime}
                      />
                    </label>
                  </div>
                  <button
                    className={styles.primaryButton}
                    disabled={topPicks.length === 0 || assignTopPickSlotMutation.isPending}
                    type="submit"
                  >
                    TopPick 배정
                  </button>
                </form>

                <form className={styles.stackForm} onSubmit={handleAssignTaskSlot}>
                  <label>
                    일반 할 일
                    <select
                      disabled={generalTasks.length === 0}
                      onChange={(event) =>
                        setTaskSlot((current) => ({
                          ...current,
                          taskId: event.target.value,
                        }))
                      }
                      value={taskSlot.taskId || (generalTasks[0]?.taskId ?? "")}
                    >
                      {generalTasks.length === 0 ? (
                        <option value="">할 일 없음</option>
                      ) : (
                        generalTasks.map((task) => (
                          <option key={task.taskId} value={task.taskId}>
                            {task.content}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <div className={styles.timePair}>
                    <label>
                      시작
                      <input
                        onChange={(event) =>
                          setTaskSlot((current) => ({
                            ...current,
                            startTime: event.target.value,
                          }))
                        }
                        type="time"
                        value={taskSlot.startTime}
                      />
                    </label>
                    <label>
                      종료
                      <input
                        onChange={(event) =>
                          setTaskSlot((current) => ({
                            ...current,
                            endTime: event.target.value,
                          }))
                        }
                        type="time"
                        value={taskSlot.endTime}
                      />
                    </label>
                  </div>
                  <button
                    className={styles.secondaryButton}
                    disabled={generalTasks.length === 0 || assignTaskSlotMutation.isPending}
                    type="submit"
                  >
                    할 일 배정
                  </button>
                </form>

                <form className={styles.stackForm} onSubmit={handleCreateDirectSlot}>
                  <label>
                    직접 블록
                    <input
                      maxLength={255}
                      onChange={(event) =>
                        setDirectSlot((current) => ({
                          ...current,
                          content: event.target.value,
                        }))
                      }
                      placeholder="예: 영어 단어 정리"
                      value={directSlot.content}
                    />
                  </label>
                  <div className={styles.timePair}>
                    <label>
                      시작
                      <input
                        onChange={(event) =>
                          setDirectSlot((current) => ({
                            ...current,
                            startTime: event.target.value,
                          }))
                        }
                        type="time"
                        value={directSlot.startTime}
                      />
                    </label>
                    <label>
                      종료
                      <input
                        onChange={(event) =>
                          setDirectSlot((current) => ({
                            ...current,
                            endTime: event.target.value,
                          }))
                        }
                        type="time"
                        value={directSlot.endTime}
                      />
                    </label>
                  </div>
                  <button
                    className={styles.secondaryButton}
                    disabled={!directSlot.content.trim() || createDirectSlotMutation.isPending}
                    type="submit"
                  >
                    직접 추가
                  </button>
                </form>
              </div>

              {reschedulingSlotId ? (
                <form className={styles.rescheduleForm} onSubmit={handleRescheduleSlot}>
                  <div className={styles.timePair}>
                    <label>
                      새 시작
                      <input
                        onChange={(event) =>
                          setRescheduleStartTime(event.target.value)
                        }
                        type="time"
                        value={rescheduleStartTime}
                      />
                    </label>
                    <label>
                      새 종료
                      <input
                        onChange={(event) => setRescheduleEndTime(event.target.value)}
                        type="time"
                        value={rescheduleEndTime}
                      />
                    </label>
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.primaryButton} type="submit">
                      시간 저장
                    </button>
                    <button
                      className={styles.secondaryButton}
                      onClick={() => setReschedulingSlotId(null)}
                      type="button"
                    >
                      취소
                    </button>
                  </div>
                </form>
              ) : null}

              {slots.length === 0 ? (
                <p className={styles.emptyText}>아직 시간 블록이 없습니다.</p>
              ) : (
                <ul className={styles.slotList}>
                  {slots.map((slot) => (
                    <li className={styles.slotItem} key={slot.slotId}>
                      <div>
                        <span className={styles.slotTime}>
                          {slot.startTime} - {slot.endTime}
                        </span>
                        <strong>{slot.content}</strong>
                        {slot.topPick ? <em>TopPick</em> : null}
                      </div>
                      <div className={styles.actions}>
                        <button
                          className={styles.secondaryButton}
                          onClick={() => startReschedulingSlot(slot)}
                          type="button"
                        >
                          시간 수정
                        </button>
                        <button
                          className={styles.dangerButton}
                          onClick={() => handleDeleteSlot(slot.slotId)}
                          type="button"
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className={styles.emptyText}>
              오늘 DailyPlan 시간표가 아직 준비되지 않았습니다.
            </p>
          )}
        </section>

        <section className={styles.panelWide} aria-labelledby="exam-title">
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.kicker}>Exam Schedule</p>
              <h3 id="exam-title">시험 일정과 시즌 모드</h3>
            </div>
          </div>

          {home.nextExamSchedule ? (
            <div className={styles.nextExam}>
              <span>{formatExamDistance(home.nextExamSchedule.daysUntil)}</span>
              <strong>{home.nextExamSchedule.title}</strong>
              <p>
                {getExamTypeLabel(home.nextExamSchedule.examType)} ·{" "}
                {home.nextExamSchedule.subject} · {home.nextExamSchedule.examDate}
              </p>
            </div>
          ) : (
            <p className={styles.emptyText}>등록된 다음 시험이 없습니다.</p>
          )}

          <form className={styles.examForm} onSubmit={handleCreateExamSchedule}>
            <label>
              유형
              <select
                onChange={(event) =>
                  updateExamField("examType", event.target.value as ExamType)
                }
                value={examForm.examType}
              >
                {examTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              제목
              <input
                maxLength={100}
                onChange={(event) => updateExamField("title", event.target.value)}
                placeholder="예: 6월 모의고사"
                value={examForm.title}
              />
            </label>
            <label>
              과목
              <input
                maxLength={100}
                onChange={(event) => updateExamField("subject", event.target.value)}
                placeholder="예: 수학"
                value={examForm.subject}
              />
            </label>
            <label>
              날짜
              <input
                onChange={(event) => updateExamField("examDate", event.target.value)}
                type="date"
                value={examForm.examDate}
              />
            </label>
            <button
              className={styles.primaryButton}
              disabled={
                !isExamFormReady(examForm) || createExamScheduleMutation.isPending
              }
              type="submit"
            >
              시험 추가
            </button>
          </form>

          {examSchedulesQuery.isLoading ? (
            <p className={styles.emptyText}>시험 일정을 불러오는 중입니다.</p>
          ) : null}

          {examSchedules.length === 0 && !examSchedulesQuery.isLoading ? (
            <p className={styles.emptyText}>시험 일정 목록이 비어 있습니다.</p>
          ) : (
            <ul className={styles.list}>
              {examSchedules.map((exam) => (
                <li className={styles.listItem} key={exam.examScheduleId}>
                  {editingExamId === exam.examScheduleId ? (
                    <form
                      className={styles.examForm}
                      onSubmit={(event) =>
                        handleUpdateExamSchedule(event, exam.examScheduleId)
                      }
                    >
                      <label>
                        유형
                        <select
                          onChange={(event) =>
                            updateEditingExamField(
                              "examType",
                              event.target.value as ExamType,
                            )
                          }
                          value={editingExamForm.examType}
                        >
                          {examTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        제목
                        <input
                          maxLength={100}
                          onChange={(event) =>
                            updateEditingExamField("title", event.target.value)
                          }
                          value={editingExamForm.title}
                        />
                      </label>
                      <label>
                        과목
                        <input
                          maxLength={100}
                          onChange={(event) =>
                            updateEditingExamField("subject", event.target.value)
                          }
                          value={editingExamForm.subject}
                        />
                      </label>
                      <label>
                        날짜
                        <input
                          onChange={(event) =>
                            updateEditingExamField("examDate", event.target.value)
                          }
                          type="date"
                          value={editingExamForm.examDate}
                        />
                      </label>
                      <div className={styles.actions}>
                        <button className={styles.primaryButton} type="submit">
                          저장
                        </button>
                        <button
                          className={styles.secondaryButton}
                          onClick={() => setEditingExamId(null)}
                          type="button"
                        >
                          취소
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className={styles.itemRow}>
                      <div>
                        <span className={styles.slotTime}>
                          {formatExamDistance(exam.daysUntil)}
                        </span>
                        <strong>{exam.title}</strong>
                        <p className={styles.body}>
                          {getExamTypeLabel(exam.examType)} · {exam.subject} ·{" "}
                          {exam.examDate}
                        </p>
                      </div>
                      <div className={styles.actions}>
                        <button
                          className={styles.secondaryButton}
                          onClick={() => startEditingExam(exam)}
                          type="button"
                        >
                          수정
                        </button>
                        <button
                          className={styles.dangerButton}
                          onClick={() =>
                            deleteExamScheduleMutation.mutate(
                              exam.examScheduleId,
                            )
                          }
                          type="button"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
