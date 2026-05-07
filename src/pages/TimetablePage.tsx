import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type DragEvent,
  type FormEvent,
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate, NavLink } from "react-router-dom";

import characterDefault from "../assets/auth/character-default.png";
import { useAuth } from "../features/auth/useAuth";
import { AppSidebar } from "../features/core-loop/AppSidebar";
import {
  completeMindSweep,
  getHomeToday,
  getTopPicks,
  updateMindSweep,
  updateMorningTask,
  uncompleteMindSweep,
} from "../features/core-loop/api";
import type {
  DailyPlanTask,
  FriendAccountability,
  HomeToday,
  Timetable,
  TimetableSlot,
  TopPick,
} from "../features/core-loop/types";
import {
  assignTaskSlot,
  assignTopPickSlot,
  createDirectSlot,
  deleteSlot,
  getTimetable,
  rescheduleSlot,
} from "../features/planning-support/api";
import { ApiClientError } from "../shared/api/client";
import styles from "./TimetablePage.module.css";

const homeTodayKey = ["home-today"] as const;
const hourRowHeight = 64;
const compactSlotHeight = 80;
const minTimelineHour = 0;
const maxTimelineHour = 24;
const snapMinutes = 15;
const minSlotMinutes = 15;
const unassignedTopPickMessage =
  "시간표에 배정되지 않은 TopPick이 있습니다. TopPick을 모두 배정한 뒤 일반 할 일을 넣어 주세요.";

type AddMode = "direct" | "task" | "topPick";

type SlotForm = {
  content: string;
  endTime: string;
  startTime: string;
  taskId: string;
};

type AssignmentDraft = {
  content: string;
  durationMinutes: number;
  taskId: string;
  topPick: boolean;
  type: "task" | "topPick";
};

type SlotInteraction = {
  mode: "move" | "resizeEnd" | "resizeStart";
  originY: number;
  originalEndMinute: number;
  originalStartMinute: number;
  slotId: string;
};

type SlotPreview = {
  endMinute: number;
  slotId: string;
  startMinute: number;
};

type DragPreview = SlotPreview & {
  blocked: boolean;
};

type DeleteSlotRequest = {
  intent?: "delete" | "reassign";
  slotId: string;
  taskId?: string;
};

type SlotTaskToggleRequest = {
  completed: boolean;
  taskId: string;
};

type SlotTaskUpdateRequest = {
  content: string;
  taskId: string;
  taskType: DailyPlanTask["taskType"];
};

type TaskSlotAssignmentResult = {
  assignmentType: "task" | "topPick";
};

type RescheduleRequest = {
  endTime: string;
  slotId: string;
  startTime: string;
};

type OptimisticContext = {
  previousHome?: HomeToday;
  previousTimetable?: Timetable;
};

type TopPickPlacementBlockReason = "unassigned";

type TimetableIconType =
  | "add"
  | "back"
  | "calendar"
  | "check"
  | "chevronLeft"
  | "chevronRight"
  | "clock"
  | "delete"
  | "edit"
  | "leaf"
  | "more"
  | "undo"
  | "task"
  | "tip";

const emptySlotForm: SlotForm = {
  content: "",
  endTime: "09:30",
  startTime: "09:00",
  taskId: "",
};

function TimetableIcon({ type }: { type: TimetableIconType }) {
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
      {type === "add" ? <path d="M12 5v14M5 12h14" /> : null}
      {type === "back" ? <path d="m15 18-6-6 6-6" /> : null}
      {type === "calendar" ? (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </>
      ) : null}
      {type === "check" ? <path d="m5 13 4 4L19 7" /> : null}
      {type === "chevronLeft" ? <path d="m15 18-6-6 6-6" /> : null}
      {type === "chevronRight" ? <path d="m9 18 6-6-6-6" /> : null}
      {type === "clock" ? (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 2" />
        </>
      ) : null}
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
      {type === "leaf" ? (
        <>
          <path d="M12 21V10" />
          <path d="M12 13C7 13 5 9 5 5c4 0 8 2 7 8Z" />
          <path d="M12 12c5 0 7-4 7-8-4 0-8 2-7 8Z" />
        </>
      ) : null}
      {type === "more" ? (
        <>
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="19" r="1" />
        </>
      ) : null}
      {type === "task" ? (
        <>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="m9 12 2 2 4-5" />
        </>
      ) : null}
      {type === "undo" ? (
        <>
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10a6 6 0 0 1 0 12h-2" />
        </>
      ) : null}
      {type === "tip" ? (
        <>
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M8.5 14a6 6 0 1 1 7 0c-.8.6-1.2 1.4-1.4 2h-4.2c-.2-.6-.6-1.4-1.4-2Z" />
        </>
      ) : null}
    </svg>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.message.includes("모든 상위 선택 작업")) {
      return unassignedTopPickMessage;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "요청 처리에 실패했습니다.";
}

function isTopPickPlacementError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message.includes("모든 상위 선택 작업");
  }

  return (
    error instanceof Error &&
    error.message === unassignedTopPickMessage
  );
}

function getFriendAccountabilityText(
  friendAccountability: FriendAccountability | null,
) {
  if (!friendAccountability?.relationCreated) {
    return "연결된 친구 없음";
  }

  if (friendAccountability.watchedByFriend && friendAccountability.watchingFriend) {
    return "서로 진행 상황 공유 중";
  }

  if (friendAccountability.watchedByFriend) {
    return "친구가 나를 지켜보는 중";
  }

  if (friendAccountability.watchingFriend) {
    return "내가 친구를 지켜보는 중";
  }

  return friendAccountability.inviteCodeStatus ?? "친구 연결 대기 중";
}

function formatExamDistance(daysUntil: number) {
  if (daysUntil === 0) {
    return "D-Day";
  }

  return daysUntil > 0 ? `D-${daysUntil}` : `D+${Math.abs(daysUntil)}`;
}

function getNextExamLabel(home: HomeToday) {
  return home.nextExamSchedule
    ? `${home.nextExamSchedule.title} ${formatExamDistance(
        home.nextExamSchedule.daysUntil,
      )}`
    : "목표 설정 전";
}

function getDisplayDateParts(targetDate: string) {
  const [year, month, day] = targetDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const validDate =
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!validDate) {
    return {
      display: targetDate || "날짜 없음",
      isoDate: targetDate,
    };
  }

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return {
    display: `${year}년 ${month}월 ${day}일 (${weekdays[date.getDay()]})`,
    isoDate: targetDate,
  };
}

function normalizeTimeInput(time: string) {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

function toApiTime(time: string) {
  const normalized = normalizeTimeInput(time);

  return normalized.length === 5 ? `${normalized}:00` : normalized;
}

function parseTimeToMinutes(time: string) {
  const normalized = normalizeTimeInput(time);
  const [hour, minute] = normalized.split(":").map(Number);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return 0;
  }

  return hour * 60 + minute;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snapToStep(minutes: number) {
  return Math.round(minutes / snapMinutes) * snapMinutes;
}

function minutesToTimeInput(minutes: number) {
  const normalizedMinutes = clamp(minutes, 0, 24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const remainingMinutes = normalizedMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(
    2,
    "0",
  )}`;
}

function normalizeDuration(minutes: number) {
  return Math.max(minSlotMinutes, Math.ceil(minutes / snapMinutes) * snapMinutes);
}

function getSlotDurationMinutes(slot: TimetableSlot) {
  return Math.max(
    0,
    parseTimeToMinutes(slot.endTime) - parseTimeToMinutes(slot.startTime),
  );
}

function hasTimeOverlap({
  endMinute,
  ignoreSlotId,
  slots,
  startMinute,
}: {
  endMinute: number;
  ignoreSlotId?: string;
  slots: TimetableSlot[];
  startMinute: number;
}) {
  return slots.some((slot) => {
    if (slot.slotId === ignoreSlotId) {
      return false;
    }

    const slotStart = parseTimeToMinutes(slot.startTime);
    const slotEnd = parseTimeToMinutes(slot.endTime);

    return startMinute < slotEnd && endMinute > slotStart;
  });
}

function validateTimeRange({
  endMinute,
  ignoreSlotId,
  slots,
  startMinute,
}: {
  endMinute: number;
  ignoreSlotId?: string;
  slots: TimetableSlot[];
  startMinute: number;
}) {
  if (endMinute <= startMinute) {
    return "종료 시간은 시작 시간보다 뒤여야 합니다.";
  }

  if (
    startMinute < minTimelineHour * 60 ||
    endMinute > maxTimelineHour * 60
  ) {
    return "시간표 범위 안에서 배치해 주세요.";
  }

  if (hasTimeOverlap({ endMinute, ignoreSlotId, slots, startMinute })) {
    return "이미 배치된 시간과 겹칩니다. 빈 시간대에 놓아 주세요.";
  }

  return null;
}

function formatDuration(minutes: number) {
  if (minutes <= 0) {
    return "-";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}분`;
  }

  return remainingMinutes === 0
    ? `${hours}시간`
    : `${hours}시간 ${remainingMinutes}분`;
}

function formatSlotRange(slot: TimetableSlot) {
  return `${normalizeTimeInput(slot.startTime)} - ${normalizeTimeInput(slot.endTime)}`;
}

function formatMinuteRange(startMinute: number, endMinute: number) {
  return `${minutesToTimeInput(startMinute)} - ${minutesToTimeInput(endMinute)}`;
}

function isCompactSlotHeight(height: number) {
  return height < compactSlotHeight;
}

function formatSlotChipText({
  endMinute,
  height,
  startMinute,
}: {
  endMinute: number;
  height: number;
  startMinute: number;
}) {
  return isCompactSlotHeight(height)
    ? formatMinuteRange(startMinute, endMinute)
    : formatDuration(endMinute - startMinute);
}

function getTopPickTaskIds(topPicks: TopPick[]) {
  return new Set(topPicks.map((topPick) => topPick.taskId));
}

function isTaskTopPickedByTodayList(
  task: DailyPlanTask,
  topPickTaskIds: Set<string>,
) {
  return topPickTaskIds.has(task.taskId);
}

function getGeneralTasks(tasks: DailyPlanTask[], topPicks: TopPick[]) {
  const topPickTaskIds = getTopPickTaskIds(topPicks);

  return tasks.filter(
    (task) =>
      !task.completed && !isTaskTopPickedByTodayList(task, topPickTaskIds),
  );
}

function getTaskDuration(task: DailyPlanTask) {
  return normalizeDuration(task.topPickDetail?.estimatedMinutes ?? 60);
}

function getTopPickDuration(topPick: TopPick) {
  return normalizeDuration(topPick.estimatedMinutes);
}

function getSortedSlots(timetable: Timetable | null) {
  return [...(timetable?.slots ?? [])].sort(
    (left, right) =>
      parseTimeToMinutes(left.startTime) - parseTimeToMinutes(right.startTime),
  );
}

function getTimelineRange(slots: TimetableSlot[]) {
  const earliestStart = slots.reduce(
    (earliest, slot) => Math.min(earliest, parseTimeToMinutes(slot.startTime)),
    minTimelineHour * 60,
  );
  const latestEnd = slots.reduce(
    (latest, slot) => Math.max(latest, parseTimeToMinutes(slot.endTime)),
    maxTimelineHour * 60,
  );
  const startHour = Math.min(minTimelineHour, Math.floor(earliestStart / 60));
  const endHour = Math.max(maxTimelineHour, Math.ceil(latestEnd / 60));

  return { endHour, startHour };
}

function getHourLabels(startHour: number, endHour: number) {
  return Array.from({ length: endHour - startHour + 1 }, (_, index) => {
    const hour = startHour + index;

    return `${String(hour).padStart(2, "0")}:00`;
  });
}

function getSlotClass(slot: TimetableSlot, index: number, isTopPick = slot.topPick) {
  if (isTopPick) {
    return styles.slotGreen;
  }

  if (slot.taskId === null) {
    return styles.slotTeal;
  }

  const palette = [
    styles.slotBlue,
    styles.slotAmber,
    styles.slotPurple,
    styles.slotRose,
  ];

  return palette[index % palette.length];
}

function getTodayTopPicks(home: HomeToday, sourceTopPicks = home.topPicks) {
  const todayTasks = home.todayDailyPlan?.tasks ?? [];

  if (todayTasks.length === 0) {
    return sourceTopPicks;
  }

  const todayTaskIds = new Set(todayTasks.map((task) => task.taskId));

  return sourceTopPicks.filter((topPick) => todayTaskIds.has(topPick.taskId));
}

function getAssignedTaskIds(slots: TimetableSlot[]) {
  return new Set(
    slots
      .map((slot) => slot.taskId)
      .filter((taskId): taskId is string => Boolean(taskId)),
  );
}

function isSlotAssignedToTopPick(topPick: TopPick, slot: TimetableSlot) {
  if (slot.taskId === topPick.taskId) {
    return true;
  }

  return slot.topPick && slot.content.trim() === topPick.content.trim();
}

function getTopPickForSlot(topPicks: TopPick[], slot: TimetableSlot) {
  return (
    topPicks.find((topPick) => isSlotAssignedToTopPick(topPick, slot)) ?? null
  );
}

function getAssignedTopPickIds(topPicks: TopPick[], slots: TimetableSlot[]) {
  return new Set(
    topPicks
      .filter((topPick) =>
        slots.some((slot) => isSlotAssignedToTopPick(topPick, slot)),
      )
      .map((topPick) => topPick.taskId),
  );
}

function getUnassignedTopPickIds(topPicks: TopPick[], slots: TimetableSlot[]) {
  const assignedTopPickIds = getAssignedTopPickIds(topPicks, slots);

  return new Set(
    topPicks
      .filter((topPick) => !assignedTopPickIds.has(topPick.taskId))
      .map((topPick) => topPick.taskId),
  );
}

function getAssignedTopPickSlotTaskIds(
  topPicks: TopPick[],
  slots: TimetableSlot[],
) {
  return getAssignedTopPickIds(topPicks, slots);
}

function getTopPickPlacementBlockReason({
  slots,
  timetable,
  topPicks,
}: {
  slots: TimetableSlot[];
  timetable: Timetable | null;
  topPicks: TopPick[];
}): TopPickPlacementBlockReason | null {
  if (!timetable || topPicks.length === 0) {
    return null;
  }

  const hasKnownUnassignedTopPick =
    getUnassignedTopPickIds(topPicks, slots).size > 0;

  if (hasKnownUnassignedTopPick) {
    return "unassigned";
  }

  return null;
}

function needsTopPickPlacementRefresh({
  slots,
  timetable,
  topPicks,
}: {
  slots: TimetableSlot[];
  timetable: Timetable | null;
  topPicks: TopPick[];
}) {
  if (
    !timetable ||
    topPicks.length === 0 ||
    getTopPickPlacementBlockReason({ slots, timetable, topPicks })
  ) {
    return false;
  }

  const assignedTopPickSlotTaskIds = getAssignedTopPickSlotTaskIds(
    topPicks,
    slots,
  );
  const expectedTopPickCount = Math.max(timetable.topPickTotal, topPicks.length);

  return assignedTopPickSlotTaskIds.size < expectedTopPickCount;
}

function getTopPickPlacementBlockMessage() {
  return unassignedTopPickMessage;
}

function getTaskCompletionById(home: HomeToday, topPicks = home.topPicks) {
  const completionById = new Map<string, boolean>();

  topPicks.forEach((topPick) => {
    completionById.set(topPick.taskId, topPick.completed);
  });
  (home.todayDailyPlan?.tasks ?? []).forEach((task) => {
    completionById.set(
      task.taskId,
      Boolean(task.completed || completionById.get(task.taskId)),
    );
  });

  return completionById;
}

function getTaskById(home: HomeToday) {
  const taskById = new Map<string, DailyPlanTask>();

  (home.todayDailyPlan?.tasks ?? []).forEach((task) => {
    taskById.set(task.taskId, task);
  });
  (home.todayDailyPlan?.morningTasks ?? []).forEach((task) => {
    taskById.set(task.taskId, { ...task, taskType: "MORNING" });
  });
  home.morningTasks.forEach((task) => {
    taskById.set(task.taskId, { ...task, taskType: "MORNING" });
  });

  return taskById;
}

function createAssignmentDrafts(
  home: HomeToday,
  slots: TimetableSlot[],
  sourceTopPicks = home.topPicks,
) {
  const assignedTaskIds = getAssignedTaskIds(slots);
  const todayTopPicks = getTodayTopPicks(home, sourceTopPicks);
  const topPickTaskIds = getTopPickTaskIds(todayTopPicks);
  const assignedTopPickIds = getAssignedTopPickIds(todayTopPicks, slots);
  const topPickDrafts: AssignmentDraft[] = todayTopPicks
    .filter((topPick) => !assignedTopPickIds.has(topPick.taskId))
    .map((topPick) => ({
      content: topPick.content,
      durationMinutes: getTopPickDuration(topPick),
      taskId: topPick.taskId,
      topPick: true,
      type: "topPick",
    }));
  const taskDrafts: AssignmentDraft[] = (home.todayDailyPlan?.tasks ?? [])
    .filter(
      (task) =>
        !task.completed &&
        !isTaskTopPickedByTodayList(task, topPickTaskIds) &&
        !assignedTaskIds.has(task.taskId),
    )
    .map((task) => ({
      content: task.content,
      durationMinutes: getTaskDuration(task),
      taskId: task.taskId,
      topPick: false,
      type: "task",
    }));

  return { taskDrafts, topPickDrafts };
}

function parseDraggedDraft(event: DragEvent<HTMLElement>) {
  const rawDraft = event.dataTransfer.getData("application/x-movra-task");

  if (!rawDraft) {
    return null;
  }

  try {
    return JSON.parse(rawDraft) as AssignmentDraft;
  } catch {
    return null;
  }
}

function calculateSlotInteractionCandidate({
  clientY,
  interaction,
  timelineEndMinute,
  timelineStartMinute,
}: {
  clientY: number;
  interaction: SlotInteraction;
  timelineEndMinute: number;
  timelineStartMinute: number;
}) {
  const originY = Number.isFinite(interaction.originY)
    ? interaction.originY
    : 0;
  const safeClientY = Number.isFinite(clientY) ? clientY : originY;
  const deltaMinute = snapToStep(
    ((safeClientY - originY) / hourRowHeight) * 60,
  );
  const duration =
    interaction.originalEndMinute - interaction.originalStartMinute;

  if (interaction.mode === "move") {
    const startMinute = clamp(
      interaction.originalStartMinute + deltaMinute,
      timelineStartMinute,
      timelineEndMinute - duration,
    );

    return {
      endMinute: startMinute + duration,
      startMinute,
    };
  }

  if (interaction.mode === "resizeStart") {
    return {
      endMinute: interaction.originalEndMinute,
      startMinute: clamp(
        interaction.originalStartMinute + deltaMinute,
        timelineStartMinute,
        interaction.originalEndMinute - minSlotMinutes,
      ),
    };
  }

  return {
    endMinute: clamp(
      interaction.originalEndMinute + deltaMinute,
      interaction.originalStartMinute + minSlotMinutes,
      timelineEndMinute,
    ),
    startMinute: interaction.originalStartMinute,
  };
}

function TimetableEmptyState({
  hasDailyPlan,
  isContractMissing,
}: {
  hasDailyPlan: boolean;
  isContractMissing: boolean;
}) {
  if (!hasDailyPlan) {
    return (
      <div className={styles.emptyPanel}>
        <img src={characterDefault} alt="" aria-hidden="true" />
        <strong>오늘 계획을 먼저 만들어 주세요.</strong>
        <p>MindSweep에서 오늘 할 일을 꺼내면 시간 블록으로 이어갈 수 있어요.</p>
        <NavLink to="/planning">계획하러 가기</NavLink>
      </div>
    );
  }

  if (isContractMissing) {
    return (
      <div className={styles.emptyPanel}>
        <img src={characterDefault} alt="" aria-hidden="true" />
        <strong>오늘 DailyPlan은 있지만 시간표가 아직 준비되지 않았습니다.</strong>
        <p>
          DailyPlan 생성 시 Timetable이 함께 생성되는 백엔드 계약을 확인해야 합니다.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.emptyPanel}>
      <img src={characterDefault} alt="" aria-hidden="true" />
      <strong>오늘 5분 블록 하나만 잡아볼래요?</strong>
      <p>처음부터 하루 전체를 채우지 않아도 괜찮아요.</p>
    </div>
  );
}

export function TimetablePage() {
  const { accessToken, logout } = useAuth();
  const token = accessToken ?? "";
  const queryClient = useQueryClient();
  const timelineCanvasRef = useRef<HTMLDivElement | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const dragPreviewRef = useRef<DragPreview | null>(null);
  const pendingPointerYRef = useRef<number | null>(null);
  const pendingTopPickSlotRequestsRef = useRef(new Set<Promise<void>>());
  const slotBlockRefs = useRef(new Map<string, HTMLElement>());
  const slotDurationRefs = useRef(new Map<string, HTMLElement>());
  const slotRangeRefs = useRef(new Map<string, HTMLElement>());
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("topPick");
  const [slotForm, setSlotForm] = useState<SlotForm>(emptySlotForm);
  const [toastClosing, setToastClosing] = useState(false);
  const [toastId, setToastId] = useState(0);
  const [selectedDraft, setSelectedDraft] = useState<AssignmentDraft | null>(null);
  const [memoDialog, setMemoDialog] = useState<TopPick | null>(null);
  const [reassignableTaskIds, setReassignableTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [slotInteraction, setSlotInteraction] =
    useState<SlotInteraction | null>(null);
  const [editingTaskSlot, setEditingTaskSlot] = useState<{
    slot: TimetableSlot;
    task: DailyPlanTask;
  } | null>(null);
  const [editingTaskContent, setEditingTaskContent] = useState("");

  const homeQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => getHomeToday({ token }),
    queryKey: homeTodayKey,
  });

  const home = homeQuery.data;
  const dailyPlanId =
    home?.todayDailyPlan?.dailyPlanId ?? home?.timetable?.dailyPlanId ?? "";
  const timetableQueryKey = ["timetable", dailyPlanId] as const;
  const topPicksQueryKey = ["top-picks", dailyPlanId] as const;
  const timetableQuery = useQuery({
    enabled: Boolean(token && dailyPlanId),
    queryFn: () => getTimetable({ dailyPlanId, token }),
    queryKey: timetableQueryKey,
  });
  const topPicksQuery = useQuery({
    enabled: Boolean(token && dailyPlanId),
    queryFn: () => getTopPicks({ dailyPlanId, token }),
    queryKey: topPicksQueryKey,
  });
  const timetable = timetableQuery.data ?? home?.timetable ?? null;
  const sortedSlots = useMemo(() => getSortedSlots(timetable), [timetable]);
  const totalPlannedMinutes = sortedSlots.reduce(
    (total, slot) => total + getSlotDurationMinutes(slot),
    0,
  );
  const { endHour, startHour } = getTimelineRange(sortedSlots);
  const hourLabels = getHourLabels(startHour, endHour);
  const timelineStartMinute = startHour * 60;
  const timelineEndMinute = endHour * 60;
  const timelineHeight =
    ((timelineEndMinute - timelineStartMinute) / 60) * hourRowHeight;

  const getSlotLayout = useCallback(
    (startMinute: number, endMinute: number) => {
      return {
        height: Math.max(
          46,
          ((endMinute - startMinute) / 60) * hourRowHeight - 10,
        ),
        top: ((startMinute - timelineStartMinute) / 60) * hourRowHeight,
      };
    },
    [timelineStartMinute],
  );

  function rememberSlotBlock(slotId: string, element: HTMLElement | null) {
    if (element) {
      slotBlockRefs.current.set(slotId, element);
      return;
    }

    slotBlockRefs.current.delete(slotId);
  }

  function rememberSlotRange(slotId: string, element: HTMLElement | null) {
    if (element) {
      slotRangeRefs.current.set(slotId, element);
      return;
    }

    slotRangeRefs.current.delete(slotId);
  }

  function rememberSlotDuration(slotId: string, element: HTMLElement | null) {
    if (element) {
      slotDurationRefs.current.set(slotId, element);
      return;
    }

    slotDurationRefs.current.delete(slotId);
  }

  const applySlotDomPosition = useCallback(
    ({ endMinute, slotId, startMinute }: SlotPreview) => {
      const slotElement = slotBlockRefs.current.get(slotId);
      const rangeElement = slotRangeRefs.current.get(slotId);
      const durationElement = slotDurationRefs.current.get(slotId);
      const { height, top } = getSlotLayout(startMinute, endMinute);
      const isCompact = isCompactSlotHeight(height);

      if (slotElement) {
        slotElement.style.height = `${height}px`;
        slotElement.style.transform = `translate3d(0, ${top + 5}px, 0)`;
        slotElement.classList.toggle(styles.slotBlockCompact, isCompact);
      }

      if (rangeElement) {
        rangeElement.textContent = formatMinuteRange(startMinute, endMinute);
      }

      if (durationElement) {
        durationElement.textContent = formatSlotChipText({
          endMinute,
          height,
          startMinute,
        });
      }
    },
    [getSlotLayout],
  );

  const setDraggingDomState = useCallback((slotId: string, blocked: boolean) => {
    slotBlockRefs.current
      .get(slotId)
      ?.classList.toggle(styles.slotBlockDragging, true);
    timelineCanvasRef.current?.classList.toggle(styles.timelineBlocked, blocked);
  }, []);

  const resetSlotDom = useCallback(
    (slot: TimetableSlot) => {
      const startMinute = parseTimeToMinutes(slot.startTime);
      const endMinute = parseTimeToMinutes(slot.endTime);
      const slotElement = slotBlockRefs.current.get(slot.slotId);
      const rangeElement = slotRangeRefs.current.get(slot.slotId);
      const durationElement = slotDurationRefs.current.get(slot.slotId);
      const { height } = getSlotLayout(startMinute, endMinute);

      applySlotDomPosition({
        endMinute,
        slotId: slot.slotId,
        startMinute,
      });
      slotElement?.classList.remove(styles.slotBlockDragging);
      timelineCanvasRef.current?.classList.remove(styles.timelineBlocked);

      if (rangeElement) {
        rangeElement.textContent = formatSlotRange(slot);
      }

      if (durationElement) {
        durationElement.textContent = formatSlotChipText({
          endMinute,
          height,
          startMinute,
        });
      }
    },
    [applySlotDomPosition, getSlotLayout],
  );

  async function refreshTimetable() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: homeTodayKey }),
      queryClient.invalidateQueries({ queryKey: timetableQueryKey }),
      queryClient.invalidateQueries({ queryKey: topPicksQueryKey }),
    ]);
  }

  function showActionError(message: string) {
    setToastClosing(false);
    setActionNotice(null);
    setActionError(message);
    setToastId((current) => current + 1);
  }

  function showActionNotice(message: string) {
    setToastClosing(false);
    setActionError(null);
    setActionNotice(message);
    setToastId((current) => current + 1);
  }

  function handleMutationError(error: unknown) {
    if (isTopPickPlacementError(error)) {
      void refreshTimetable();
    }

    showActionError(getErrorMessage(error));
  }

  function handleMutationNotice(message: string) {
    showActionNotice(message);
  }

  function trackTopPickSlotRequest(request: Promise<void>) {
    pendingTopPickSlotRequestsRef.current.add(request);
    void request
      .finally(() => {
        pendingTopPickSlotRequestsRef.current.delete(request);
      })
      .catch(() => undefined);

    return request;
  }

  async function waitForPendingTopPickSlotRequests() {
    const requests = [...pendingTopPickSlotRequestsRef.current];

    if (requests.length === 0) {
      return;
    }

    await Promise.allSettled(requests);
  }

  function getOptimisticSnapshot(): OptimisticContext {
    return {
      previousHome: queryClient.getQueryData<HomeToday>(homeTodayKey),
      previousTimetable: queryClient.getQueryData<Timetable>(timetableQueryKey),
    };
  }

  function rollbackOptimisticUpdate(context: OptimisticContext | undefined) {
    if (!context) {
      return;
    }

    queryClient.setQueryData(homeTodayKey, context.previousHome);

    if (context.previousTimetable) {
      queryClient.setQueryData(timetableQueryKey, context.previousTimetable);
    }
  }

  async function prepareOptimisticUpdate() {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: homeTodayKey }),
      queryClient.cancelQueries({ queryKey: timetableQueryKey }),
    ]);

    return getOptimisticSnapshot();
  }

  function setOptimisticTimetable(nextTimetable: Timetable) {
    queryClient.setQueryData(timetableQueryKey, nextTimetable);
    queryClient.setQueryData<HomeToday>(homeTodayKey, (current) =>
      current ? { ...current, timetable: nextTimetable } : current,
    );
  }

  function getCurrentTimetableForOptimistic() {
    return queryClient.getQueryData<Timetable>(timetableQueryKey) ?? timetable;
  }

  function rememberReassignableTask(taskId: string) {
    setReassignableTaskIds((current) => new Set(current).add(taskId));
  }

  function forgetReassignableTask(taskId: string) {
    setReassignableTaskIds((current) => {
      if (!current.has(taskId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(taskId);

      return next;
    });
  }

  function getCurrentUnassignedTopPickIds() {
    const currentTimetable = getCurrentTimetableForOptimistic();
    const currentHome = queryClient.getQueryData<HomeToday>(homeTodayKey) ?? home;

    if (!currentTimetable || !currentHome) {
      return new Set<string>();
    }

    const currentTopPicks =
      queryClient.getQueryData<TopPick[]>(topPicksQueryKey) ?? currentHome.topPicks;
    const currentTodayTopPicks = getTodayTopPicks(currentHome, currentTopPicks);

    return getUnassignedTopPickIds(
      currentTodayTopPicks,
      getSortedSlots(currentTimetable),
    );
  }

  function currentTopPickPlacementNeedsRefresh() {
    const currentTimetable = getCurrentTimetableForOptimistic();
    const currentHome = queryClient.getQueryData<HomeToday>(homeTodayKey) ?? home;

    if (!currentTimetable || !currentHome) {
      return false;
    }

    const currentTopPicks =
      queryClient.getQueryData<TopPick[]>(topPicksQueryKey) ?? currentHome.topPicks;
    const currentTodayTopPicks = getTodayTopPicks(currentHome, currentTopPicks);

    return needsTopPickPlacementRefresh({
      slots: getSortedSlots(currentTimetable),
      timetable: currentTimetable,
      topPicks: currentTodayTopPicks,
    });
  }

  async function ensureTopPickPlacementBeforeTaskSlot(taskId: string) {
    await waitForPendingTopPickSlotRequests();

    if (currentTopPickPlacementNeedsRefresh()) {
      await refreshTimetable();
    }

    const unassignedTopPickIds = getCurrentUnassignedTopPickIds();

    if (
      unassignedTopPickIds.size > 0 &&
      !unassignedTopPickIds.has(taskId) &&
      !reassignableTaskIds.has(taskId)
    ) {
      throw new Error(getTopPickPlacementBlockMessage());
    }
  }

  function createOptimisticSlot({
    form,
    topPick,
  }: {
    form: SlotForm;
    topPick: boolean;
  }): TimetableSlot {
    return {
      content: form.content,
      endTime: toApiTime(form.endTime),
      slotId: `optimistic-${form.taskId || "direct"}-${Date.now()}`,
      startTime: toApiTime(form.startTime),
      taskId: form.taskId || null,
      topPick,
    };
  }

  function optimisticallyAddSlot(form: SlotForm, topPick: boolean) {
    const currentTimetable = getCurrentTimetableForOptimistic();

    if (!currentTimetable) {
      return;
    }

    setOptimisticTimetable({
      ...currentTimetable,
      slots: [
        ...currentTimetable.slots.filter((slot) => slot.taskId !== form.taskId),
        createOptimisticSlot({ form, topPick }),
      ],
    });
  }

  function optimisticallyRescheduleSlot({
    endTime,
    slotId,
    startTime,
  }: RescheduleRequest) {
    const currentTimetable = getCurrentTimetableForOptimistic();

    if (!currentTimetable) {
      return;
    }

    setOptimisticTimetable({
      ...currentTimetable,
      slots: currentTimetable.slots.map((slot) =>
        slot.slotId === slotId
          ? { ...slot, endTime: toApiTime(endTime), startTime: toApiTime(startTime) }
          : slot,
      ),
    });
  }

  function optimisticallyDeleteSlot({ slotId }: DeleteSlotRequest) {
    const currentTimetable = getCurrentTimetableForOptimistic();

    if (!currentTimetable) {
      return;
    }

    setOptimisticTimetable({
      ...currentTimetable,
      slots: currentTimetable.slots.filter((slot) => slot.slotId !== slotId),
    });
  }

  function optimisticallyToggleTask({ completed, taskId }: SlotTaskToggleRequest) {
    const nextCompleted = !completed;

    queryClient.setQueryData<HomeToday>(homeTodayKey, (current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        todayDailyPlan: current.todayDailyPlan
          ? {
              ...current.todayDailyPlan,
              tasks: current.todayDailyPlan.tasks.map((task) =>
                task.taskId === taskId
                  ? { ...task, completed: nextCompleted }
                  : task,
              ),
            }
          : current.todayDailyPlan,
        topPicks: current.topPicks.map((topPick) =>
          topPick.taskId === taskId
            ? { ...topPick, completed: nextCompleted }
            : topPick,
        ),
      };
    });
  }

  function optimisticallyUpdateTaskContent({
    content,
    taskId,
  }: SlotTaskUpdateRequest) {
    const currentTimetable = getCurrentTimetableForOptimistic();

    if (currentTimetable) {
      setOptimisticTimetable({
        ...currentTimetable,
        slots: currentTimetable.slots.map((slot) =>
          slot.taskId === taskId ? { ...slot, content } : slot,
        ),
      });
    }

    queryClient.setQueryData<HomeToday>(homeTodayKey, (current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        morningTasks: current.morningTasks.map((task) =>
          task.taskId === taskId ? { ...task, content } : task,
        ),
        todayDailyPlan: current.todayDailyPlan
          ? {
              ...current.todayDailyPlan,
              morningTasks: current.todayDailyPlan.morningTasks.map((task) =>
                task.taskId === taskId ? { ...task, content } : task,
              ),
              tasks: current.todayDailyPlan.tasks.map((task) =>
                task.taskId === taskId ? { ...task, content } : task,
              ),
            }
          : current.todayDailyPlan,
        topPicks: current.topPicks.map((topPick) =>
          topPick.taskId === taskId ? { ...topPick, content } : topPick,
        ),
      };
    });

    queryClient.setQueryData<TopPick[]>(topPicksQueryKey, (current) =>
      current?.map((topPick) =>
        topPick.taskId === taskId ? { ...topPick, content } : topPick,
      ),
    );
  }

  const assignTopPickSlotMutation = useMutation({
    mutationFn: (form: SlotForm) => {
      const request = assignTopPickSlot({
        endTime: toApiTime(form.endTime),
        startTime: toApiTime(form.startTime),
        taskId: form.taskId,
        timetableId: timetable?.timetableId ?? "",
        token,
      });

      return trackTopPickSlotRequest(request);
    },
    onMutate: async (form) => {
      const context = await prepareOptimisticUpdate();

      optimisticallyAddSlot(form, true);
      setComposerOpen(false);
      setSlotForm(emptySlotForm);

      return context;
    },
    onError: (error, _form, context) => {
      rollbackOptimisticUpdate(context);
      handleMutationError(error);
    },
    onSuccess: async () => {
      handleMutationNotice("TopPick을 시간 블록에 배정했습니다.");
      await refreshTimetable();
    },
  });

  const assignTaskSlotMutation = useMutation({
    mutationFn: async (form: SlotForm) => {
      await ensureTopPickPlacementBeforeTaskSlot(form.taskId);

      const request = {
        endTime: toApiTime(form.endTime),
        startTime: toApiTime(form.startTime),
        taskId: form.taskId,
        timetableId: timetable?.timetableId ?? "",
        token,
      };

      if (getCurrentUnassignedTopPickIds().has(form.taskId)) {
        await assignTopPickSlot(request);

        return { assignmentType: "topPick" } satisfies TaskSlotAssignmentResult;
      }

      try {
        await assignTaskSlot(request);

        return { assignmentType: "task" } satisfies TaskSlotAssignmentResult;
      } catch (error) {
        if (!isTopPickPlacementError(error)) {
          throw error;
        }

        await refreshTimetable();

        const unassignedTopPickIds = getCurrentUnassignedTopPickIds();

        if (
          unassignedTopPickIds.size > 0 &&
          !unassignedTopPickIds.has(form.taskId) &&
          !reassignableTaskIds.has(form.taskId)
        ) {
          throw error;
        }

        if (unassignedTopPickIds.has(form.taskId)) {
          await assignTopPickSlot(request);

          return { assignmentType: "topPick" } satisfies TaskSlotAssignmentResult;
        }

        await assignTaskSlot(request);

        return { assignmentType: "task" } satisfies TaskSlotAssignmentResult;
      }
    },
    onMutate: async (form) => {
      const context = await prepareOptimisticUpdate();

      optimisticallyAddSlot(form, false);
      setComposerOpen(false);
      setSlotForm(emptySlotForm);

      return context;
    },
    onError: (error, _form, context) => {
      rollbackOptimisticUpdate(context);
      handleMutationError(error);
    },
    onSuccess: async (result, form) => {
      forgetReassignableTask(form.taskId);
      handleMutationNotice(
        result.assignmentType === "topPick"
          ? "TopPick을 시간 블록에 배정했습니다."
          : "할 일을 시간 블록에 배정했습니다.",
      );
      await refreshTimetable();
    },
  });

  const createDirectSlotMutation = useMutation({
    mutationFn: (form: SlotForm) =>
      createDirectSlot({
        content: form.content.trim(),
        dailyPlanId,
        endTime: toApiTime(form.endTime),
        startTime: toApiTime(form.startTime),
        timetableId: timetable?.timetableId ?? "",
        token,
      }),
    onMutate: async (form) => {
      const context = await prepareOptimisticUpdate();

      optimisticallyAddSlot({ ...form, taskId: "" }, false);
      setComposerOpen(false);
      setSlotForm(emptySlotForm);

      return context;
    },
    onError: (error, _form, context) => {
      rollbackOptimisticUpdate(context);
      handleMutationError(error);
    },
    onSuccess: async () => {
      handleMutationNotice("직접 시간 블록을 추가했습니다.");
      await refreshTimetable();
    },
  });

  const rescheduleSlotMutation = useMutation({
    mutationFn: ({ endTime, slotId, startTime }: RescheduleRequest) =>
      rescheduleSlot({
        endTime: toApiTime(endTime),
        slotId,
        startTime: toApiTime(startTime),
        timetableId: timetable?.timetableId ?? "",
        token,
      }),
    onMutate: async (request) => {
      const context = await prepareOptimisticUpdate();

      optimisticallyRescheduleSlot(request);

      return context;
    },
    onError: (error, _request, context) => {
      rollbackOptimisticUpdate(context);
      handleMutationError(error);
    },
    onSuccess: async () => {
      handleMutationNotice("시간 블록을 수정했습니다.");
      await refreshTimetable();
    },
  });

  const toggleSlotTaskMutation = useMutation({
    mutationFn: ({ completed, taskId }: SlotTaskToggleRequest) =>
      completed
        ? uncompleteMindSweep({ dailyPlanId, taskId, token })
        : completeMindSweep({ dailyPlanId, taskId, token }),
    onMutate: async (request) => {
      const context = await prepareOptimisticUpdate();

      optimisticallyToggleTask(request);

      return context;
    },
    onError: (error, _request, context) => {
      rollbackOptimisticUpdate(context);
      handleMutationError(error);
    },
    onSuccess: async () => {
      handleMutationNotice("시간표 할 일 완료 상태를 바꿨습니다.");
      await refreshTimetable();
    },
  });

  const updateSlotTaskMutation = useMutation({
    mutationFn: ({ content, taskId, taskType }: SlotTaskUpdateRequest) =>
      taskType === "MORNING"
        ? updateMorningTask({ content, dailyPlanId, taskId, token })
        : updateMindSweep({ content, dailyPlanId, taskId, token }),
    onMutate: async (request) => {
      const context = await prepareOptimisticUpdate();

      optimisticallyUpdateTaskContent(request);

      return context;
    },
    onError: (error, _request, context) => {
      rollbackOptimisticUpdate(context);
      handleMutationError(error);
    },
    onSuccess: async () => {
      setEditingTaskSlot(null);
      setEditingTaskContent("");
      handleMutationNotice("Task 내용을 수정했습니다.");
      await refreshTimetable();
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: ({ slotId }: DeleteSlotRequest) =>
      deleteSlot({ slotId, timetableId: timetable?.timetableId ?? "", token }),
    onMutate: async (request) => {
      const context = await prepareOptimisticUpdate();

      optimisticallyDeleteSlot(request);

      return context;
    },
    onError: (error, _request, context) => {
      rollbackOptimisticUpdate(context);
      handleMutationError(error);
    },
    onSuccess: async (_data, variables) => {
      if (variables.intent === "reassign" && variables.taskId) {
        rememberReassignableTask(variables.taskId);
      } else if (variables.taskId) {
        forgetReassignableTask(variables.taskId);
      }
      handleMutationNotice(
        variables.intent === "reassign"
          ? "시간 블록을 재배정 대기 상태로 돌렸습니다."
          : "시간 블록을 삭제했습니다.",
      );
      await refreshTimetable();
    },
  });

  useEffect(() => {
    if (!actionError && !actionNotice) {
      return undefined;
    }

    setToastClosing(false);

    const fadeTimer = window.setTimeout(() => {
      setToastClosing(true);
    }, 1500);
    const clearTimer = window.setTimeout(() => {
      setActionError(null);
      setActionNotice(null);
      setToastClosing(false);
    }, 1760);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [actionError, actionNotice, toastId]);

  useEffect(() => {
    if (!composerOpen) {
      return undefined;
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setComposerOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [composerOpen]);

  useEffect(() => {
    if (!slotInteraction) {
      return undefined;
    }

    const timelineCanvasElement = timelineCanvasRef.current;

    function updateInteractionPreview(clientY: number) {
      const activeInteraction = slotInteraction;

      if (!activeInteraction) {
        return;
      }

      const candidate = calculateSlotInteractionCandidate({
        clientY,
        interaction: activeInteraction,
        timelineEndMinute,
        timelineStartMinute,
      });
      const overlap = hasTimeOverlap({
        endMinute: candidate.endMinute,
        ignoreSlotId: activeInteraction.slotId,
        slots: sortedSlots,
        startMinute: candidate.startMinute,
      });
      const nextPreview: DragPreview = {
        blocked: overlap,
        endMinute: candidate.endMinute,
        slotId: activeInteraction.slotId,
        startMinute: candidate.startMinute,
      };
      const currentPreview = dragPreviewRef.current;

      if (
        currentPreview?.slotId === nextPreview.slotId &&
        currentPreview.startMinute === nextPreview.startMinute &&
        currentPreview.endMinute === nextPreview.endMinute &&
        currentPreview.blocked === nextPreview.blocked
      ) {
        return;
      }

      dragPreviewRef.current = nextPreview;
      setDraggingDomState(activeInteraction.slotId, overlap);

      if (!overlap) {
        applySlotDomPosition(nextPreview);
      }
    }

    function handlePointerMove(event: globalThis.PointerEvent) {
      pendingPointerYRef.current = event.clientY;

      if (dragFrameRef.current !== null) {
        return;
      }

      dragFrameRef.current = window.requestAnimationFrame(() => {
        dragFrameRef.current = null;

        if (pendingPointerYRef.current !== null) {
          updateInteractionPreview(pendingPointerYRef.current);
        }
      });
    }

    function handlePointerUp(event: globalThis.PointerEvent) {
      if (!slotInteraction) {
        return;
      }

      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
      pendingPointerYRef.current = null;

      const candidate = calculateSlotInteractionCandidate({
        clientY: event.clientY,
        interaction: slotInteraction,
        timelineEndMinute,
        timelineStartMinute,
      });
      const error = validateTimeRange({
        endMinute: candidate.endMinute,
        ignoreSlotId: slotInteraction.slotId,
        slots: sortedSlots,
        startMinute: candidate.startMinute,
      });
      const slot = sortedSlots.find(
        (candidateSlot) => candidateSlot.slotId === slotInteraction.slotId,
      );

      setSlotInteraction(null);
      dragPreviewRef.current = null;

      if (!slot) {
        timelineCanvasRef.current?.classList.remove(styles.timelineBlocked);
        return;
      }

      if (error) {
        resetSlotDom(slot);
        setToastClosing(false);
        setActionNotice(null);
        setActionError(error);
        setToastId((current) => current + 1);
        return;
      }

      const nextStartTime = minutesToTimeInput(candidate.startMinute);
      const nextEndTime = minutesToTimeInput(candidate.endMinute);

      if (
        normalizeTimeInput(slot.startTime) === nextStartTime &&
          normalizeTimeInput(slot.endTime) === nextEndTime
      ) {
        resetSlotDom(slot);
        return;
      }

      slotBlockRefs.current
        .get(slot.slotId)
        ?.classList.remove(styles.slotBlockDragging);
      timelineCanvasRef.current?.classList.remove(styles.timelineBlocked);

      rescheduleSlotMutation.mutate({
        endTime: nextEndTime,
        slotId: slot.slotId,
        startTime: nextStartTime,
      });
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
      pendingPointerYRef.current = null;
      dragPreviewRef.current = null;
      timelineCanvasElement?.classList.remove(styles.timelineBlocked);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    applySlotDomPosition,
    resetSlotDom,
    slotInteraction,
    sortedSlots,
    setDraggingDomState,
    timelineEndMinute,
    timelineStartMinute,
    rescheduleSlotMutation,
  ]);

  if (homeQuery.isLoading) {
    return (
      <section className={styles.centerState} aria-live="polite">
        <img src={characterDefault} alt="" aria-hidden="true" />
        <h1>시간표를 불러오고 있습니다.</h1>
      </section>
    );
  }

  if (homeQuery.isError) {
    return (
      <section className={styles.centerState} aria-live="assertive">
        <img src={characterDefault} alt="" aria-hidden="true" />
        <h1>오늘 시간표를 불러오지 못했습니다.</h1>
        <p>{getErrorMessage(homeQuery.error)}</p>
        <button
          className={styles.primaryButton}
          onClick={() => homeQuery.refetch()}
          type="button"
        >
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

  const dateParts = getDisplayDateParts(home.targetDate);
  const nextExamLabel = getNextExamLabel(home);
  const friendAccountabilityText = getFriendAccountabilityText(
    home.friendAccountability,
  );
  const sourceTopPicks = topPicksQuery.data ?? home.topPicks;
  const todayTopPicks = getTodayTopPicks(home, sourceTopPicks);
  const assignedTopPickIds = getAssignedTopPickIds(todayTopPicks, sortedSlots);
  const topPickPlacementNeedsRefresh = needsTopPickPlacementRefresh({
    slots: sortedSlots,
    timetable,
    topPicks: todayTopPicks,
  });
  const taskCompletionById = getTaskCompletionById(home, sourceTopPicks);
  const taskById = getTaskById(home);
  const generalTasks = getGeneralTasks(
    home.todayDailyPlan?.tasks ?? [],
    todayTopPicks,
  );
  const { taskDrafts, topPickDrafts } = createAssignmentDrafts(
    home,
    sortedSlots,
    sourceTopPicks,
  );
  const allDrafts = [...topPickDrafts, ...taskDrafts];
  const taskAssignmentDisabled = generalTasks.length === 0 || !timetable;
  const topPickOptions = todayTopPicks.filter(
    (topPick) => !assignedTopPickIds.has(topPick.taskId),
  );
  const defaultTaskId =
    addMode === "topPick"
      ? slotForm.taskId || topPickOptions[0]?.taskId || ""
      : slotForm.taskId || generalTasks[0]?.taskId || "";
  const timetableLoading = Boolean(
    dailyPlanId &&
      home.timetable !== null &&
      (timetableQuery.isLoading || topPicksQuery.isLoading),
  );
  const contractMissing =
    Boolean(dailyPlanId) &&
    !timetable &&
    (home.timetable === null || timetableQuery.isError);
  const canUseComposer = Boolean(timetable && dailyPlanId);
  const pending =
    assignTopPickSlotMutation.isPending ||
    assignTaskSlotMutation.isPending ||
    createDirectSlotMutation.isPending ||
    rescheduleSlotMutation.isPending ||
    deleteSlotMutation.isPending ||
    toggleSlotTaskMutation.isPending;
  const placementLocked =
    rescheduleSlotMutation.isPending || deleteSlotMutation.isPending;
  const canPlaceDrafts = Boolean(timetable && dailyPlanId && !placementLocked);
  const canPlaceTaskDrafts = canPlaceDrafts;

  function getMinuteFromClientY(clientY: number) {
    const rect = timelineCanvasRef.current?.getBoundingClientRect();
    const y = clientY - (rect?.top ?? 0);
    const rawMinute = timelineStartMinute + (y / hourRowHeight) * 60;

    return clamp(
      snapToStep(rawMinute),
      timelineStartMinute,
      timelineEndMinute - minSlotMinutes,
    );
  }

  function validateAndReportRange({
    endMinute,
    ignoreSlotId,
    startMinute,
  }: {
    endMinute: number;
    ignoreSlotId?: string;
    startMinute: number;
  }) {
    const error = validateTimeRange({
      endMinute,
      ignoreSlotId,
      slots: sortedSlots,
      startMinute,
    });

    if (error) {
      showActionError(error);
      return false;
    }

    return true;
  }

  function reportTopPickPlacementBlock(taskId: string) {
    const currentUnassignedTopPickIds = getCurrentUnassignedTopPickIds();

    if (
      currentUnassignedTopPickIds.size === 0 ||
      currentUnassignedTopPickIds.has(taskId) ||
      reassignableTaskIds.has(taskId) ||
      pendingTopPickSlotRequestsRef.current.size > 0
    ) {
      return false;
    }

    showActionError(getTopPickPlacementBlockMessage());
    void refreshTimetable();

    return true;
  }

  function refreshTopPickPlacementIfNeeded() {
    if (
      topPickPlacementNeedsRefresh &&
      pendingTopPickSlotRequestsRef.current.size === 0
    ) {
      void refreshTimetable();
    }
  }

  function placeDraftAtMinute(draft: AssignmentDraft, startMinute: number) {
    if (!canPlaceDrafts) {
      return;
    }

    if (!draft.topPick && reportTopPickPlacementBlock(draft.taskId)) {
      return;
    }

    if (!draft.topPick) {
      refreshTopPickPlacementIfNeeded();
    }

    const duration = normalizeDuration(draft.durationMinutes);
    const clampedStartMinute = clamp(
      startMinute,
      timelineStartMinute,
      timelineEndMinute - duration,
    );
    const endMinute = clampedStartMinute + duration;

    if (
      !validateAndReportRange({
        endMinute,
        startMinute: clampedStartMinute,
      })
    ) {
      return;
    }

    const nextForm: SlotForm = {
      content: draft.content,
      endTime: minutesToTimeInput(endMinute),
      startTime: minutesToTimeInput(clampedStartMinute),
      taskId: draft.taskId,
    };

    setSelectedDraft(null);

    if (draft.topPick) {
      assignTopPickSlotMutation.mutate(nextForm);
      return;
    }

    assignTaskSlotMutation.mutate(nextForm);
  }

  function handleSourceDragStart(
    event: DragEvent<HTMLButtonElement>,
    draft: AssignmentDraft,
  ) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-movra-task", JSON.stringify(draft));
    setSelectedDraft(draft);
    setActionError(null);
  }

  function handleTimelineDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const draft = parseDraggedDraft(event) ?? selectedDraft;

    if (!draft) {
      return;
    }

    placeDraftAtMinute(draft, getMinuteFromClientY(event.clientY));
  }

  function handleTimelineDragOver(event: DragEvent<HTMLDivElement>) {
    if (canPlaceDrafts) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handleTimelineClick(event: MouseEvent<HTMLDivElement>) {
    if (!selectedDraft) {
      return;
    }

    const target = event.target as HTMLElement;

    if (target.closest("[data-slot-block='true']")) {
      return;
    }

    placeDraftAtMinute(selectedDraft, getMinuteFromClientY(event.clientY));
  }

  function startSlotInteraction(
    event: PointerEvent<HTMLElement>,
    slot: TimetableSlot,
    mode: SlotInteraction["mode"],
  ) {
    if (pending) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setSelectedDraft(null);
    setActionError(null);
    const startMinute = parseTimeToMinutes(slot.startTime);
    const endMinute = parseTimeToMinutes(slot.endTime);

    dragPreviewRef.current = {
      blocked: false,
      endMinute,
      slotId: slot.slotId,
      startMinute,
    };
    setDraggingDomState(slot.slotId, false);
    setSlotInteraction({
      mode,
      originY: event.clientY,
      originalEndMinute: endMinute,
      originalStartMinute: startMinute,
      slotId: slot.slotId,
    });
  }

  function handleOpenComposer(nextMode: AddMode = "topPick") {
    setAddMode(nextMode);
    setSlotForm({
      ...emptySlotForm,
      taskId:
        nextMode === "topPick"
          ? topPickOptions[0]?.taskId ?? ""
          : generalTasks[0]?.taskId ?? "",
    });
    setComposerOpen(true);
    setEditingTaskSlot(null);
  }

  function handleSubmitSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!timetable || !dailyPlanId) {
      return;
    }

    const startMinute = parseTimeToMinutes(slotForm.startTime);
    const endMinute = parseTimeToMinutes(slotForm.endTime);

    if (!validateAndReportRange({ endMinute, startMinute })) {
      return;
    }

    if (addMode === "direct") {
      const content = slotForm.content.trim();

      if (!content) {
        return;
      }

      createDirectSlotMutation.mutate({ ...slotForm, content });
      return;
    }

    const taskId = defaultTaskId;

    if (!taskId) {
      return;
    }

    if (addMode === "task" && reportTopPickPlacementBlock(taskId)) {
      return;
    }

    if (addMode === "task") {
      refreshTopPickPlacementIfNeeded();
    }

    const selectedContent =
      addMode === "topPick"
        ? topPickOptions.find((topPick) => topPick.taskId === taskId)?.content
        : generalTasks.find((task) => task.taskId === taskId)?.content;
    const nextForm = {
      ...slotForm,
      content: slotForm.content.trim() || selectedContent || "",
      taskId,
    };

    if (addMode === "topPick") {
      assignTopPickSlotMutation.mutate(nextForm);
      return;
    }

    assignTaskSlotMutation.mutate(nextForm);
  }

  function startEditingTaskSlot(slot: TimetableSlot, task: DailyPlanTask) {
    if (task.completed) {
      return;
    }

    setComposerOpen(false);
    setEditingTaskSlot({ slot, task });
    setEditingTaskContent(task.content);
  }

  function handleUpdateSlotTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingTaskSlot || !dailyPlanId) {
      return;
    }

    const content = editingTaskContent.trim();

    if (!content || editingTaskSlot.task.completed) {
      return;
    }

    updateSlotTaskMutation.mutate({
      content,
      taskId: editingTaskSlot.task.taskId,
      taskType: editingTaskSlot.task.taskType,
    });
  }

  return (
    <section className={styles.page} aria-labelledby="timetable-title">
      <AppSidebar
        friendText={friendAccountabilityText}
        onLogout={logout}
        profileSubtitle={nextExamLabel}
        quote="오늘도, 작은 블록 하나가 큰 변화를 만들어요."
      />

      <div className={styles.contentShell}>
        {actionError ? (
          <p
            className={`${styles.error} ${toastClosing ? styles.toastClosing : ""}`}
            role="alert"
          >
            {actionError}
          </p>
        ) : null}
        {actionNotice ? (
          <p
            className={`${styles.success} ${
              toastClosing ? styles.toastClosing : ""
            }`}
            role="status"
          >
            {actionNotice}
          </p>
        ) : null}

        <header className={styles.pageHeader}>
          <div>
            <h1 id="timetable-title">시간표</h1>
            <p>오늘 하루의 시간 블록을 계획해보세요.</p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.plannedTimeBadge} aria-label="계획된 총 시간">
              <span>계획된 총 시간</span>
              <strong>{formatDuration(totalPlannedMinutes)}</strong>
            </div>
            <button className={styles.dateButton} type="button">
              <TimetableIcon type="calendar" />
              다른 날짜
            </button>
          </div>
        </header>

        <div className={styles.dateNavigator} aria-label="날짜 이동">
          <button aria-label="이전 날짜" type="button">
            <TimetableIcon type="chevronLeft" />
          </button>
          <time dateTime={dateParts.isoDate}>
            <TimetableIcon type="calendar" />
            {dateParts.display}
          </time>
          <button aria-label="다음 날짜" type="button">
            <TimetableIcon type="chevronRight" />
          </button>
        </div>

        {timetableLoading ? (
          <section className={styles.timelineLoading} aria-live="polite">
            시간 블록을 불러오고 있습니다.
          </section>
        ) : null}

        {!timetableLoading && (!dailyPlanId || contractMissing) ? (
          <TimetableEmptyState
            hasDailyPlan={Boolean(dailyPlanId)}
            isContractMissing={contractMissing}
          />
        ) : null}

        {!timetableLoading && canUseComposer ? (
          <div className={styles.plannerLayout}>
            <aside className={styles.taskDock} aria-label="배치할 작업">
              <div className={styles.taskDockHeader}>
                <div>
                  <p>Drag & Drop</p>
                  <h2>배치할 작업</h2>
                </div>
                <span>드래그하거나 선택 후 시간표를 눌러 배치</span>
              </div>

              {allDrafts.length === 0 ? (
                <p className={styles.emptyDockText}>
                  배치할 작업이 없습니다. 계획 화면에서 MindSweep과 TopPick을 먼저
                  정리해 주세요.
                </p>
              ) : (
                <div className={styles.sourceList}>
                  {topPickDrafts.map((draft) => (
                    <button
                      aria-pressed={selectedDraft?.taskId === draft.taskId}
                      className={`${styles.sourceCard} ${styles.sourceTopPick}`}
                      draggable={canPlaceDrafts}
                      disabled={!canPlaceDrafts}
                      key={`top-pick-${draft.taskId}`}
                      onClick={() => setSelectedDraft(draft)}
                      onDragStart={(event) => handleSourceDragStart(event, draft)}
                      type="button"
                    >
                      <span>TopPick</span>
                      <strong>{draft.content}</strong>
                      <small>기본 {formatDuration(draft.durationMinutes)}</small>
                    </button>
                  ))}
                  {taskDrafts.map((draft) => (
                    <button
                      aria-pressed={selectedDraft?.taskId === draft.taskId}
                      className={styles.sourceCard}
                      draggable={canPlaceTaskDrafts}
                      disabled={!canPlaceTaskDrafts}
                      key={`task-${draft.taskId}`}
                      onClick={() => setSelectedDraft(draft)}
                      onDragStart={(event) => handleSourceDragStart(event, draft)}
                      type="button"
                    >
                      <span>MindSweep</span>
                      <strong>{draft.content}</strong>
                      <small>기본 {formatDuration(draft.durationMinutes)}</small>
                    </button>
                  ))}
                </div>
              )}
              <button
                className={styles.addBlockButton}
                onClick={() =>
                  handleOpenComposer(topPickOptions.length > 0 ? "topPick" : "direct")
                }
                type="button"
              >
                <TimetableIcon type="add" />
                시간 블록 추가
              </button>
            </aside>

            <section className={styles.timelineSection} aria-label="오늘 시간 블록">
              <div
                className={styles.timelineGrid}
                style={{ minHeight: `${timelineHeight}px` }}
              >
                <ol className={styles.timeRail} aria-hidden="true">
                  {hourLabels.map((label) => (
                    <li
                      key={label}
                      style={{
                        top: `${
                          ((parseTimeToMinutes(label) - timelineStartMinute) /
                            60) *
                          hourRowHeight
                        }px`,
                      }}
                    >
                      {label}
                    </li>
                  ))}
                </ol>
                <div
                  aria-label="시간표 배치 영역"
                  className={`${styles.timelineCanvas} ${
                    selectedDraft ? styles.timelineSelecting : ""
                  }`}
                  onClick={handleTimelineClick}
                  onDragOver={handleTimelineDragOver}
                  onDrop={handleTimelineDrop}
                  ref={timelineCanvasRef}
                  role="application"
                  tabIndex={0}
                >
                  {hourLabels.map((label) => (
                    <span
                      aria-hidden="true"
                      className={styles.gridLine}
                      key={label}
                      style={{
                        top: `${
                          ((parseTimeToMinutes(label) - timelineStartMinute) /
                            60) *
                          hourRowHeight
                        }px`,
                      }}
                    />
                  ))}

                  {sortedSlots.length === 0 ? (
                    <div className={styles.timelineHint}>
                      <strong>작업을 원하는 시간대에 놓아 주세요.</strong>
                      <span>00:00부터 24:00까지 15분 단위로 배치됩니다.</span>
                    </div>
                  ) : null}

                  {selectedDraft ? (
                    <div className={styles.selectedDraftHint}>
                      선택됨: {selectedDraft.content}
                    </div>
                  ) : null}

                  {sortedSlots.map((slot, index) => {
                    const startMinute = parseTimeToMinutes(slot.startTime);
                    const endMinute = parseTimeToMinutes(slot.endTime);
                    const { height, top } = getSlotLayout(startMinute, endMinute);
                    const slotRange = formatSlotRange(slot);
                    const slotIsCompact = isCompactSlotHeight(height);
                    const slotMinutes = endMinute - startMinute;
                    const slotTaskId = slot.taskId;
                    const slotTask = slotTaskId
                      ? taskById.get(slotTaskId) ?? null
                      : null;
                    const taskCompleted = slotTaskId
                      ? taskCompletionById.get(slotTaskId) ?? false
                      : false;
                    const canToggleCompletion = Boolean(slotTaskId);
                    const canEditTask = Boolean(slotTask && !taskCompleted);
                    const slotTopPick = getTopPickForSlot(todayTopPicks, slot);
                    const slotIsTopPick = Boolean(slotTopPick || slot.topPick);
                    const slotMemo = slotTopPick?.memo.trim() ?? "";

                    return (
                      <article
                        aria-label={`${slot.content} ${slotRange}`}
                        className={`${styles.slotBlock} ${getSlotClass(
                          slot,
                          index,
                          slotIsTopPick,
                        )} ${
                          taskCompleted ? styles.slotCompleted : ""
                        } ${
                          slotIsCompact ? styles.slotBlockCompact : ""
                        }`}
                        data-slot-block="true"
                        key={slot.slotId}
                        onPointerDown={(event) => {
                          const target = event.target as HTMLElement;

                          if (target.closest("button")) {
                            return;
                          }

                          startSlotInteraction(event, slot, "move");
                        }}
                        ref={(element) => rememberSlotBlock(slot.slotId, element)}
                        style={{
                          height: `${height}px`,
                          transform: `translate3d(0, ${top + 5}px, 0)`,
                        }}
                      >
                        <button
                          aria-label={`${slot.content} 시작 시간 조절`}
                          className={styles.resizeHandleTop}
                          onPointerDown={(event) =>
                            startSlotInteraction(event, slot, "resizeStart")
                          }
                          type="button"
                        />
                        <span className={styles.slotIcon} aria-hidden="true">
                          <TimetableIcon type={slotIsTopPick ? "leaf" : "task"} />
                        </span>
                        <div className={styles.slotMain}>
                          <div className={styles.slotTitleRow}>
                            <strong>{slot.content}</strong>
                            {slotIsTopPick ? (
                              <span className={styles.slotTopPickBadge}>
                                TopPick
                              </span>
                            ) : null}
                          </div>
                          <div className={styles.slotMetaRow}>
                            <TimetableIcon type="clock" />
                            <time
                              ref={(element) =>
                                rememberSlotRange(slot.slotId, element)
                              }
                            >
                              {slotRange}
                            </time>
                            {slotMemo && !slotIsCompact ? (
                              <button
                                className={styles.memoButton}
                                onClick={() => setMemoDialog(slotTopPick)}
                                type="button"
                              >
                                메모 보기
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div className={styles.slotControls}>
                          <span className={styles.slotDuration}>
                            <TimetableIcon type="clock" />
                            <span
                              ref={(element) =>
                                rememberSlotDuration(slot.slotId, element)
                              }
                            >
                              {slotIsCompact
                                ? slotRange
                                : formatDuration(slotMinutes)}
                            </span>
                          </span>
                          <div className={styles.slotActions}>
                            {canToggleCompletion && slotTaskId ? (
                              <button
                                aria-label={`${slot.content} ${
                                  taskCompleted ? "완료 취소" : "완료"
                                }`}
                                className={styles.completeSlotButton}
                                disabled={toggleSlotTaskMutation.isPending}
                                onClick={() =>
                                  toggleSlotTaskMutation.mutate({
                                    completed: taskCompleted,
                                    taskId: slotTaskId,
                                  })
                                }
                                title={taskCompleted ? "완료 취소" : "완료"}
                                type="button"
                              >
                                <TimetableIcon
                                  type={taskCompleted ? "undo" : "check"}
                                />
                                <span>{taskCompleted ? "취소" : "완료"}</span>
                              </button>
                            ) : null}
                            {canEditTask && slotTask ? (
                              <button
                                aria-label={`${slot.content} 수정`}
                                className={styles.editSlotButton}
                                onClick={() => startEditingTaskSlot(slot, slotTask)}
                                title="수정"
                                type="button"
                              >
                                <TimetableIcon type="edit" />
                                <span>수정</span>
                              </button>
                            ) : null}
                            {slotTaskId ? (
                              <button
                                aria-label={`${slot.content} 재배정`}
                                disabled={deleteSlotMutation.isPending || taskCompleted}
                                onClick={() =>
                                  deleteSlotMutation.mutate({
                                    intent: "reassign",
                                    slotId: slot.slotId,
                                    taskId: slotTaskId,
                                  })
                                }
                                title={
                                  taskCompleted
                                    ? "완료 취소 후 재배정할 수 있습니다."
                                    : "재배정"
                                }
                                type="button"
                              >
                                <TimetableIcon type="back" />
                                <span>재배정</span>
                              </button>
                            ) : null}
                            <button
                              aria-label={`${slot.content} 삭제`}
                              className={styles.deleteSlotButton}
                              disabled={deleteSlotMutation.isPending}
                              onClick={() =>
                                deleteSlotMutation.mutate({
                                  intent: "delete",
                                  slotId: slot.slotId,
                                  taskId: slotTaskId ?? undefined,
                                })
                              }
                              title="삭제"
                              type="button"
                            >
                              <TimetableIcon type="delete" />
                              <span>삭제</span>
                            </button>
                          </div>
                        </div>
                        <button
                          aria-label={`${slot.content} 종료 시간 조절`}
                          className={styles.resizeHandleBottom}
                          onPointerDown={(event) =>
                            startSlotInteraction(event, slot, "resizeEnd")
                          }
                          type="button"
                        />
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {editingTaskSlot ? (
          <div
            className={styles.modalBackdrop}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setEditingTaskSlot(null);
                setEditingTaskContent("");
              }
            }}
          >
            <form
              aria-labelledby="task-edit-title"
              aria-modal="true"
              className={styles.taskEditModal}
              onSubmit={handleUpdateSlotTask}
              role="dialog"
            >
              <div className={styles.composerHeader}>
                <div>
                  <p>Task</p>
                  <h2 id="task-edit-title">Task 수정</h2>
                </div>
                <button
                  aria-label="Task 수정 닫기"
                  onClick={() => {
                    setEditingTaskSlot(null);
                    setEditingTaskContent("");
                  }}
                  type="button"
                >
                  ×
                </button>
              </div>
              <label>
                내용
                <input
                  autoFocus
                  onChange={(event) => setEditingTaskContent(event.target.value)}
                  type="text"
                  value={editingTaskContent}
                />
              </label>
              <div className={styles.taskEditActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => {
                    setEditingTaskSlot(null);
                    setEditingTaskContent("");
                  }}
                  type="button"
                >
                  취소
                </button>
                <button
                  className={styles.primaryButton}
                  disabled={
                    updateSlotTaskMutation.isPending || !editingTaskContent.trim()
                  }
                  type="submit"
                >
                  수정 저장
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {canUseComposer && composerOpen ? (
              <div
                className={styles.modalBackdrop}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setComposerOpen(false);
                  }
                }}
              >
                <section
                  aria-labelledby="composer-title"
                  aria-modal="true"
                  className={styles.composerModal}
                  role="dialog"
                >
                <div className={styles.composerHeader}>
                  <div>
                    <p>Block</p>
                    <h2 id="composer-title">시간 블록 만들기</h2>
                  </div>
                  <button
                    aria-label="시간 블록 만들기 닫기"
                    onClick={() => setComposerOpen(false)}
                    type="button"
                  >
                    ×
                  </button>
                </div>

                <div className={styles.modeTabs} aria-label="블록 유형">
                  <button
                    aria-pressed={addMode === "topPick"}
                    disabled={topPickOptions.length === 0}
                    onClick={() => handleOpenComposer("topPick")}
                    type="button"
                  >
                    TopPick
                  </button>
                  <button
                    aria-pressed={addMode === "task"}
                    disabled={taskAssignmentDisabled}
                    onClick={() => handleOpenComposer("task")}
                    type="button"
                  >
                    일반 할 일
                  </button>
                  <button
                    aria-pressed={addMode === "direct"}
                    onClick={() => handleOpenComposer("direct")}
                    type="button"
                  >
                    직접 입력
                  </button>
                </div>

                <form className={styles.slotForm} onSubmit={handleSubmitSlot}>
                  {addMode === "topPick" ? (
                    <label>
                      TopPick 선택
                      <select
                        disabled={topPickOptions.length === 0}
                        onChange={(event) =>
                          setSlotForm((current) => ({
                            ...current,
                            taskId: event.target.value,
                          }))
                        }
                        value={defaultTaskId}
                      >
                        {topPickOptions.length === 0 ? (
                          <option value="">배정할 TopPick 없음</option>
                        ) : (
                          topPickOptions.map((topPick) => (
                            <option key={topPick.taskId} value={topPick.taskId}>
                              {topPick.content}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                  ) : null}

                  {addMode === "task" ? (
                    <label>
                      일반 할 일 선택
                      <select
                        disabled={taskAssignmentDisabled}
                        onChange={(event) =>
                          setSlotForm((current) => ({
                            ...current,
                            taskId: event.target.value,
                          }))
                        }
                        value={defaultTaskId}
                      >
                        {generalTasks.length === 0 ? (
                          <option value="">배정할 할 일 없음</option>
                        ) : (
                          generalTasks.map((task) => (
                            <option key={task.taskId} value={task.taskId}>
                              {task.content}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                  ) : null}

                  {addMode === "direct" ? (
                    <label>
                      블록 내용
                      <input
                        maxLength={255}
                        onChange={(event) =>
                          setSlotForm((current) => ({
                            ...current,
                            content: event.target.value,
                          }))
                        }
                        placeholder="예: 정리 및 내일 준비"
                        value={slotForm.content}
                      />
                    </label>
                  ) : null}

                  <div className={styles.timePair}>
                    <label>
                      시작
                      <input
                        onChange={(event) =>
                          setSlotForm((current) => ({
                            ...current,
                            startTime: event.target.value,
                          }))
                        }
                        type="time"
                        value={slotForm.startTime}
                      />
                    </label>
                    <label>
                      종료
                      <input
                        onChange={(event) =>
                          setSlotForm((current) => ({
                            ...current,
                            endTime: event.target.value,
                          }))
                        }
                        type="time"
                        value={slotForm.endTime}
                      />
                    </label>
                  </div>

                  <button
                    className={styles.primaryButton}
                    disabled={
                      pending ||
                      (addMode === "direct" && !slotForm.content.trim()) ||
                      (addMode === "topPick" && topPickOptions.length === 0) ||
                      (addMode === "task" && taskAssignmentDisabled)
                    }
                    type="submit"
                  >
                    블록 저장
                  </button>
                </form>
                </section>
              </div>
        ) : null}

        {memoDialog ? (
          <div
            className={styles.modalBackdrop}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setMemoDialog(null);
              }
            }}
          >
            <section
              aria-labelledby="memo-dialog-title"
              aria-modal="true"
              className={styles.memoModal}
              role="dialog"
            >
              <div className={styles.composerHeader}>
                <div>
                  <p>TopPick Memo</p>
                  <h2 id="memo-dialog-title">{memoDialog.content}</h2>
                </div>
                <button
                  aria-label="TopPick 메모 닫기"
                  onClick={() => setMemoDialog(null)}
                  type="button"
                >
                  ×
                </button>
              </div>
              <p>{memoDialog.memo}</p>
            </section>
          </div>
        ) : null}

        <aside className={styles.tipBand} aria-label="시간표 팁">
          <TimetableIcon type="tip" />
          <strong>Tip</strong>
          <span>한 번에 너무 많은 계획은 오히려 부담이 돼요. 여유 시간도 소중해요.</span>
        </aside>
      </div>
    </section>
  );
}
