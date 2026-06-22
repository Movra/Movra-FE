import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type FormEvent,
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";

import characterDefault from "../assets/auth/character-default.webp";
import characterFocus from "../assets/auth/character-focus.webp";
import characterSuccess from "../assets/auth/character-success.webp";
import { useAuth } from "../features/auth/useAuth";
import { AppSidebar } from "../features/core-loop/AppSidebar";
import {
  createStudyRoom,
  getMyParticipations,
  getPublicStudyRooms,
  getStudyRoom,
  getStudyRoomInviteCode,
  getStudyRoomParticipants,
  joinStudyRoom,
  joinStudyRoomByInvite,
  kickStudyRoomParticipant,
  leaveStudyRoom,
  reissueStudyRoomInviteCode,
  startStudyRoomFocus,
  switchStudyRoomBreak,
} from "../features/study-room/api";
import type {
  CreateStudyRoomResponse,
  MyParticipation,
  RoomVisibility,
  SessionMode,
  StudyRoomDetail,
  StudyRoomParticipant,
  StudyRoomSummary,
} from "../features/study-room/types";
import { getErrorMessage } from "../shared/api/errors";
import { queryKeys } from "../shared/queryKeys";
import { PageHeader } from "../shared/ui/PageHeader";
import styles from "./StudyRoomPage.module.css";

const StudyRoomChatPanel = lazy(() =>
  import("../features/study-room/StudyRoomChatPanel").then((module) => ({
    default: module.StudyRoomChatPanel,
  })),
);

type CreateRoomForm = {
  name: string;
  visibility: RoomVisibility;
};

type PrivateJoinForm = {
  inviteCode: string;
};

type CreatedRoom = CreateStudyRoomResponse & {
  name: string;
  visibility: RoomVisibility;
};

type StudyRoomRouteMode = "create" | "home" | "join" | "room";

const publicRoomsKey = queryKeys.studyRooms();
const myParticipationsKey = queryKeys.studyRoomMyParticipations();

const sessionModeLabels: Record<SessionMode, string> = {
  ENDED: "종료",
  FOCUS: "집중",
  REST: "휴식",
  WAITING: "대기",
};
const emptyPublicRooms: StudyRoomSummary[] = [];
const emptyMyParticipations: MyParticipation[] = [];
const unknownRoomName = "참여 중인 방";
const actionNoticeDurationMs = 3000;

function getRoomPath(roomId: string) {
  return `/study-room/rooms/${encodeURIComponent(roomId)}`;
}

function getRouteMode(pathname: string, roomId: string): StudyRoomRouteMode {
  if (roomId) {
    return "room";
  }

  if (pathname.endsWith("/create")) {
    return "create";
  }

  if (pathname.endsWith("/join")) {
    return "join";
  }

  return "home";
}

function getPageCopy(routeMode: StudyRoomRouteMode, selectedRoomName?: string) {
  if (routeMode === "create") {
    return {
      description: "방 이름과 공개 범위를 정하고 새 집중방을 만듭니다.",
      title: "방 만들기",
    };
  }

  if (routeMode === "join") {
    return {
      description: "공개방을 둘러보고, 초대받은 비공개방도 여기서 입장합니다.",
      title: "공개방 확인하기",
    };
  }

  if (routeMode === "room") {
    return {
      description: "참여 중인 방의 멤버 상태, 집중 전환, 메시지를 확인합니다.",
      title: selectedRoomName ?? "방 입장하기",
    };
  }

  return {
    description: "만들기, 참여하기, 입장하기를 나누어 필요한 흐름만 선택합니다.",
    title: "스터디룸",
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}

function getRoomName({
  createdRoom,
  publicRooms,
  roomId,
  selectedRoom,
}: {
  createdRoom: CreatedRoom | null;
  publicRooms: StudyRoomSummary[];
  roomId: string;
  selectedRoom?: Pick<StudyRoomDetail, "name" | "roomId"> | null;
}) {
  if (selectedRoom?.roomId === roomId) {
    return selectedRoom.name;
  }

  if (createdRoom?.roomId === roomId) {
    return createdRoom.name;
  }

  return publicRooms.find((room) => room.roomId === roomId)?.name ?? unknownRoomName;
}

function sortParticipants(participants: StudyRoomParticipant[]) {
  return [...participants].sort(
    (left, right) => Date.parse(left.joinedAt) - Date.parse(right.joinedAt),
  );
}

function getSelectedParticipation(
  participations: MyParticipation[],
  roomId: string,
) {
  return (
    participations.find((participation) => participation.roomId === roomId) ?? null
  );
}

function getNewParticipationRoomId(
  previousRoomIds: string[],
  nextParticipations: MyParticipation[],
) {
  const previousRoomIdSet = new Set(previousRoomIds);
  const newRoomIds = nextParticipations
    .map((participation) => participation.roomId)
    .filter((roomId) => !previousRoomIdSet.has(roomId));

  return newRoomIds.length === 1 ? newRoomIds[0] : null;
}

function getCurrentParticipant(
  participants: StudyRoomParticipant[],
  selectedParticipation: MyParticipation | null,
) {
  if (!selectedParticipation) {
    return null;
  }

  return (
    participants.find(
      (participant) =>
        participant.participantId === selectedParticipation.participantId,
    ) ?? null
  );
}

function formatFocusClock(totalSeconds: number) {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getParticipantFocusSeconds({
  currentUserId,
  localFocusStartedAt,
  now,
  participant,
}: {
  currentUserId: string | null;
  localFocusStartedAt: number | null;
  now: number;
  participant: StudyRoomParticipant;
}) {
  if (participant.sessionMode !== "FOCUS") {
    return null;
  }

  if (participant.userId === currentUserId && localFocusStartedAt) {
    return Math.max(0, Math.floor((now - localFocusStartedAt) / 1000));
  }

  if (participant.focusStartedAt) {
    const focusStartedAt = Date.parse(participant.focusStartedAt);

    if (Number.isFinite(focusStartedAt)) {
      // Guard against clock skew producing a negative elapsed value.
      return Math.max(0, Math.floor((now - focusStartedAt) / 1000));
    }
  }

  return typeof participant.focusElapsedSeconds === "number"
    ? participant.focusElapsedSeconds
    : null;
}

function useSecondTicker(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [enabled]);

  return now;
}

const StudyRoomFocusClock = memo(function StudyRoomFocusClock({
  currentUserId,
  localFocusStartedAt,
  participant,
}: {
  currentUserId: string | null;
  localFocusStartedAt: number | null;
  participant: StudyRoomParticipant;
}) {
  const now = useSecondTicker(participant.sessionMode === "FOCUS");
  const focusSeconds = getParticipantFocusSeconds({
    currentUserId,
    localFocusStartedAt,
    now,
    participant,
  });

  return <>{focusSeconds === null ? "집중 시간 동기화 대기" : formatFocusClock(focusSeconds)}</>;
});

const ParticipantFocusStatus = memo(function ParticipantFocusStatus({
  currentUserId,
  localFocusStartedAt,
  participant,
}: {
  currentUserId: string | null;
  localFocusStartedAt: number | null;
  participant: StudyRoomParticipant;
}) {
  const now = useSecondTicker(participant.sessionMode === "FOCUS");

  if (participant.sessionMode !== "FOCUS") {
    return <>{`${sessionModeLabels[participant.sessionMode]} 상태`}</>;
  }

  const focusSeconds = getParticipantFocusSeconds({
    currentUserId,
    localFocusStartedAt,
    now,
    participant,
  });

  return (
    <>
      {focusSeconds === null
        ? "집중 시간 동기화 대기"
        : `집중 ${formatFocusClock(focusSeconds)}`}
    </>
  );
});

function getStatusClassName(sessionMode: SessionMode) {
  return [styles.statusPill, styles[`status${sessionMode}`]]
    .filter(Boolean)
    .join(" ");
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

function inferRoomVisibility({
  createdRoom,
  publicRooms,
  selectedRoom,
}: {
  createdRoom: CreatedRoom | null;
  publicRooms: StudyRoomSummary[];
  selectedRoom: StudyRoomDetail | null;
}): RoomVisibility | null {
  if (!selectedRoom) {
    return null;
  }

  if (selectedRoom.visibility) {
    return selectedRoom.visibility;
  }

  if (createdRoom?.roomId === selectedRoom.roomId) {
    return createdRoom.visibility;
  }

  return publicRooms.some((room) => room.roomId === selectedRoom.roomId)
    ? "PUBLIC"
    : "PRIVATE";
}

export function StudyRoomPage() {
  const { accessToken, logout } = useAuth();
  const token = accessToken ?? "";
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId: routeRoomIdParam } = useParams();
  const routeRoomId = routeRoomIdParam ?? "";
  const routeMode = getRouteMode(location.pathname, routeRoomId);
  const [localFocusStartedAtByRoom, setLocalFocusStartedAtByRoom] = useState<
    Record<string, number>
  >({});
  const [createForm, setCreateForm] = useState<CreateRoomForm>({
    name: "",
    visibility: "PUBLIC",
  });
  const [privateJoinForm, setPrivateJoinForm] = useState<PrivateJoinForm>({
    inviteCode: "",
  });
  const [createdRoom, setCreatedRoom] = useState<CreatedRoom | null>(null);
  const [inviteModalRoom, setInviteModalRoom] = useState<CreatedRoom | null>(
    null,
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteJoinModalOpen, setInviteJoinModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [toastId, setToastId] = useState(0);

  function showNotice(message: string) {
    setActionError(null);
    setActionNotice(message);
    // Bump the id so the auto-dismiss timer re-arms even when the same
    // message is shown twice in a row.
    setToastId((current) => current + 1);
  }

  const joinedRoomIdsRef = useRef<Set<string>>(new Set());
  const leavingRoomIdsRef = useRef<Set<string>>(new Set());
  const redirectedRoomRemovalIdsRef = useRef<Set<string>>(new Set());

  const publicRoomsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: ({ signal }) => getPublicStudyRooms({ signal, token }),
    queryKey: publicRoomsKey,
  });
  const myParticipationsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: ({ signal }) => getMyParticipations({ signal, token }),
    queryKey: myParticipationsKey,
  });
  const publicRooms = publicRoomsQuery.data ?? emptyPublicRooms;
  const myParticipations = myParticipationsQuery.data ?? emptyMyParticipations;
  const selectedParticipation = getSelectedParticipation(
    myParticipations,
    routeRoomId,
  );
  const selectedRoomKey = queryKeys.studyRoom(routeRoomId);
  const selectedParticipantsKey = queryKeys.studyRoomParticipants(routeRoomId);
  const selectedRoomQuery = useQuery({
    enabled: Boolean(token && routeRoomId),
    queryFn: ({ signal }) => getStudyRoom({ roomId: routeRoomId, signal, token }),
    queryKey: selectedRoomKey,
  });
  const participantsQuery = useQuery({
    enabled: Boolean(token && routeRoomId),
    queryFn: ({ signal }) => getStudyRoomParticipants({ roomId: routeRoomId, signal, token }),
    queryKey: selectedParticipantsKey,
  });
  const selectedRoom = selectedRoomQuery.data ?? null;
  const selectedParticipants = useMemo(
    () =>
      sortParticipants(
        participantsQuery.data ?? selectedRoomQuery.data?.participants ?? [],
      ),
    [participantsQuery.data, selectedRoomQuery.data?.participants],
  );
  const detailError = selectedRoomQuery.error ?? participantsQuery.error;
  const detailLoading =
    Boolean(routeRoomId) &&
    (selectedRoomQuery.isLoading || participantsQuery.isLoading);
  const currentParticipant = getCurrentParticipant(
    selectedParticipants,
    selectedParticipation,
  );
  const currentUserId = currentParticipant?.userId ?? null;
  const isSelectedRoomLeader = Boolean(
    selectedRoom && currentUserId && selectedRoom.leaderUserId === currentUserId,
  );
  const selectedRoomVisibility = inferRoomVisibility({
    createdRoom,
    publicRooms,
    selectedRoom,
  });
  const selectedSessionMode = selectedParticipation?.sessionMode ?? null;
  const canStartFocus =
    selectedSessionMode !== null &&
    selectedSessionMode !== "FOCUS" &&
    selectedSessionMode !== "ENDED";
  const canSwitchBreak =
    selectedSessionMode === "WAITING" || selectedSessionMode === "FOCUS";
  const canLeaveRoom =
    selectedSessionMode !== null && selectedSessionMode !== "ENDED";
  const canShowInviteCode =
    isSelectedRoomLeader && selectedRoomVisibility === "PRIVATE";

  useEffect(() => {
    if (routeMode === "create") {
      setCreateModalOpen(true);
    }
  }, [routeMode]);

  useEffect(() => {
    setMemberModalOpen(false);
  }, [routeRoomId]);

  useEffect(() => {
    if (!actionNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(
      () => setActionNotice(null),
      actionNoticeDurationMs,
    );
    return () => window.clearTimeout(timeoutId);
  }, [actionNotice, toastId]);

  function closeCreateModal() {
    setCreateModalOpen(false);

    if (routeMode === "create") {
      navigate("/study-room");
    }
  }

  function openInviteJoinModal() {
    setActionError(null);
    setInviteJoinModalOpen(true);
  }

  function closeInviteJoinModal() {
    setInviteJoinModalOpen(false);
    setPrivateJoinForm({ inviteCode: "" });
  }

  async function refreshStudyRooms(roomId = routeRoomId) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: publicRoomsKey }),
      queryClient.invalidateQueries({ queryKey: myParticipationsKey }),
      roomId
        ? queryClient.invalidateQueries({
            queryKey: queryKeys.studyRoom(roomId),
          })
        : Promise.resolve(),
      roomId
        ? queryClient.invalidateQueries({
            queryKey: queryKeys.studyRoomParticipants(roomId),
          })
        : Promise.resolve(),
    ]);
  }

  const redirectAfterRoomRemoval = useCallback(
    (roomId: string) => {
      if (redirectedRoomRemovalIdsRef.current.has(roomId)) {
        return;
      }

      redirectedRoomRemovalIdsRef.current.add(roomId);
      queryClient.setQueryData<MyParticipation[]>(
        myParticipationsKey,
        (current) =>
          current?.filter((participation) => participation.roomId !== roomId) ??
          current,
      );
      setLocalFocusStartedAtByRoom((current) => {
        const next = { ...current };
        delete next[roomId];
        return next;
      });
      setMemberModalOpen(false);
      showNotice("방에서 내보내졌어요.");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.studyRoomParticipants(roomId),
      });
      queryClient.removeQueries({
        exact: true,
        queryKey: queryKeys.studyRoom(roomId),
      });
      navigate("/study-room", { replace: true });
    },
    [navigate, queryClient],
  );

  useEffect(() => {
    redirectedRoomRemovalIdsRef.current.clear();
    leavingRoomIdsRef.current.clear();
  }, [routeRoomId]);

  useEffect(() => {
    if (
      routeMode !== "room" ||
      !routeRoomId ||
      leavingRoomIdsRef.current.has(routeRoomId) ||
      detailLoading ||
      detailError ||
      !selectedRoom ||
      !selectedParticipation ||
      currentParticipant
    ) {
      return;
    }

    redirectAfterRoomRemoval(routeRoomId);
  }, [
    currentParticipant,
    detailError,
    detailLoading,
    redirectAfterRoomRemoval,
    routeMode,
    routeRoomId,
    selectedParticipation,
    selectedRoom,
  ]);

  useEffect(() => {
    if (
      routeMode !== "room" ||
      !routeRoomId ||
      leavingRoomIdsRef.current.has(routeRoomId) ||
      myParticipationsQuery.isLoading ||
      selectedParticipation ||
      !joinedRoomIdsRef.current.has(routeRoomId)
    ) {
      return;
    }

    redirectAfterRoomRemoval(routeRoomId);
  }, [
    myParticipationsQuery.isLoading,
    redirectAfterRoomRemoval,
    routeMode,
    routeRoomId,
    selectedParticipation,
  ]);

  useEffect(() => {
    if (!myParticipationsQuery.isSuccess) {
      return;
    }

    joinedRoomIdsRef.current = new Set(
      myParticipations.map((participation) => participation.roomId),
    );
  }, [myParticipations, myParticipationsQuery.isSuccess]);

  const createRoomMutation = useMutation({
    mutationFn: (values: CreateRoomForm) =>
      createStudyRoom({
        name: values.name,
        token,
        visibility: values.visibility,
      }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async (response, values) => {
      const inviteCode =
        values.visibility === "PRIVATE" ? response.inviteCode ?? null : null;
      const shouldOpenInviteModal = values.visibility === "PRIVATE";
      const nextCreatedRoom = {
        inviteCode,
        name: values.name,
        roomId: response.roomId,
        visibility: values.visibility,
      };

      showNotice("스터디룸을 만들었어요.");
      setCreatedRoom(nextCreatedRoom);
      setCreateModalOpen(false);
      setInviteModalRoom(shouldOpenInviteModal ? nextCreatedRoom : null);
      setInviteModalOpen(shouldOpenInviteModal);
      setCreateForm((current) => ({ ...current, name: "" }));
      await refreshStudyRooms(response.roomId);

      if (!shouldOpenInviteModal) {
        navigate(getRoomPath(response.roomId));
      }
    },
  });

  const joinRoomMutation = useMutation({
    mutationFn: ({
      inviteCode,
      roomId,
    }: {
      inviteCode?: string | null;
      roomId: string;
    }) => joinStudyRoom({ inviteCode, roomId, token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async (_result, values) => {
      showNotice("스터디룸에 참여했어요.");
      await refreshStudyRooms(values.roomId);
      navigate(getRoomPath(values.roomId));
    },
  });

  const inviteJoinMutation = useMutation({
    mutationFn: ({
      inviteCode,
    }: {
      inviteCode: string;
      previousRoomIds: string[];
    }) => joinStudyRoomByInvite({ inviteCode, token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async (_result, values) => {
      showNotice("초대 코드로 스터디룸에 참여했어요.");
      setInviteJoinModalOpen(false);
      setPrivateJoinForm({ inviteCode: "" });

      const refetchedParticipations = await myParticipationsQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: publicRoomsKey });
      const nextParticipations =
        refetchedParticipations.data ?? emptyMyParticipations;
      const joinedRoomId = getNewParticipationRoomId(
        values.previousRoomIds,
        nextParticipations,
      );

      if (joinedRoomId) {
        await refreshStudyRooms(joinedRoomId);
        navigate(getRoomPath(joinedRoomId));
        return;
      }

      await refreshStudyRooms();
      navigate("/study-room");
    },
  });

  const inviteCodeQueryMutation = useMutation({
    mutationFn: ({ roomId }: { name: string; roomId: string }) =>
      getStudyRoomInviteCode({ roomId, token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: (response, values) => {
      const nextInviteRoom: CreatedRoom = {
        inviteCode: response.inviteCode,
        name: values.name,
        roomId: values.roomId,
        visibility: "PRIVATE",
      };

      setActionError(null);
      setInviteModalRoom(nextInviteRoom);
      setInviteModalOpen(true);
      setCreatedRoom((current) =>
        current?.roomId === values.roomId ? nextInviteRoom : current,
      );
    },
  });

  const reissueInviteCodeMutation = useMutation({
    mutationFn: (roomId: string) =>
      reissueStudyRoomInviteCode({ roomId, token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: (response, roomId) => {
      showNotice("초대 코드를 다시 생성했어요.");
      setInviteModalRoom((current) =>
        current?.roomId === roomId
          ? { ...current, inviteCode: response.inviteCode }
          : current,
      );
      setCreatedRoom((current) =>
        current?.roomId === roomId
          ? { ...current, inviteCode: response.inviteCode }
          : current,
      );
    },
  });

  const leaveRoomMutation = useMutation({
    mutationFn: (roomId: string) => leaveStudyRoom({ roomId, token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async (_result, roomId) => {
      leavingRoomIdsRef.current.add(roomId);
      showNotice("스터디룸에서 나갔어요.");
      setLocalFocusStartedAtByRoom((current) => {
        const next = { ...current };
        delete next[roomId];
        return next;
      });
      await refreshStudyRooms(roomId);
      navigate("/study-room");
    },
  });

  const kickParticipantMutation = useMutation({
    mutationFn: ({
      roomId,
      targetUserId,
    }: {
      roomId: string;
      targetUserId: string;
    }) => kickStudyRoomParticipant({ roomId, targetUserId, token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async (_result, values) => {
      showNotice("참여자를 내보냈어요.");
      await refreshStudyRooms(values.roomId);
    },
  });

  const startFocusMutation = useMutation({
    mutationFn: (roomId: string) => startStudyRoomFocus({ roomId, token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async (_result, roomId) => {
      showNotice("집중 상태로 전환했어요.");
      setLocalFocusStartedAtByRoom((current) => ({
        ...current,
        [roomId]: Date.now(),
      }));
      await refreshStudyRooms(roomId);
    },
  });

  const switchBreakMutation = useMutation({
    mutationFn: (roomId: string) => switchStudyRoomBreak({ roomId, token }),
    onError: (error) => {
      setActionNotice(null);
      setActionError(getErrorMessage(error));
    },
    onSuccess: async (_result, roomId) => {
      showNotice("휴식 상태로 전환했어요.");
      setLocalFocusStartedAtByRoom((current) => {
        const next = { ...current };
        delete next[roomId];
        return next;
      });
      await refreshStudyRooms(roomId);
    },
  });

  if (publicRoomsQuery.isLoading || myParticipationsQuery.isLoading) {
    return (
      <section className={styles.studyRoomPage} aria-labelledby="study-room-title">
        <AppSidebar onLogout={logout} profileSubtitle="스터디룸" />
        <div className={styles.contentShell}>
          <section className={styles.centerState} aria-live="polite">
            <img src={characterDefault} alt="" aria-hidden="true" />
            <p>스터디룸을 불러오는 중입니다.</p>
          </section>
        </div>
      </section>
    );
  }

  const loadError = publicRoomsQuery.error ?? myParticipationsQuery.error;
  if (publicRoomsQuery.isError || myParticipationsQuery.isError) {
    return (
      <section className={styles.studyRoomPage} aria-labelledby="study-room-title">
        <AppSidebar onLogout={logout} profileSubtitle="스터디룸" />
        <div className={styles.contentShell}>
          <section className={styles.centerState} aria-live="assertive">
            <img src={characterDefault} alt="" aria-hidden="true" />
            <h1>스터디룸을 불러오지 못했습니다.</h1>
            <p>{loadError ? getErrorMessage(loadError) : "다시 시도해 주세요."}</p>
            <button
              onClick={() => {
                if (publicRoomsQuery.isError) {
                  void publicRoomsQuery.refetch();
                }
                if (myParticipationsQuery.isError) {
                  void myParticipationsQuery.refetch();
                }
              }}
              type="button"
            >
              다시 시도
            </button>
          </section>
        </div>
      </section>
    );
  }

  function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = createForm.name.trim();

    if (!name) {
      setActionNotice(null);
      setActionError("방 이름을 입력해 주세요.");
      return;
    }

    createRoomMutation.mutate({ name, visibility: createForm.visibility });
  }

  function handlePrivateJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const inviteCode = privateJoinForm.inviteCode.trim();

    if (!inviteCode) {
      setActionNotice(null);
      setActionError("초대 코드를 입력해 주세요.");
      return;
    }

    inviteJoinMutation.mutate({
      inviteCode,
      previousRoomIds: myParticipations.map((participation) => participation.roomId),
    });
  }

  function openSelectedRoomInviteCode() {
    if (
      !selectedRoom ||
      selectedRoomVisibility !== "PRIVATE" ||
      !isSelectedRoomLeader
    ) {
      return;
    }

    inviteCodeQueryMutation.mutate({
      name: selectedRoom.name,
      roomId: selectedRoom.roomId,
    });
  }

  async function handleCopyInviteInfo() {
    if (!inviteModalRoom) {
      return;
    }

    if (!navigator.clipboard) {
      setActionNotice(null);
      setActionError("브라우저에서 복사를 지원하지 않습니다.");
      return;
    }

    const inviteText = inviteModalRoom.inviteCode
      ? `초대 코드: ${inviteModalRoom.inviteCode}`
      : `방 ID: ${inviteModalRoom.roomId}`;

    try {
      await navigator.clipboard.writeText(inviteText);
      showNotice("초대 정보를 복사했어요.");
    } catch {
      setActionNotice(null);
      setActionError("초대 정보를 복사하지 못했습니다.");
    }
  }

  const sessionHeroLabel =
    selectedSessionMode === "FOCUS" && currentParticipant ? (
      <StudyRoomFocusClock
        currentUserId={currentUserId}
        localFocusStartedAt={
          routeRoomId ? localFocusStartedAtByRoom[routeRoomId] ?? null : null
        }
        participant={currentParticipant}
      />
    ) : selectedSessionMode === "REST" ? (
      "휴식 중"
    ) : selectedSessionMode ? (
      `${sessionModeLabels[selectedSessionMode]} 상태`
    ) : (
      "대기"
    );
  const sessionHeroDescription =
    selectedSessionMode === "FOCUS"
      ? "집중 시간이 흐르고 있습니다."
      : selectedSessionMode === "REST"
        ? "휴식 상태입니다. 지금은 채팅을 사용할 수 있습니다."
        : "집중을 시작하면 이 영역에서 시간이 크게 표시됩니다.";
  const visibleSelectedRoomName = selectedParticipation
    ? selectedRoom?.name
    : undefined;
  const pageCopy = getPageCopy(routeMode, visibleSelectedRoomName);
  const hasOpenModal =
    createModalOpen || inviteJoinModalOpen || inviteModalOpen || memberModalOpen;
  const shouldShowQuickNav = routeMode !== "home" && routeMode !== "create";
  const contentShellClassName =
    routeMode === "room"
      ? `${styles.contentShell} ${styles.roomContentShell}`
      : styles.contentShell;
  const quickNav = shouldShowQuickNav ? (
    <nav className={styles.quickNav} aria-label="스터디룸 빠른 이동">
      <NavLink
        className={({ isActive }) =>
          isActive
            ? `${styles.quickNavLink} ${styles.activeNavLink}`
            : styles.quickNavLink
        }
        end
        to="/study-room"
      >
        내 스터디룸
      </NavLink>
      <NavLink
        className={({ isActive }) =>
          isActive
            ? `${styles.quickNavLink} ${styles.activeNavLink}`
            : styles.quickNavLink
        }
        to="/study-room/join"
      >
        공개방 확인
      </NavLink>
    </nav>
  ) : null;

  return (
    <section className={styles.studyRoomPage} aria-labelledby="study-room-title">
      <AppSidebar
        ariaHidden={hasOpenModal}
        onLogout={logout}
        profileSubtitle={visibleSelectedRoomName ?? "스터디룸"}
      />

      <div
        className={contentShellClassName}
        aria-hidden={hasOpenModal ? true : undefined}
      >
        <main className={styles.studyMain}>
          <PageHeader
            className={styles.pageHeader}
            description={pageCopy.description}
            eyebrow="StudyRoom"
            title={pageCopy.title}
            titleId="study-room-title"
            actions={
              routeMode === "room" ? quickNav : (
                <div className={styles.headerStats} aria-label="스터디룸 요약">
                  <article>
                    <span>공개방</span>
                    <strong>{publicRooms.length}</strong>
                  </article>
                  <article>
                    <span>내 참여</span>
                    <strong>{myParticipations.length}</strong>
                  </article>
                </div>
              )
            }
          />

          {routeMode !== "room" ? quickNav : null}

          {actionError ? (
            <p className={styles.error} role="alert">
              {actionError}
            </p>
          ) : null}

        {routeMode === "home" || routeMode === "create" ? (
          <div className={styles.overviewGrid}>
            <section
              className={styles.overviewHero}
              aria-labelledby="study-room-overview-title"
            >
              <div className={styles.overviewHeroCopy}>
                <span className={styles.panelEyebrow}>Room Flow</span>
                <h2 id="study-room-overview-title">함께 공부할 방을 빠르게 고르세요.</h2>
                <p>
                  만들기, 참여하기, 입장하기가 분리되어 지금 필요한 행동만 바로
                  선택할 수 있습니다.
                </p>
                <div className={styles.heroActions}>
                  <button
                    className={styles.primaryButton}
                    onClick={() => setCreateModalOpen(true)}
                    type="button"
                  >
                    방 만들기
                  </button>
                  <NavLink className={styles.secondaryButton} to="/study-room/join">
                    공개방 확인하기
                  </NavLink>
                </div>
              </div>
              <div className={styles.studyScene} aria-hidden="true">
                <div className={styles.sceneBoard}>
                  <span />
                  <span />
                  <span />
                </div>
                <img src={characterFocus} alt="" />
              </div>
            </section>

            <section className={styles.inviteEntryPanel} aria-labelledby="home-invite-title">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Invite</span>
                  <h2 id="home-invite-title">초대코드로 입장하기</h2>
                </div>
              </div>
              <p className={styles.inviteCtaText}>
                초대받은 코드를 입력하면 비공개 스터디룸에 바로 참여할 수 있습니다.
              </p>
              <button
                className={styles.secondaryButton}
                onClick={openInviteJoinModal}
                type="button"
              >
                초대 코드 입력
              </button>
            </section>
          </div>
        ) : null}

        {routeMode === "join" ? (
          <div className={styles.joinLayout}>
            <section className={styles.publicRoomsPanel} aria-labelledby="public-rooms-title">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Public</span>
                  <h2 id="public-rooms-title">공개방 목록</h2>
                </div>
                <button
                  className={styles.textButton}
                  onClick={() => void publicRoomsQuery.refetch()}
                  type="button"
                >
                  새로고침
                </button>
              </div>
              {publicRooms.length === 0 ? (
                <div className={styles.emptyState}>
                  <img src={characterDefault} alt="" aria-hidden="true" />
                  <p>아직 공개방이 없습니다.</p>
                </div>
              ) : (
                <ul className={styles.publicRoomGrid}>
                  {publicRooms.map((room) => {
                    const alreadyJoined = myParticipations.some(
                      (participation) => participation.roomId === room.roomId,
                    );

                    return (
                      <li className={styles.publicRoomCard} key={room.roomId}>
                        <span className={styles.roomAvatar} aria-hidden="true">
                          {getInitial(room.name)}
                        </span>
                        <div>
                          <strong>{room.name}</strong>
                          <span>공개 · 생성 {formatDateTime(room.createdAt)}</span>
                        </div>
                        {alreadyJoined ? (
                          <NavLink
                            className={styles.secondaryButton}
                            to={getRoomPath(room.roomId)}
                          >
                            입장하기
                          </NavLink>
                        ) : (
                          <button
                            className={styles.primaryButton}
                            disabled={joinRoomMutation.isPending}
                            onClick={() =>
                              joinRoomMutation.mutate({
                                inviteCode: null,
                                roomId: room.roomId,
                              })
                            }
                            type="button"
                          >
                            참여하기
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className={styles.privateJoinPanel} aria-labelledby="private-join-title">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Invite</span>
                  <h2 id="private-join-title">초대 코드로 참여</h2>
                </div>
              </div>
              <div className={styles.invitePreview} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p className={styles.inviteCtaText}>
                방 ID 없이 초대 코드만 입력해 비공개방에 입장합니다.
              </p>
              <button
                className={styles.secondaryButton}
                onClick={openInviteJoinModal}
                type="button"
              >
                초대 코드 입력
              </button>
            </section>
          </div>
        ) : null}

          {routeMode === "room" ? (
          <div className={styles.roomPageGrid}>
            {!selectedParticipation && !detailLoading ? (
              <section className={styles.emptyState} aria-live="polite">
                <img src={characterDefault} alt="" aria-hidden="true" />
                <h2>입장할 수 있는 방이 아닙니다.</h2>
                <p>먼저 공개방에 참여하거나 초대 코드로 참여해 주세요.</p>
                <NavLink className={styles.primaryButton} to="/study-room/join">
                  참여하러 가기
                </NavLink>
              </section>
            ) : detailLoading ? (
              <section className={styles.centerState} aria-live="polite">
                <p>참여 중인 방을 불러오는 중입니다.</p>
              </section>
            ) : detailError ? (
              <section className={styles.inlineError} role="alert">
                <strong>참여 중인 방 정보를 불러오지 못했습니다.</strong>
                <span>{getErrorMessage(detailError)}</span>
              </section>
            ) : selectedRoom && selectedParticipation ? (
              <>
                <section
                  className={styles.focusWorkspace}
                  aria-labelledby="session-stage-title"
                >
                  <div className={styles.focusStateBoard}>
                    <div className={styles.focusStateCopy}>
                      <span>{sessionModeLabels[selectedParticipation.sessionMode]}</span>
                      <h2 id="session-stage-title">{sessionHeroLabel}</h2>
                      <p>{sessionHeroDescription}</p>
                    </div>

                    <div className={styles.focusStateActions} aria-label="스터디룸 행동">
                      {canStartFocus ? (
                        <button
                          className={`${styles.roomActionButton} ${styles.roomActionPrimary}`}
                          disabled={startFocusMutation.isPending}
                          onClick={() => startFocusMutation.mutate(selectedRoom.roomId)}
                          type="button"
                        >
                          집중 시작하기
                        </button>
                      ) : null}
                      {canSwitchBreak ? (
                        <button
                          className={styles.roomActionButton}
                          disabled={switchBreakMutation.isPending}
                          onClick={() => switchBreakMutation.mutate(selectedRoom.roomId)}
                          type="button"
                        >
                          휴식 전환
                        </button>
                      ) : null}
                      {canLeaveRoom ? (
                        <button
                          className={`${styles.roomActionButton} ${styles.roomActionDanger}`}
                          disabled={leaveRoomMutation.isPending}
                          onClick={() => leaveRoomMutation.mutate(selectedRoom.roomId)}
                          type="button"
                        >
                          방 나가기
                        </button>
                      ) : null}
                      {canShowInviteCode ? (
                        <button
                          className={styles.roomActionButton}
                          disabled={inviteCodeQueryMutation.isPending}
                          onClick={openSelectedRoomInviteCode}
                          type="button"
                        >
                          초대 코드 조회/생성
                        </button>
                      ) : null}
                      <button
                        className={`${styles.roomActionButton} ${styles.roomMemberButton}`}
                        onClick={() => setMemberModalOpen(true)}
                        type="button"
                      >
                        멤버 조회하기
                      </button>
                    </div>
                  </div>
                </section>

                <div className={styles.roomChatSlot}>
                  <Suspense fallback={null}>
                    <StudyRoomChatPanel
                      roomId={selectedRoom.roomId}
                      sessionMode={selectedParticipation.sessionMode}
                      token={token}
                    />
                  </Suspense>
                </div>
              </>
            ) : null}
          </div>
          ) : null}
        </main>

        <aside
          className={styles.joinedRoomsRail}
          aria-labelledby="joined-rooms-title"
        >
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>Joined</span>
              <h2 id="joined-rooms-title">내가 참여한 방</h2>
            </div>
          </div>
          {myParticipations.length === 0 ? (
            <div className={styles.joinedRoomsEmpty}>
              <p>아직 입장할 스터디룸이 없습니다.</p>
              <NavLink className={styles.secondaryButton} to="/study-room/join">
                공개방 확인
              </NavLink>
            </div>
          ) : (
            <ul className={styles.joinedRoomList}>
              {myParticipations.map((participation) => {
                const roomName = getRoomName({
                  createdRoom,
                  publicRooms,
                  roomId: participation.roomId,
                  selectedRoom,
                });

                return (
                  <li key={participation.participantId}>
                    <span className={styles.roomAvatar} aria-hidden="true">
                      {getInitial(roomName)}
                    </span>
                    <div>
                      <strong>{roomName}</strong>
                      <span>
                        {sessionModeLabels[participation.sessionMode]} ·{" "}
                        {formatDateTime(participation.joinedAt)}
                      </span>
                    </div>
                    <NavLink
                      className={({ isActive }) =>
                        isActive
                          ? `${styles.textButton} ${styles.activeRoomLink}`
                          : styles.textButton
                      }
                      to={getRoomPath(participation.roomId)}
                    >
                      입장
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      {actionNotice ? (
        <div className={styles.actionToast} role="status" aria-live="polite">
          {actionNotice}
        </div>
      ) : null}

      {memberModalOpen && selectedRoom && selectedParticipation ? (
        <div className={styles.modalBackdrop}>
          <section
            className={`${styles.inviteModal} ${styles.memberModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-modal-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.panelEyebrow}>Members</span>
                <h2 id="member-modal-title">방 멤버</h2>
              </div>
              <button
                className={styles.iconButton}
                onClick={() => setMemberModalOpen(false)}
                type="button"
                aria-label="멤버 조회 모달 닫기"
              >
                ×
              </button>
            </div>

            {actionError ? (
              <p className={styles.error} role="alert">
                {actionError}
              </p>
            ) : null}

            <ul className={`${styles.participantList} ${styles.memberModalList}`}>
              {selectedParticipants.map((participant) => (
                  <li
                    className={
                      participant.userId === currentUserId
                        ? styles.currentParticipantRow
                        : undefined
                    }
                    key={participant.participantId}
                  >
                    <span
                      className={`${styles.memberAvatar} ${
                        styles[`member${participant.sessionMode}`]
                      }`}
                      aria-hidden="true"
                    >
                      {getInitial(participant.participantName)}
                    </span>
                    <div>
                      <strong>{participant.participantName}</strong>
                      <span>
                        <ParticipantFocusStatus
                          currentUserId={currentUserId}
                          localFocusStartedAt={
                            localFocusStartedAtByRoom[selectedRoom.roomId] ?? null
                          }
                          participant={participant}
                        />
                      </span>
                    </div>
                    <span className={getStatusClassName(participant.sessionMode)}>
                      {sessionModeLabels[participant.sessionMode]}
                    </span>
                    {isSelectedRoomLeader && participant.userId !== currentUserId ? (
                      <button
                        className={styles.textButton}
                        disabled={kickParticipantMutation.isPending}
                        onClick={() =>
                          kickParticipantMutation.mutate({
                            roomId: selectedRoom.roomId,
                            targetUserId: participant.userId,
                          })
                        }
                        type="button"
                      >
                        내보내기
                      </button>
                    ) : null}
                  </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {createModalOpen ? (
        <div className={styles.modalBackdrop}>
          <section
            className={styles.inviteModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-room-modal-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.panelEyebrow}>Create</span>
                <h2 id="create-room-modal-title">스터디룸 만들기</h2>
              </div>
              <button
                className={styles.iconButton}
                onClick={closeCreateModal}
                type="button"
                aria-label="방 만들기 모달 닫기"
              >
                ×
              </button>
            </div>

            <div className={styles.createPreview} aria-hidden="true">
              <img src={characterSuccess} alt="" />
              <div>
                <span>PUBLIC</span>
                <strong>공개방 목록에 바로 노출</strong>
              </div>
              <div>
                <span>PRIVATE</span>
                <strong>초대 코드로만 입장</strong>
              </div>
            </div>

            <form className={styles.form} onSubmit={handleCreateRoom}>
              <label className={styles.field} htmlFor="study-room-name">
                방 이름
                <input
                  id="study-room-name"
                  maxLength={20}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="예: 저녁 집중방"
                  value={createForm.name}
                />
              </label>
              <div
                className={styles.segmentedControl}
                role="group"
                aria-label="방 공개 범위"
              >
                <button
                  aria-pressed={createForm.visibility === "PUBLIC"}
                  onClick={() =>
                    setCreateForm((current) => ({
                      ...current,
                      visibility: "PUBLIC",
                    }))
                  }
                  type="button"
                >
                  공개
                </button>
                <button
                  aria-pressed={createForm.visibility === "PRIVATE"}
                  onClick={() =>
                    setCreateForm((current) => ({
                      ...current,
                      visibility: "PRIVATE",
                    }))
                  }
                  type="button"
                >
                  비공개
                </button>
              </div>
              <button
                className={styles.primaryButton}
                disabled={createRoomMutation.isPending}
                type="submit"
              >
                방 만들기
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {inviteJoinModalOpen ? (
        <div className={styles.modalBackdrop}>
          <section
            className={styles.inviteModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-join-modal-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.panelEyebrow}>Invite</span>
                <h2 id="invite-join-modal-title">초대 코드로 입장하기</h2>
              </div>
              <button
                className={styles.iconButton}
                onClick={closeInviteJoinModal}
                type="button"
                aria-label="초대 코드 입장 모달 닫기"
              >
                ×
              </button>
            </div>

            <form className={styles.form} onSubmit={handlePrivateJoin}>
              <label className={styles.field} htmlFor="invite-join-code">
                초대 코드
                <input
                  id="invite-join-code"
                  onChange={(event) =>
                    setPrivateJoinForm({ inviteCode: event.target.value })
                  }
                  placeholder="초대 코드 입력"
                  value={privateJoinForm.inviteCode}
                />
              </label>
              {actionError ? (
                <p className={styles.error} role="alert">
                  {actionError}
                </p>
              ) : null}
              <button
                className={styles.primaryButton}
                disabled={inviteJoinMutation.isPending}
                type="submit"
              >
                입장하기
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {inviteModalOpen && inviteModalRoom ? (
        <div className={styles.modalBackdrop}>
          <section
            className={styles.inviteModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.panelEyebrow}>Invite</span>
                <h2 id="invite-modal-title">
                  {inviteModalRoom.visibility === "PRIVATE"
                    ? "초대 코드를 확인하세요"
                    : "방이 만들어졌어요"}
                </h2>
              </div>
              <button
                className={styles.iconButton}
                onClick={() => setInviteModalOpen(false)}
                type="button"
                aria-label="초대 코드 모달 닫기"
              >
                ×
              </button>
            </div>

            <dl className={styles.inviteDetails}>
              <div>
                <dt>방 이름</dt>
                <dd>{inviteModalRoom.name}</dd>
              </div>
            </dl>

            {inviteModalRoom.inviteCode ? (
              <div className={styles.inviteCodeBox}>
                <span>초대 코드</span>
                <strong>{inviteModalRoom.inviteCode}</strong>
              </div>
            ) : (
              <p className={styles.emptyText}>
                {inviteModalRoom.visibility === "PRIVATE"
                  ? "초대 코드를 조회하지 못했습니다. 새로 생성해 주세요."
                  : "공개방은 공개방 참여 화면에서 바로 찾을 수 있습니다."}
              </p>
            )}

            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => void handleCopyInviteInfo()}
                type="button"
              >
                초대 정보 복사
              </button>
              {inviteModalRoom.visibility === "PRIVATE" ? (
                <button
                  className={styles.secondaryButton}
                  disabled={reissueInviteCodeMutation.isPending}
                  onClick={() =>
                    reissueInviteCodeMutation.mutate(inviteModalRoom.roomId)
                  }
                  type="button"
                >
                  {inviteModalRoom.inviteCode
                    ? "초대 코드 재생성"
                    : "초대 코드 생성"}
                </button>
              ) : null}
              <button
                className={styles.primaryButton}
                onClick={() => {
                  setInviteModalOpen(false);
                  navigate(getRoomPath(inviteModalRoom.roomId));
                }}
                type="button"
              >
                방 입장하기
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
