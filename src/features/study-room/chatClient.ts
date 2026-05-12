import {
  Client,
  type IFrame,
  type IMessage,
  type IStompSocket,
  type StompSubscription,
} from "@stomp/stompjs";
import SockJS from "sockjs-client";

import { API_BASE_URL } from "../../shared/config/env";
import type { StudyRoomChatError, StudyRoomChatMessage } from "./types";

export type StudyRoomChatStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type StudyRoomChatClientOptions = {
  roomId: string;
  token: string;
  onError: (error: StudyRoomChatError) => void;
  onMessage: (message: StudyRoomChatMessage) => void;
  onStatusChange?: (status: StudyRoomChatStatus) => void;
};

export type StudyRoomChatConnection = {
  disconnect: () => void;
  sendMessage: (content: string) => void;
};

function createSockJsUrl() {
  return `${API_BASE_URL.replace(/\/$/, "")}/ws`;
}

function readFrameBody<T>(frame: IMessage | IFrame): T | null {
  try {
    return JSON.parse(frame.body) as T;
  } catch {
    return null;
  }
}

function createPayloadError(message: string): StudyRoomChatError {
  return {
    message,
    statusCode: 0,
    timestamp: new Date().toISOString(),
  };
}

export function createStudyRoomChatClient({
  onError,
  onMessage,
  onStatusChange,
  roomId,
  token,
}: StudyRoomChatClientOptions): StudyRoomChatConnection {
  const authorization = `Bearer ${token}`;
  let chatSubscription: StompSubscription | null = null;
  let errorSubscription: StompSubscription | null = null;

  const client = new Client({
    connectHeaders: {
      Authorization: authorization,
    },
    debug: () => undefined,
    onConnect: () => {
      onStatusChange?.("connected");
      chatSubscription = client.subscribe(
        `/topic/rooms/${roomId}/chat`,
        (frame) => {
          const message = readFrameBody<StudyRoomChatMessage>(frame);

          if (message) {
            onMessage(message);
            return;
          }

          onError(createPayloadError("채팅 메시지를 읽지 못했습니다."));
        },
      );
      errorSubscription = client.subscribe("/user/queue/errors", (frame) => {
        const error = readFrameBody<StudyRoomChatError>(frame);

        if (error) {
          onError(error);
          return;
        }

        onError(createPayloadError("채팅 오류를 읽지 못했습니다."));
      });
    },
    onStompError: (frame) => {
      onStatusChange?.("error");
      onError(
        createPayloadError(frame.headers.message ?? "채팅 서버 오류가 발생했습니다."),
      );
    },
    onWebSocketClose: () => {
      onStatusChange?.("disconnected");
    },
    onWebSocketError: () => {
      onStatusChange?.("error");
      onError(createPayloadError("채팅 연결에 실패했습니다."));
    },
    reconnectDelay: 5000,
    webSocketFactory: () => new SockJS(createSockJsUrl()) as IStompSocket,
  });

  onStatusChange?.("connecting");
  client.activate();

  return {
    disconnect: () => {
      chatSubscription?.unsubscribe();
      errorSubscription?.unsubscribe();
      void client.deactivate();
    },
    sendMessage: (content: string) => {
      if (!client.connected) {
        throw new Error("채팅 연결이 아직 준비되지 않았습니다.");
      }

      client.publish({
        body: JSON.stringify({ content }),
        destination: `/app/rooms/${roomId}/chat`,
        headers: {
          Authorization: authorization,
        },
      });
    },
  };
}
