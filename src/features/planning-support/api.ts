import { ApiClientError, apiRequest } from "../../shared/api/client";
import type {
  ExamSchedule,
  ExamType,
  FutureVision,
  SeasonModeResponse,
  Timetable,
} from "../core-loop/types";

type AuthenticatedRequest = {
  token: string;
};

type TimeRange = {
  startTime: string;
  endTime: string;
};

export type FutureVisionForm = {
  weeklyVisionImage: File;
  yearlyVisionImage: File;
  yearlyVisionDescription: string;
};

export type ExamScheduleRequest = {
  examType: ExamType;
  title: string;
  examDate: string;
  subject: string;
};

function appendFutureVisionForm(form: FormData, values: FutureVisionForm) {
  form.append("weeklyVisionImageUrl", values.weeklyVisionImage);
  form.append("yearlyVisionImageUrl", values.yearlyVisionImage);
  form.append("yearlyVisionDescription", values.yearlyVisionDescription);
}

export function getFutureVision({ token }: AuthenticatedRequest) {
  return apiRequest<FutureVision>("/future-vision", { token });
}

export function createFutureVision({
  token,
  values,
}: AuthenticatedRequest & { values: FutureVisionForm }) {
  const form = new FormData();
  appendFutureVisionForm(form, values);

  return apiRequest<void>("/future-vision", {
    body: form,
    method: "POST",
    token,
  });
}

export function updateWeeklyFutureVision({
  token,
  weeklyVisionImage,
}: AuthenticatedRequest & { weeklyVisionImage: File }) {
  const form = new FormData();
  form.append("weeklyVisionImageUrl", weeklyVisionImage);

  return apiRequest<void>("/future-vision/weekly", {
    body: form,
    method: "PATCH",
    token,
  });
}

export function updateYearlyFutureVision({
  token,
  yearlyVisionDescription,
  yearlyVisionImage,
}: AuthenticatedRequest & {
  yearlyVisionDescription: string;
  yearlyVisionImage: File;
}) {
  const form = new FormData();
  form.append("yearlyVisionImageUrl", yearlyVisionImage);
  form.append("yearlyVisionDescription", yearlyVisionDescription);

  return apiRequest<void>("/future-vision/yearly", {
    body: form,
    method: "PATCH",
    token,
  });
}

export function getTimetable({
  dailyPlanId,
  token,
}: AuthenticatedRequest & { dailyPlanId: string }) {
  return apiRequest<Timetable>(`/timetables?dailyPlanId=${dailyPlanId}`, {
    token,
  });
}

export function assignTopPickSlot({
  taskId,
  timetableId,
  token,
  ...timeRange
}: AuthenticatedRequest &
  TimeRange & {
    taskId: string;
    timetableId: string;
  }) {
  return apiRequest<void>(
    `/timetables/${timetableId}/slots/tasks/${taskId}/top-picks`,
    {
      body: timeRange,
      method: "POST",
      token,
    },
  );
}

export function assignTaskSlot({
  taskId,
  timetableId,
  token,
  ...timeRange
}: AuthenticatedRequest &
  TimeRange & {
    taskId: string;
    timetableId: string;
  }) {
  return apiRequest<void>(`/timetables/${timetableId}/slots/tasks/${taskId}`, {
    body: timeRange,
    method: "POST",
    token,
  });
}

export function createDirectSlot({
  content,
  dailyPlanId,
  timetableId,
  token,
  ...timeRange
}: AuthenticatedRequest &
  TimeRange & {
    content: string;
    dailyPlanId: string;
    timetableId: string;
  }) {
  return apiRequest<void>(
    `/timetables/${timetableId}/slots/daily-plans/${dailyPlanId}/direct`,
    {
      body: { content, ...timeRange },
      method: "POST",
      token,
    },
  );
}

export function rescheduleSlot({
  slotId,
  timetableId,
  token,
  ...timeRange
}: AuthenticatedRequest &
  TimeRange & {
    slotId: string;
    timetableId: string;
  }) {
  return apiRequest<void>(`/timetables/${timetableId}/slots/${slotId}/reschedule`, {
    body: timeRange,
    method: "PATCH",
    token,
  });
}

export function deleteSlot({
  slotId,
  timetableId,
  token,
}: AuthenticatedRequest & { slotId: string; timetableId: string }) {
  return apiRequest<void>(`/timetables/${timetableId}/slots/${slotId}`, {
    method: "DELETE",
    token,
  });
}

export function getExamSchedules({ token }: AuthenticatedRequest) {
  return apiRequest<ExamSchedule[]>("/exam-schedules", { token });
}

export function getExamSchedule({
  examScheduleId,
  token,
}: AuthenticatedRequest & { examScheduleId: string }) {
  return apiRequest<ExamSchedule>(`/exam-schedules/${examScheduleId}`, {
    token,
  });
}

export function getNextExamSchedule({ token }: AuthenticatedRequest) {
  return apiRequest<ExamSchedule>("/exam-schedules/next", { token }).catch(
    (error) => {
      if (error instanceof ApiClientError && error.status === 404) {
        return null;
      }

      throw error;
    },
  );
}

export function getSeasonMode({ token }: AuthenticatedRequest) {
  return apiRequest<SeasonModeResponse>("/exam-schedules/season-mode", {
    token,
  });
}

export function createExamSchedule({
  token,
  values,
}: AuthenticatedRequest & { values: ExamScheduleRequest }) {
  return apiRequest<ExamSchedule>("/exam-schedules", {
    body: values,
    method: "POST",
    token,
  });
}

export function updateExamSchedule({
  examScheduleId,
  token,
  values,
}: AuthenticatedRequest & {
  examScheduleId: string;
  values: ExamScheduleRequest;
}) {
  return apiRequest<ExamSchedule>(`/exam-schedules/${examScheduleId}`, {
    body: values,
    method: "PATCH",
    token,
  });
}

export function deleteExamSchedule({
  examScheduleId,
  token,
}: AuthenticatedRequest & { examScheduleId: string }) {
  return apiRequest<void>(`/exam-schedules/${examScheduleId}`, {
    method: "DELETE",
    token,
  });
}
