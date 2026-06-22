import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { TimetableSlot } from "../core-loop/types";
import {
  clamp,
  hasTimeOverlap,
  hourRowHeight,
  minSlotMinutes,
  minutesToTimeInput,
  normalizeTimeInput,
  snapToStep,
  validateTimeRange,
} from "./timetableUtils";

export type SlotInteraction = {
  mode: "move" | "resizeEnd" | "resizeStart";
  originY: number;
  originalEndMinute: number;
  originalStartMinute: number;
  slotId: string;
};

export type SlotPreview = {
  endMinute: number;
  slotId: string;
  startMinute: number;
};

type DragPreview = SlotPreview & {
  blocked: boolean;
};

type RescheduleRequest = {
  endTime: string;
  slotId: string;
  startTime: string;
};

type UseTimetableSlotInteractionOptions = {
  applySlotDomPosition: (preview: SlotPreview) => void;
  clearDraggingDomState: (slotId: string) => void;
  onError: (message: string) => void;
  onReschedule: (request: RescheduleRequest) => void;
  resetSlotDom: (slot: TimetableSlot) => void;
  setDraggingDomState: (slotId: string, blocked: boolean) => void;
  slots: TimetableSlot[];
  timelineEndMinute: number;
  timelineStartMinute: number;
};

export function calculateSlotInteractionCandidate({
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

export function useTimetableSlotInteraction({
  applySlotDomPosition,
  clearDraggingDomState,
  onError,
  onReschedule,
  resetSlotDom,
  setDraggingDomState,
  slots,
  timelineEndMinute,
  timelineStartMinute,
}: UseTimetableSlotInteractionOptions) {
  const dragFrameRef = useRef<number | null>(null);
  const dragPreviewRef = useRef<DragPreview | null>(null);
  const pendingPointerYRef = useRef<number | null>(null);
  const [interaction, setInteraction] = useState<SlotInteraction | null>(null);

  const beginSlotInteraction = useCallback(
    (nextInteraction: SlotInteraction) => {
      dragPreviewRef.current = {
        blocked: false,
        endMinute: nextInteraction.originalEndMinute,
        slotId: nextInteraction.slotId,
        startMinute: nextInteraction.originalStartMinute,
      };
      setDraggingDomState(nextInteraction.slotId, false);
      setInteraction(nextInteraction);
    },
    [setDraggingDomState],
  );

  useEffect(() => {
    if (!interaction) {
      return undefined;
    }
    const activeInteraction = interaction;

    function updateInteractionPreview(clientY: number) {
      const candidate = calculateSlotInteractionCandidate({
        clientY,
        interaction: activeInteraction,
        timelineEndMinute,
        timelineStartMinute,
      });
      const overlap = hasTimeOverlap({
        endMinute: candidate.endMinute,
        ignoreSlotId: activeInteraction.slotId,
        slots,
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
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
      pendingPointerYRef.current = null;

      const candidate = calculateSlotInteractionCandidate({
        clientY: event.clientY,
        interaction: activeInteraction,
        timelineEndMinute,
        timelineStartMinute,
      });
      const error = validateTimeRange({
        endMinute: candidate.endMinute,
        ignoreSlotId: activeInteraction.slotId,
        slots,
        startMinute: candidate.startMinute,
      });
      const slot = slots.find(
        (candidateSlot) => candidateSlot.slotId === activeInteraction.slotId,
      );

      setInteraction(null);
      dragPreviewRef.current = null;

      if (!slot) {
        clearDraggingDomState(activeInteraction.slotId);
        return;
      }

      if (error) {
        resetSlotDom(slot);
        onError(error);
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

      clearDraggingDomState(slot.slotId);
      onReschedule({
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
      clearDraggingDomState(activeInteraction.slotId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    applySlotDomPosition,
    clearDraggingDomState,
    interaction,
    onError,
    onReschedule,
    resetSlotDom,
    setDraggingDomState,
    slots,
    timelineEndMinute,
    timelineStartMinute,
  ]);

  return { beginSlotInteraction };
}
