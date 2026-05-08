import type { Timetable, TimetableSlot } from "../core-loop/types";

export const hourRowHeight = 64;
export const compactSlotHeight = 80;
export const minTimelineHour = 0;
export const maxTimelineHour = 24;
export const snapMinutes = 15;
export const minSlotMinutes = 15;

export function normalizeTimeInput(time: string) {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

export function toApiTime(time: string) {
  const normalized = normalizeTimeInput(time);

  return normalized.length === 5 ? `${normalized}:00` : normalized;
}

export function parseTimeToMinutes(time: string) {
  const normalized = normalizeTimeInput(time);
  const [hour, minute] = normalized.split(":").map(Number);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return 0;
  }

  return hour * 60 + minute;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function snapToStep(minutes: number) {
  return Math.round(minutes / snapMinutes) * snapMinutes;
}

export function minutesToTimeInput(minutes: number) {
  const normalizedMinutes = clamp(minutes, 0, 24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const remainingMinutes = normalizedMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(
    2,
    "0",
  )}`;
}

export function normalizeDuration(minutes: number) {
  return Math.max(minSlotMinutes, Math.ceil(minutes / snapMinutes) * snapMinutes);
}

export function getSlotDurationMinutes(slot: TimetableSlot) {
  return Math.max(
    0,
    parseTimeToMinutes(slot.endTime) - parseTimeToMinutes(slot.startTime),
  );
}

export function hasTimeOverlap({
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

export function validateTimeRange({
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

export function formatDuration(minutes: number) {
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

export function formatSlotRange(slot: TimetableSlot) {
  return `${normalizeTimeInput(slot.startTime)} - ${normalizeTimeInput(slot.endTime)}`;
}

export function formatMinuteRange(startMinute: number, endMinute: number) {
  return `${minutesToTimeInput(startMinute)} - ${minutesToTimeInput(endMinute)}`;
}

export function isCompactSlotHeight(height: number) {
  return height < compactSlotHeight;
}

export function formatSlotChipText({
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

export function getSortedSlots(timetable: Timetable | null) {
  return [...(timetable?.slots ?? [])].sort(
    (left, right) =>
      parseTimeToMinutes(left.startTime) - parseTimeToMinutes(right.startTime),
  );
}

export function getTimelineRange(slots: TimetableSlot[]) {
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

export function getHourLabels(startHour: number, endHour: number) {
  return Array.from({ length: endHour - startHour + 1 }, (_, index) => {
    const hour = startHour + index;

    return `${String(hour).padStart(2, "0")}:00`;
  });
}
