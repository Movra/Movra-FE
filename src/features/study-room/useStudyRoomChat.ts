import { useCallback, useEffect, useRef, useState } from "react";

import {
  createStudyRoomChatClient,
  type StudyRoomChatConnection,
  type StudyRoomChatStatus,
} from "./chatClient";
import type { StudyRoomChatError, StudyRoomChatMessage } from "./types";

type UseStudyRoomChatOptions = {
  enabled: boolean;
  roomId: string;
  token: string;
};

// Cap retained messages so a long-lived connection cannot grow the array
// (and its re-renders) without bound.
const maxRetainedMessages = 200;

export function useStudyRoomChat({
  enabled,
  roomId,
  token,
}: UseStudyRoomChatOptions) {
  const connectionRef = useRef<StudyRoomChatConnection | null>(null);
  const [messages, setMessages] = useState<StudyRoomChatMessage[]>([]);
  const [serverError, setServerError] = useState<StudyRoomChatError | null>(
    null,
  );
  const [status, setStatus] = useState<StudyRoomChatStatus>("idle");

  useEffect(() => {
    setMessages([]);
    setServerError(null);

    if (!enabled || !roomId || !token) {
      connectionRef.current = null;
      setStatus("idle");
      return undefined;
    }

    let isActive = true;

    try {
      const connection = createStudyRoomChatClient({
        onError: (error) => {
          if (isActive) {
            setServerError(error);
          }
        },
        onMessage: (message) => {
          if (isActive) {
            setMessages((current) =>
              [...current, message].slice(-maxRetainedMessages),
            );
          }
        },
        onStatusChange: (nextStatus) => {
          if (isActive) {
            setStatus(nextStatus);
          }
        },
        roomId,
        token,
      });

      connectionRef.current = connection;

      return () => {
        isActive = false;
        connection.disconnect();
        if (connectionRef.current === connection) {
          connectionRef.current = null;
        }
      };
    } catch {
      setStatus("error");
      setServerError({
        message: "채팅 연결에 실패했습니다.",
        statusCode: 0,
        timestamp: new Date().toISOString(),
      });
      return undefined;
    }
  }, [enabled, roomId, token]);

  const sendMessage = useCallback((content: string) => {
    if (!connectionRef.current) {
      throw new Error("채팅 연결이 아직 준비되지 않았습니다.");
    }

    connectionRef.current.sendMessage(content);
  }, []);

  return {
    messages,
    sendMessage,
    serverError,
    status,
  };
}
