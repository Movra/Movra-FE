export type RoomVisibility = "PUBLIC" | "PRIVATE";

export type SessionMode = "WAITING" | "FOCUS" | "REST" | "ENDED";

export type StudyRoomSummary = {
  roomId: string;
  name: string;
  createdAt: string;
};

export type StudyRoomParticipant = {
  focusElapsedSeconds?: number | null;
  focusStartedAt?: string | null;
  participantId: string;
  userId: string;
  participantName: string;
  sessionMode: SessionMode;
  joinedAt: string;
};

export type StudyRoomDetail = {
  roomId: string;
  name: string;
  leaderUserId: string;
  currentCount: number;
  createdAt: string;
  participants: StudyRoomParticipant[];
};

export type MyParticipation = {
  roomId: string;
  participantId: string;
  sessionMode: SessionMode;
  joinedAt: string;
};

export type CreateStudyRoomResponse = {
  roomId: string;
  inviteCode: string | null;
};

export type StudyRoomChatMessage = {
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
};

export type StudyRoomChatError = {
  statusCode: number;
  message: string;
  timestamp: string;
};
