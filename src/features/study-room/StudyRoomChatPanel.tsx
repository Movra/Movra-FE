import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import type { StudyRoomChatStatus } from "./chatClient";
import type { SessionMode } from "./types";
import { useStudyRoomChat } from "./useStudyRoomChat";
import styles from "./StudyRoomChatPanel.module.css";

type StudyRoomChatPanelProps = {
  roomId: string;
  sessionMode: SessionMode | null;
  token: string;
};

const maxMessageLength = 500;

const blockedMessages: Record<SessionMode, string> = {
  ENDED: "종료된 참여 상태에서는 채팅을 사용할 수 없습니다.",
  FOCUS: "집중 중에는 채팅을 잠시 막아 둡니다.",
  REST: "",
  WAITING: "휴식 상태로 전환하면 채팅을 사용할 수 있습니다.",
};

function formatMessageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBlockedMessage(sessionMode: SessionMode | null) {
  if (!sessionMode) {
    return "이 방에 참여하면 채팅을 사용할 수 있습니다.";
  }

  return blockedMessages[sessionMode];
}

function getStatusLabel(status: StudyRoomChatStatus) {
  if (status === "connected") {
    return "연결됨";
  }
  if (status === "connecting") {
    return "연결 중";
  }
  if (status === "error") {
    return "연결 문제";
  }
  if (status === "disconnected") {
    return "연결 끊김";
  }

  return "대기";
}

export function StudyRoomChatPanel({
  roomId,
  sessionMode,
  token,
}: StudyRoomChatPanelProps) {
  const canChat = sessionMode === "REST";
  const { messages, sendMessage, serverError, status } = useStudyRoomChat({
    enabled: canChat,
    roomId,
    token,
  });
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const blockedMessage = getBlockedMessage(sessionMode);

  function scrollToLatestMessage() {
    const messageList = messageListRef.current;

    if (!messageList) {
      return;
    }

    messageList.scrollTop = messageList.scrollHeight;
  }

  useEffect(() => {
    scrollToLatestMessage();
  }, [messages]);

  function submitDraft() {
    const content = draft.trim();

    if (!canChat) {
      setLocalError(blockedMessage);
      return;
    }

    if (!content) {
      setLocalError("메시지를 입력해 주세요.");
      return;
    }

    if (content.length > maxMessageLength) {
      setLocalError("메시지는 500자 이하로 입력해 주세요.");
      return;
    }

    try {
      sendMessage(content);
      setDraft("");
      setLocalError(null);
      scrollToLatestMessage();
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "메시지를 보내지 못했습니다.",
      );
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitDraft();
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();
    submitDraft();
  }

  return (
    <section className={styles.chatPanel} aria-labelledby="study-room-chat-title">
      <div className={styles.chatHeader}>
        <div>
          <p>채팅</p>
          <h3 id="study-room-chat-title">방 메시지</h3>
        </div>
        <span>{getStatusLabel(status)}</span>
      </div>

      {blockedMessage ? (
        <p className={styles.blockedNotice}>{blockedMessage}</p>
      ) : (
        <p className={styles.availableNotice}>휴식 상태에서 채팅할 수 있습니다.</p>
      )}

      <div className={styles.feedbackStack}>
        {serverError ? (
          <p className={styles.error} role="alert">
            {serverError.message}
          </p>
        ) : null}
        {localError ? (
          <p className={styles.error} role="alert">
            {localError}
          </p>
        ) : null}
      </div>

      <div
        className={styles.messageList}
        ref={messageListRef}
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className={styles.emptyText}>
            현재 연결 이후 받은 메시지가 없습니다.
          </p>
        ) : (
          messages.map((message, index) => (
            <article
              className={styles.messageItem}
              key={`${message.senderId}-${message.sentAt}-${index}`}
            >
              <div>
                <strong>{message.senderName}</strong>
                <time>{formatMessageTime(message.sentAt)}</time>
              </div>
              <p>{message.content}</p>
            </article>
          ))
        )}
      </div>

      <form className={styles.chatForm} onSubmit={handleSubmit}>
        <label>
          메시지
          <textarea
            disabled={!canChat}
            onKeyDown={handleTextareaKeyDown}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              canChat ? "짧은 휴식 상태를 공유해 보세요." : "채팅을 사용할 수 없습니다."
            }
            rows={3}
            value={draft}
          />
        </label>
        <div className={styles.formFooter}>
          <span>{draft.trim().length}/{maxMessageLength}</span>
          <button disabled={!canChat} type="submit">
            보내기
          </button>
        </div>
      </form>
    </section>
  );
}
