import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";

import {
  createStudyRoomChatClient,
  type StudyRoomChatClientOptions,
} from "./chatClient";
import { StudyRoomChatPanel } from "./StudyRoomChatPanel";
import type { SessionMode } from "./types";

vi.mock("./chatClient", () => ({
  createStudyRoomChatClient: vi.fn(),
}));

const createClientMock = vi.mocked(createStudyRoomChatClient);

let latestOptions: StudyRoomChatClientOptions | null = null;
let sendMessageMock: Mock<(content: string) => void>;
let disconnectMock: Mock<() => void>;

function setup(sessionMode: SessionMode | null = "REST") {
  const user = userEvent.setup();

  render(
    <StudyRoomChatPanel
      roomId="room-1"
      sessionMode={sessionMode}
      token="access-token"
    />,
  );

  return { user };
}

function getLatestOptions() {
  if (!latestOptions) {
    throw new Error("Chat client was not created.");
  }

  return latestOptions;
}

describe("StudyRoomChatPanel", () => {
  beforeEach(() => {
    latestOptions = null;
    sendMessageMock = vi.fn<(content: string) => void>();
    disconnectMock = vi.fn<() => void>();
    createClientMock.mockImplementation((options) => {
      latestOptions = options;
      options.onStatusChange?.("connected");

      return {
        disconnect: disconnectMock,
        sendMessage: sendMessageMock,
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("allows typing and sending in REST state", async () => {
    const { user } = setup("REST");

    await user.type(screen.getByLabelText("메시지"), "5분 뒤 돌아올게");
    await user.click(screen.getByRole("button", { name: "보내기" }));

    expect(sendMessageMock).toHaveBeenCalledWith("5분 뒤 돌아올게");
    expect(screen.getByLabelText("메시지")).toHaveValue("");
  });

  it("sends with Enter and keeps Shift+Enter as a newline", async () => {
    const { user } = setup("REST");
    const textbox = screen.getByRole("textbox");

    await user.type(textbox, "바로 보낼게");
    await user.keyboard("{Enter}");

    expect(sendMessageMock).toHaveBeenCalledWith("바로 보낼게");
    expect(textbox).toHaveValue("");

    await user.type(textbox, "첫 줄");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    await user.type(textbox, "둘째 줄");

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(textbox).toHaveValue("첫 줄\n둘째 줄");
  });

  it("keeps the REST chat form available without feedback messages", () => {
    setup("REST");

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("log")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeEnabled();
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it.each([
    ["WAITING", "휴식 상태로 전환하면 채팅을 사용할 수 있습니다."],
    ["FOCUS", "집중 중에는 채팅을 잠시 막아 둡니다."],
    ["ENDED", "종료된 참여 상태에서는 채팅을 사용할 수 없습니다."],
  ] satisfies Array<[SessionMode, string]>)(
    "blocks typing and sending in %s state",
    (sessionMode, message) => {
      setup(sessionMode);

      expect(screen.getByLabelText("메시지")).toBeDisabled();
      expect(screen.getByRole("button", { name: "보내기" })).toBeDisabled();
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(createClientMock).not.toHaveBeenCalled();
      expect(sendMessageMock).not.toHaveBeenCalled();
    },
  );

  it("blocks blank messages locally", async () => {
    const { user } = setup("REST");

    await user.click(screen.getByRole("button", { name: "보내기" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "메시지를 입력해 주세요.",
    );
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it("blocks messages longer than 500 characters locally", async () => {
    const { user } = setup("REST");

    fireEvent.change(screen.getByLabelText("메시지"), {
      target: { value: "a".repeat(501) },
    });
    await user.click(screen.getByRole("button", { name: "보내기" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "메시지는 500자 이하로 입력해 주세요.",
    );
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it("renders received room messages", async () => {
    setup("REST");
    const messageList = screen.getByRole("log");
    Object.defineProperty(messageList, "scrollHeight", {
      configurable: true,
      value: 640,
    });

    await waitFor(() => expect(createClientMock).toHaveBeenCalled());
    act(() => {
      getLatestOptions().onMessage({
        content: "Rest starts now.",
        roomId: "room-1",
        senderId: "user-2",
        senderName: "Joon",
        sentAt: "2026-04-24T01:00:00Z",
      });
    });

    expect(screen.getByText("Joon")).toBeInTheDocument();
    expect(screen.getByText("Rest starts now.")).toBeInTheDocument();
    await waitFor(() => expect(messageList.scrollTop).toBe(640));
  });

  it("shows server error queue messages", async () => {
    setup("REST");

    await waitFor(() => expect(createClientMock).toHaveBeenCalled());
    act(() => {
      getLatestOptions().onError({
        message: "Chat is not allowed right now.",
        statusCode: 403,
        timestamp: "2026-04-24T01:00:00Z",
      });
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Chat is not allowed right now.",
    );
  });
});
