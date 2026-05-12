import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";

import characterDefault from "../assets/auth/character-default.png";
import { recordAnalyticsEventSafely } from "../features/analytics/api";
import { useAuth } from "../features/auth/useAuth";
import { AppSidebar } from "../features/core-loop/AppSidebar";
import { getHomeToday } from "../features/core-loop/api";
import {
  formatExamDistance,
  getFriendAccountabilityText,
  getNextExamLabel,
} from "../features/core-loop/displayUtils";
import type { ExamSchedule, ExamType } from "../features/core-loop/types";
import {
  createExamSchedule,
  deleteExamSchedule,
  getExamSchedules,
  updateExamSchedule,
  type ExamScheduleRequest,
} from "../features/planning-support/api";
import { getErrorMessage } from "../shared/api/errors";
import { queryKeys } from "../shared/queryKeys";
import { PageHeader } from "../shared/ui/PageHeader";
import styles from "./ExamSchedulesPage.module.css";

type DialogState =
  | { mode: "create" }
  | { exam: ExamSchedule; mode: "edit" }
  | null;

const homeTodayKey = queryKeys.homeToday();
const examSchedulesKey = queryKeys.examSchedules();
const examTypeOptions: Array<{ label: string; value: ExamType }> = [
  { label: "내신", value: "NAESIN" },
  { label: "모의고사", value: "MOPYUNG" },
  { label: "학평", value: "HAKPYUNG" },
  { label: "수능", value: "SUNUNG" },
  { label: "기타", value: "OTHER" },
];

function formatExamDate(examDate: string) {
  const [year, month, day] = examDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const validDate =
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!validDate) {
    return examDate;
  }

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(
    2,
    "0",
  )} (${weekdays[date.getDay()]})`;
}

function getExamTypeLabel(examType: ExamType) {
  return (
    examTypeOptions.find((option) => option.value === examType)?.label ?? "기타"
  );
}

function getExamAccent(examType: ExamType) {
  if (examType === "SUNUNG") {
    return "red";
  }

  if (examType === "NAESIN") {
    return "orange";
  }

  if (examType === "MOPYUNG" || examType === "HAKPYUNG") {
    return "blue";
  }

  return "green";
}

function getProgress(daysUntil: number) {
  if (daysUntil <= 0) {
    return 100;
  }

  return Math.max(8, Math.round(100 - Math.min(daysUntil, 180) / 1.8));
}

function createEmptyForm(targetDate: string): ExamScheduleRequest {
  return {
    examDate: targetDate,
    examType: "OTHER",
    subject: "",
    title: "",
  };
}

function createFormFromExam(exam: ExamSchedule): ExamScheduleRequest {
  return {
    examDate: exam.examDate,
    examType: exam.examType,
    subject: exam.subject,
    title: exam.title,
  };
}

function normalizeForm(form: ExamScheduleRequest): ExamScheduleRequest {
  return {
    examDate: form.examDate,
    examType: form.examType,
    subject: form.subject.trim(),
    title: form.title.trim(),
  };
}

function isFormReady(form: ExamScheduleRequest) {
  return Boolean(form.examDate && form.subject.trim() && form.title.trim());
}

function getDaysToExam(targetDate: string | undefined, examDate: string) {
  if (!targetDate) {
    return undefined;
  }

  const start = Date.parse(`${targetDate}T00:00:00Z`);
  const end = Date.parse(`${examDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return undefined;
  }

  return Math.round((end - start) / 86_400_000);
}

function sortByDistance(left: ExamSchedule, right: ExamSchedule) {
  return left.daysUntil - right.daysUntil;
}

export function ExamSchedulesPage() {
  const { accessToken, logout } = useAuth();
  const token = accessToken ?? "";
  const queryClient = useQueryClient();
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExamSchedule | null>(null);
  const [showPastExams, setShowPastExams] = useState(false);
  const [form, setForm] = useState<ExamScheduleRequest>(
    createEmptyForm(new Date().toISOString().slice(0, 10)),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const homeQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getHomeToday({ token }),
    queryKey: homeTodayKey,
  });
  const examSchedulesQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getExamSchedules({ token }),
    queryKey: examSchedulesKey,
  });

  const home = homeQuery.data;
  const exams = examSchedulesQuery.data ?? [];

  async function refreshSchedules() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: examSchedulesKey }),
      queryClient.invalidateQueries({ queryKey: homeTodayKey }),
    ]);
  }

  const createExamMutation = useMutation({
    mutationFn: (values: ExamScheduleRequest) =>
      createExamSchedule({ token, values }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async (_data, values) => {
      void recordAnalyticsEventSafely({
        eventType: "EXAM_REGISTERED",
        properties: {
          days_to_exam: getDaysToExam(home?.targetDate, values.examDate),
          exam_type: values.examType,
          source: "exam_schedules_page",
        },
        token,
      });
      setActionError(null);
      setActionNotice("시험 일정을 추가했습니다.");
      setDialogState(null);
      await refreshSchedules();
    },
  });

  const updateExamMutation = useMutation({
    mutationFn: ({
      examScheduleId,
      values,
    }: {
      examScheduleId: string;
      values: ExamScheduleRequest;
    }) => updateExamSchedule({ examScheduleId, token, values }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("시험 일정을 수정했습니다.");
      setDialogState(null);
      await refreshSchedules();
    },
  });

  const deleteExamMutation = useMutation({
    mutationFn: (examScheduleId: string) =>
      deleteExamSchedule({ examScheduleId, token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async () => {
      setActionError(null);
      setActionNotice("시험 일정을 삭제했습니다.");
      setDeleteTarget(null);
      await refreshSchedules();
    },
  });

  if (homeQuery.isLoading) {
    return (
      <section className={styles.centerState} aria-live="polite">
        <img src={characterDefault} alt="" aria-hidden="true" />
        <p>시험 일정을 불러오는 중입니다.</p>
      </section>
    );
  }

  if (homeQuery.isError) {
    return (
      <section className={styles.centerState} aria-live="assertive">
        <img src={characterDefault} alt="" aria-hidden="true" />
        <h1>시험 일정을 불러오지 못했습니다.</h1>
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

  function openCreateDialog() {
    setForm(createEmptyForm(home?.targetDate ?? new Date().toISOString().slice(0, 10)));
    setDialogState({ mode: "create" });
  }

  function openEditDialog(exam: ExamSchedule) {
    setForm(createFormFromExam(exam));
    setDialogState({ exam, mode: "edit" });
  }

  function updateFormField<K extends keyof ExamScheduleRequest>(
    field: K,
    value: ExamScheduleRequest[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = normalizeForm(form);

    if (!isFormReady(values)) {
      setActionError("시험 제목, 과목, 날짜를 모두 입력해주세요.");
      return;
    }

    if (dialogState?.mode === "edit") {
      updateExamMutation.mutate({
        examScheduleId: dialogState.exam.examScheduleId,
        values,
      });
      return;
    }

    createExamMutation.mutate(values);
  }

  const upcomingExams = exams
    .filter((exam) => exam.daysUntil >= 0)
    .sort(sortByDistance);
  const pastExams = exams
    .filter((exam) => exam.daysUntil < 0)
    .sort((left, right) => right.daysUntil - left.daysUntil);
  const friendText = getFriendAccountabilityText(home.friendAccountability);
  const profileSubtitle = getNextExamLabel(home);
  const nextExam = home.nextExamSchedule ?? upcomingExams[0] ?? null;

  return (
    <section className={styles.page} aria-labelledby="exam-schedules-title">
      <AppSidebar
        friendText={friendText}
        onLogout={logout}
        profileSubtitle={profileSubtitle}
      />

      <div className={styles.contentShell}>
        <PageHeader
          className={styles.pageHeader}
          description="다가오는 시험을 확인하고 계획을 세워보세요."
          eyebrow="Exam Schedule"
          title="시험 일정"
          titleId="exam-schedules-title"
          actions={
            <button
              className={styles.primaryButton}
              onClick={openCreateDialog}
              type="button"
            >
              + 시험 추가
            </button>
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

        <div className={styles.seasonBar} aria-label="시즌 모드">
          <span>시즌 모드</span>
          <strong>{home.seasonMode}</strong>
          {nextExam ? <em>{formatExamDistance(nextExam.daysUntil)}</em> : null}
        </div>

        <main className={styles.examLayout}>
          <section className={styles.sectionHeader} aria-labelledby="upcoming-title">
            <div>
              <h2 id="upcoming-title">다가오는 시험</h2>
              <span>{upcomingExams.length}</span>
            </div>
          </section>

          {examSchedulesQuery.isLoading ? (
            <p className={styles.emptyText}>시험 일정 목록을 불러오는 중입니다.</p>
          ) : null}

          {upcomingExams.length === 0 && !examSchedulesQuery.isLoading ? (
            <div className={styles.emptyPanel}>
              <strong>등록된 다가오는 시험이 없습니다.</strong>
              <p>시험 날짜를 추가하면 홈과 시간표에서 목표까지의 거리를 볼 수 있어요.</p>
            </div>
          ) : (
            <ul className={styles.examList}>
              {upcomingExams.map((exam) => (
                <li
                  className={`${styles.examCard} ${styles[getExamAccent(exam.examType)]}`}
                  key={exam.examScheduleId}
                >
                  <div className={styles.examMeta}>
                    <span className={styles.typeBadge}>
                      {getExamTypeLabel(exam.examType)}
                    </span>
                    <h3>{exam.title}</h3>
                    <p>
                      {exam.subject} · {formatExamDate(exam.examDate)}
                    </p>
                    <small>{exam.seasonMode}</small>
                  </div>
                  <div className={styles.dDayBox}>
                    <span>D-DAY</span>
                    <strong>{formatExamDistance(exam.daysUntil)}</strong>
                    <div className={styles.progressLine} aria-hidden="true">
                      <span style={{ width: `${getProgress(exam.daysUntil)}%` }} />
                    </div>
                    <p>
                      {exam.daysUntil === 0
                        ? "오늘이 시험이에요."
                        : `목표까지 ${exam.daysUntil}일 남았어요.`}
                    </p>
                  </div>
                  <div className={styles.cardActions}>
                    <button onClick={() => openEditDialog(exam)} type="button">
                      수정
                    </button>
                    <button onClick={() => setDeleteTarget(exam)} type="button">
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <section className={styles.pastSection} aria-labelledby="past-title">
            <h2 className={styles.visuallyHidden} id="past-title">
              지난 시험
            </h2>
            <button
              aria-expanded={showPastExams}
              className={styles.pastToggle}
              onClick={() => setShowPastExams((current) => !current)}
              type="button"
            >
              지난 시험 보기 <span>{pastExams.length}</span>
            </button>
            {showPastExams ? (
              <ul className={styles.pastList}>
                {pastExams.length === 0 ? (
                  <li className={styles.emptyText}>
                    지난 시험 일정이 없습니다.
                  </li>
                ) : (
                  pastExams.map((exam) => (
                    <li className={styles.pastItem} key={exam.examScheduleId}>
                      <div>
                        <strong>{exam.title}</strong>
                        <span>
                          {getExamTypeLabel(exam.examType)} · {exam.subject} ·{" "}
                          {formatExamDate(exam.examDate)}
                        </span>
                      </div>
                      <em>{formatExamDistance(exam.daysUntil)}</em>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </section>
        </main>

        {dialogState ? (
          <div className={styles.dialogBackdrop}>
            <form
              aria-label={
                dialogState.mode === "create" ? "시험 일정 추가" : "시험 일정 수정"
              }
              className={styles.dialog}
              onSubmit={handleSubmit}
              role="dialog"
            >
              <header>
                <h2>{dialogState.mode === "create" ? "시험 추가" : "시험 수정"}</h2>
                <button
                  aria-label="시험 일정 대화상자 닫기"
                  onClick={() => setDialogState(null)}
                  type="button"
                >
                  ×
                </button>
              </header>
              <label>
                유형
                <select
                  onChange={(event) =>
                    updateFormField("examType", event.target.value as ExamType)
                  }
                  value={form.examType}
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
                  onChange={(event) => updateFormField("title", event.target.value)}
                  placeholder="예: 6월 모의고사"
                  value={form.title}
                />
              </label>
              <label>
                과목
                <input
                  maxLength={100}
                  onChange={(event) => updateFormField("subject", event.target.value)}
                  placeholder="예: 수학"
                  value={form.subject}
                />
              </label>
              <label>
                날짜
                <input
                  onChange={(event) => updateFormField("examDate", event.target.value)}
                  type="date"
                  value={form.examDate}
                />
              </label>
              <button
                className={styles.primaryButton}
                disabled={
                  !isFormReady(form) ||
                  createExamMutation.isPending ||
                  updateExamMutation.isPending
                }
                type="submit"
              >
                저장
              </button>
            </form>
          </div>
        ) : null}

        {deleteTarget ? (
          <div className={styles.dialogBackdrop}>
            <div
              aria-label="시험 일정 삭제 확인"
              className={styles.dialog}
              role="dialog"
            >
              <header>
                <h2>시험 삭제</h2>
                <button
                  aria-label="시험 삭제 대화상자 닫기"
                  onClick={() => setDeleteTarget(null)}
                  type="button"
                >
                  ×
                </button>
              </header>
              <p>
                <strong>{deleteTarget.title}</strong> 일정을 삭제할까요?
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
                  disabled={deleteExamMutation.isPending}
                  onClick={() =>
                    deleteExamMutation.mutate(deleteTarget.examScheduleId)
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
