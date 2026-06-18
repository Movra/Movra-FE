import { apiRequest } from "../../shared/api/client";
import type {
  CreateStudyRoomResponse,
  MyParticipation,
  RoomVisibility,
  StudyRoomDetail,
  StudyRoomInviteCodeResponse,
  StudyRoomParticipant,
  StudyRoomSummary,
} from "./types";

type AuthenticatedRequest = {
  signal?: AbortSignal;
  token: string;
};

type StudyRoomRequest = AuthenticatedRequest & {
  roomId: string;
};

export type CreateStudyRoomRequest = AuthenticatedRequest & {
  name: string;
  visibility: RoomVisibility;
};

export type JoinStudyRoomRequest = StudyRoomRequest & {
  inviteCode?: string | null;
};

export type JoinStudyRoomByInviteRequest = AuthenticatedRequest & {
  inviteCode: string;
};

export type KickStudyRoomParticipantRequest = StudyRoomRequest & {
  targetUserId: string;
};

export async function createStudyRoom({
  name,
  token,
  visibility,
}: CreateStudyRoomRequest) {
  const response = await apiRequest<CreateStudyRoomResponse>("/rooms", {
    body: { name, visibility },
    method: "POST",
    token,
  });

  if (visibility === "PUBLIC") {
    return { roomId: response.roomId };
  }

  return response;
}

export function getPublicStudyRooms({ signal, token }: AuthenticatedRequest) {
  return apiRequest<StudyRoomSummary[]>("/rooms", { signal, token });
}

export function getStudyRoom({ roomId, signal, token }: StudyRoomRequest) {
  return apiRequest<StudyRoomDetail>(`/rooms/${roomId}`, { signal, token });
}

export function joinStudyRoom({
  inviteCode = null,
  roomId,
  token,
}: JoinStudyRoomRequest) {
  return apiRequest<void>("/rooms/join", {
    body: inviteCode ? { inviteCode, roomId } : { roomId },
    method: "POST",
    token,
  });
}

export function joinStudyRoomByInvite({
  inviteCode,
  token,
}: JoinStudyRoomByInviteRequest) {
  return apiRequest<void>("/rooms/join", {
    body: { inviteCode },
    method: "POST",
    token,
  });
}

export function leaveStudyRoom({ roomId, token }: StudyRoomRequest) {
  return apiRequest<void>(`/rooms/${roomId}/leave`, {
    method: "POST",
    token,
  });
}

export function getStudyRoomInviteCode({ roomId, signal, token }: StudyRoomRequest) {
  return apiRequest<StudyRoomInviteCodeResponse>(
    `/rooms/${roomId}/invite-code`,
    { signal, token },
  );
}

export function reissueStudyRoomInviteCode({ roomId, token }: StudyRoomRequest) {
  return apiRequest<StudyRoomInviteCodeResponse>(
    `/rooms/${roomId}/invite-code/reissue`,
    {
      method: "POST",
      token,
    },
  );
}

export function kickStudyRoomParticipant({
  roomId,
  targetUserId,
  token,
}: KickStudyRoomParticipantRequest) {
  return apiRequest<void>(`/rooms/${roomId}/participants/${targetUserId}`, {
    method: "DELETE",
    token,
  });
}

export function getStudyRoomParticipants({
  roomId,
  signal,
  token,
}: StudyRoomRequest) {
  return apiRequest<StudyRoomParticipant[]>(`/rooms/${roomId}/participants`, {
    signal,
    token,
  });
}

export function startStudyRoomFocus({ roomId, token }: StudyRoomRequest) {
  return apiRequest<void>(`/rooms/${roomId}/participants/focus`, {
    method: "PATCH",
    token,
  });
}

export function switchStudyRoomBreak({ roomId, token }: StudyRoomRequest) {
  return apiRequest<void>(`/rooms/${roomId}/participants/break`, {
    method: "PATCH",
    token,
  });
}

export function getMyParticipations({ signal, token }: AuthenticatedRequest) {
  return apiRequest<MyParticipation[]>("/my-participations", { signal, token });
}
