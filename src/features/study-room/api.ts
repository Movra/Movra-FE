import { apiRequest } from "../../shared/api/client";
import type {
  CreateStudyRoomResponse,
  MyParticipation,
  RoomVisibility,
  StudyRoomDetail,
  StudyRoomParticipant,
  StudyRoomSummary,
} from "./types";

type AuthenticatedRequest = {
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

export function createStudyRoom({
  name,
  token,
  visibility,
}: CreateStudyRoomRequest) {
  return apiRequest<CreateStudyRoomResponse>("/rooms", {
    body: { name, visibility },
    method: "POST",
    token,
  });
}

export function getPublicStudyRooms({ token }: AuthenticatedRequest) {
  return apiRequest<StudyRoomSummary[]>("/rooms", { token });
}

export function getStudyRoom({ roomId, token }: StudyRoomRequest) {
  return apiRequest<StudyRoomDetail>(`/rooms/${roomId}`, { token });
}

export function joinStudyRoom({
  inviteCode = null,
  roomId,
  token,
}: JoinStudyRoomRequest) {
  return apiRequest<void>(`/rooms/${roomId}/join`, {
    body: { inviteCode },
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

export function getStudyRoomParticipants({ roomId, token }: StudyRoomRequest) {
  return apiRequest<StudyRoomParticipant[]>(`/rooms/${roomId}/participants`, {
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

export function getMyParticipations({ token }: AuthenticatedRequest) {
  return apiRequest<MyParticipation[]>("/my-participations", { token });
}
