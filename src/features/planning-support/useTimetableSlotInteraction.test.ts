import { calculateSlotInteractionCandidate } from "./useTimetableSlotInteraction";

describe("calculateSlotInteractionCandidate", () => {
  const baseInteraction = {
    mode: "move" as const,
    originY: 100,
    originalEndMinute: 600,
    originalStartMinute: 540,
    slotId: "slot-1",
  };

  it("snaps moves and clamps them to the timeline", () => {
    expect(
      calculateSlotInteractionCandidate({
        clientY: 132,
        interaction: baseInteraction,
        timelineEndMinute: 1440,
        timelineStartMinute: 0,
      }),
    ).toEqual({ endMinute: 630, startMinute: 570 });

    expect(
      calculateSlotInteractionCandidate({
        clientY: -2000,
        interaction: baseInteraction,
        timelineEndMinute: 1440,
        timelineStartMinute: 0,
      }),
    ).toEqual({ endMinute: 60, startMinute: 0 });
  });

  it("keeps resized slots at least one snap step long", () => {
    expect(
      calculateSlotInteractionCandidate({
        clientY: 1000,
        interaction: { ...baseInteraction, mode: "resizeStart" },
        timelineEndMinute: 1440,
        timelineStartMinute: 0,
      }),
    ).toEqual({ endMinute: 600, startMinute: 585 });
  });
});
