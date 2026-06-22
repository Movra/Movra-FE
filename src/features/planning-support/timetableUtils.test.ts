import {
  formatDuration,
  formatMinuteRange,
  formatSlotChipText,
  formatSlotRange,
  getHourLabels,
  getSlotDurationMinutes,
  getSortedSlots,
  getTimelineRange,
  hasTimeOverlap,
  minutesToTimeInput,
  normalizeDuration,
  normalizeTimeInput,
  parseTimeToMinutes,
  snapToStep,
  toApiTime,
  validateTimeRange,
} from "./timetableUtils";
import type { Timetable, TimetableSlot } from "../core-loop/types";

function createSlot(values: Partial<TimetableSlot>): TimetableSlot {
  return {
    content: "task",
    endTime: "10:00:00",
    slotId: "slot",
    startTime: "09:00:00",
    taskId: "task",
    topPick: false,
    ...values,
  };
}

describe("timetable utils", () => {
  it("normalizes and converts time values", () => {
    expect(normalizeTimeInput("09:15:00")).toBe("09:15");
    expect(toApiTime("09:15")).toBe("09:15:00");
    expect(toApiTime("09:15:00")).toBe("09:15:00");
    expect(parseTimeToMinutes("01:30:00")).toBe(90);
    expect(minutesToTimeInput(75)).toBe("01:15");
    expect(snapToStep(22)).toBe(15);
  });

  it("rejects malformed or out-of-range time values", () => {
    expect(() => parseTimeToMinutes("")).toThrow(RangeError);
    expect(() => parseTimeToMinutes("09:60")).toThrow(RangeError);
    expect(() => parseTimeToMinutes("24:15")).toThrow(RangeError);
    expect(parseTimeToMinutes("24:00:00")).toBe(1440);
  });

  it("normalizes durations and formats duration labels", () => {
    expect(normalizeDuration(1)).toBe(15);
    expect(normalizeDuration(61)).toBe(75);
    expect(formatDuration(0)).toBe("-");
    expect(formatDuration(45)).toBe("45분");
    expect(formatDuration(120)).toBe("2시간");
    expect(formatDuration(135)).toBe("2시간 15분");
  });

  it("detects overlaps while allowing an ignored slot", () => {
    const slots = [createSlot({ slotId: "a", startTime: "09:00", endTime: "10:00" })];

    expect(
      hasTimeOverlap({ endMinute: 570, slots, startMinute: 540 }),
    ).toBe(true);
    expect(
      hasTimeOverlap({
        endMinute: 570,
        ignoreSlotId: "a",
        slots,
        startMinute: 540,
      }),
    ).toBe(false);
  });

  it("validates invalid, out-of-range, overlapping, and valid ranges", () => {
    const slots = [createSlot({ slotId: "a", startTime: "09:00", endTime: "10:00" })];

    expect(validateTimeRange({ endMinute: 540, slots, startMinute: 540 })).toBe(
      "종료 시간은 시작 시간보다 뒤여야 합니다.",
    );
    expect(validateTimeRange({ endMinute: 1500, slots, startMinute: 1440 })).toBe(
      "시간표 범위 안에서 배치해 주세요.",
    );
    expect(validateTimeRange({ endMinute: 570, slots, startMinute: 540 })).toBe(
      "이미 배치된 시간과 겹칩니다. 빈 시간대에 놓아 주세요.",
    );
    expect(validateTimeRange({ endMinute: 660, slots, startMinute: 600 })).toBeNull();
  });

  it("formats slots and derives timeline labels", () => {
    const slot = createSlot({ startTime: "08:30:00", endTime: "09:45:00" });
    const timetable: Timetable = {
      dailyPlanId: "daily-plan",
      slots: [slot, createSlot({ slotId: "earlier", startTime: "07:00", endTime: "08:00" })],
      timetableId: "timetable",
      topPickTotal: 0,
    };

    expect(getSlotDurationMinutes(slot)).toBe(75);
    expect(formatSlotRange(slot)).toBe("08:30 - 09:45");
    expect(formatMinuteRange(510, 585)).toBe("08:30 - 09:45");
    expect(formatSlotChipText({ endMinute: 585, height: 64, startMinute: 510 })).toBe(
      "08:30 - 09:45",
    );
    expect(getSortedSlots(timetable).map((item) => item.slotId)).toEqual([
      "earlier",
      "slot",
    ]);
    expect(getTimelineRange(timetable.slots)).toEqual({ endHour: 24, startHour: 0 });
    expect(getHourLabels(7, 9)).toEqual(["07:00", "08:00", "09:00"]);
  });
});
