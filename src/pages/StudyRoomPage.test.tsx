import { HttpResponse, http } from "msw";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../app/App";
import type {
  MyParticipation,
  RoomVisibility,
  SessionMode,
  StudyRoomDetail,
  StudyRoomParticipant,
  StudyRoomSummary,
} from "../features/study-room/types";
import { server } from "../test/server";

vi.mock("../features/study-room/StudyRoomChatPanel", () => ({
  StudyRoomChatPanel: ({ sessionMode }: { sessionMode: string | null }) => (
    <section aria-label="스터디룸 채팅">
      채팅 상태 {sessionMode ?? "미참여"}
    </section>
  ),
}));

type StudyRoomState = {
  inviteCodes: Record<string, string>;
  myParticipations: MyParticipation[];
  publicRooms: StudyRoomSummary[];
  rooms: Record<string, StudyRoomDetail>;
};

function authenticate(path = "/study-room") {
  window.localStorage.setItem("movra.accessToken", "access-token");
  window.localStorage.setItem("movra.refreshToken", "refresh-token");
  window.history.pushState({}, "", path);
}

function createParticipant(
  override: Partial<StudyRoomParticipant> = {},
): StudyRoomParticipant {
  return {
    joinedAt: "2026-04-24T09:00:00",
    participantId: "participant-me",
    participantName: "Mina",
    sessionMode: "WAITING",
    userId: "user-me",
    ...override,
  };
}

function createRoom(
  override: Partial<StudyRoomDetail> = {},
): StudyRoomDetail {
  const participants = override.participants ?? [
    createParticipant(),
    createParticipant({
      joinedAt: "2026-04-24T09:05:00",
      participantId: "participant-joon",
      participantName: "Joon",
      sessionMode: "FOCUS",
      userId: "user-joon",
    }),
  ];

  return {
    createdAt: "2026-04-24T09:00:00",
    currentCount: participants.length,
    leaderUserId: "user-leader",
    name: "Morning focus",
    participants,
    roomId: "room-public",
    visibility: "PUBLIC",
    ...override,
  };
}

function setupStudyRoomHandlers({
  initialState,
}: {
  initialState?: Partial<StudyRoomState>;
} = {}) {
  const publicRoom = createRoom();
  const privateRoom = createRoom({
    currentCount: 0,
    name: "Invite only",
    participants: [],
    roomId: "room-private",
    visibility: "PRIVATE",
  });
  const state: StudyRoomState = {
    inviteCodes: {
      [privateRoom.roomId]: "SECRET",
    },
    myParticipations: [
      {
        joinedAt: "2026-04-24T09:00:00",
        participantId: "participant-me",
        roomId: "room-public",
        sessionMode: "WAITING",
      },
    ],
    publicRooms: [
      {
        createdAt: publicRoom.createdAt,
        name: publicRoom.name,
        roomId: publicRoom.roomId,
      },
    ],
    rooms: {
      [privateRoom.roomId]: privateRoom,
      [publicRoom.roomId]: publicRoom,
    },
    ...initialState,
  };

  function syncRoomCount(roomId: string) {
    const room = state.rooms[roomId];
    state.rooms[roomId] = {
      ...room,
      currentCount: room.participants.length,
    };
  }

  function setMyMode(roomId: string, sessionMode: SessionMode) {
    state.myParticipations = state.myParticipations.map((participation) =>
      participation.roomId === roomId ? { ...participation, sessionMode } : participation,
    );
    const room = state.rooms[roomId];
    state.rooms[roomId] = {
      ...room,
      participants: room.participants.map((participant) =>
        participant.userId === "user-me"
          ? { ...participant, sessionMode }
          : participant,
      ),
    };
  }

  function addMyParticipation(roomId: string) {
    if (
      state.myParticipations.some(
        (participation) => participation.roomId === roomId,
      )
    ) {
      return;
    }

    const participant = createParticipant({
      participantId: `participant-${roomId}`,
    });
    state.myParticipations = [
      ...state.myParticipations,
      {
        joinedAt: participant.joinedAt,
        participantId: participant.participantId,
        roomId,
        sessionMode: participant.sessionMode,
      },
    ];
    state.rooms[roomId] = {
      ...state.rooms[roomId],
      participants: [...state.rooms[roomId].participants, participant],
    };
    syncRoomCount(roomId);
  }

  server.use(
    http.get("http://localhost:8080/rooms", () =>
      HttpResponse.json(state.publicRooms),
    ),
    http.post("http://localhost:8080/rooms", async ({ request }) => {
      const body = (await request.json()) as {
        name: string;
        visibility: RoomVisibility;
      };
      const roomId = "room-created";
      const response =
        body.visibility === "PRIVATE"
          ? { inviteCode: "INV123", roomId }
          : { roomId };
      const participant = createParticipant({
        participantId: "participant-created",
      });
      state.rooms[roomId] = {
        createdAt: "2026-04-24T10:00:00",
        currentCount: 1,
        leaderUserId: "user-me",
        name: body.name,
        participants: [participant],
        roomId,
        visibility: body.visibility,
      };
      if (body.visibility === "PRIVATE") {
        state.inviteCodes[roomId] = "INV123";
      }
      state.myParticipations = [
        ...state.myParticipations,
        {
          joinedAt: participant.joinedAt,
          participantId: participant.participantId,
          roomId,
          sessionMode: participant.sessionMode,
        },
      ];

      if (body.visibility === "PUBLIC") {
        state.publicRooms = [
          ...state.publicRooms,
          {
            createdAt: state.rooms[roomId].createdAt,
            name: body.name,
            roomId,
          },
        ];
      }

      return HttpResponse.json(response);
    }),
    http.get("http://localhost:8080/rooms/:roomId", ({ params }) => {
      const room = state.rooms[String(params.roomId)];

      if (!room) {
        return HttpResponse.json({ message: "Room not found" }, { status: 404 });
      }

      return HttpResponse.json(room);
    }),
    http.post("http://localhost:8080/rooms/join", async ({ request }) => {
      const body = (await request.json()) as {
        inviteCode?: string;
        roomId?: string;
      };

      if (body.roomId) {
        const room = state.rooms[body.roomId];
        const inviteCode = state.inviteCodes[body.roomId];

        if (!room) {
          return HttpResponse.json(
            { message: "Room not found" },
            { status: 404 },
          );
        }

        if (room.visibility === "PRIVATE" && body.inviteCode !== inviteCode) {
          return HttpResponse.json(
            { message: "Invalid invite code" },
            { status: 400 },
          );
        }

        addMyParticipation(body.roomId);
        return new HttpResponse(null, { status: 200 });
      }

      const joinedRoomId = Object.entries(state.inviteCodes).find(
        ([, inviteCode]) => inviteCode === body.inviteCode,
      )?.[0];

      if (!joinedRoomId) {
        return HttpResponse.json(
          { message: "Invalid invite code" },
          { status: 400 },
        );
      }

      addMyParticipation(joinedRoomId);
      return new HttpResponse(null, { status: 200 });
    }),
    http.get("http://localhost:8080/rooms/:roomId/invite-code", ({ params }) => {
      const roomId = String(params.roomId);
      const room = state.rooms[roomId];

      if (!room || room.visibility !== "PRIVATE") {
        return HttpResponse.json(
          { message: "Invalid invite code" },
          { status: 400 },
        );
      }

      return HttpResponse.json({ inviteCode: state.inviteCodes[roomId] });
    }),
    http.post(
      "http://localhost:8080/rooms/:roomId/invite-code/reissue",
      ({ params }) => {
        const roomId = String(params.roomId);
        const room = state.rooms[roomId];

        if (!room || room.visibility !== "PRIVATE") {
          return HttpResponse.json(
            { message: "Invalid invite code" },
            { status: 400 },
          );
        }

        state.inviteCodes[roomId] = "NEWINV";
        return HttpResponse.json({ inviteCode: "NEWINV" });
      },
    ),
    http.post("http://localhost:8080/rooms/:roomId/leave", ({ params }) => {
      const roomId = String(params.roomId);
      state.myParticipations = state.myParticipations.filter(
        (participation) => participation.roomId !== roomId,
      );
      state.rooms[roomId] = {
        ...state.rooms[roomId],
        participants: state.rooms[roomId].participants.filter(
          (participant) => participant.userId !== "user-me",
        ),
      };
      syncRoomCount(roomId);

      return new HttpResponse(null, { status: 200 });
    }),
    http.delete(
      "http://localhost:8080/rooms/:roomId/participants/:targetUserId",
      ({ params }) => {
        if (String(params.targetUserId) === "user-joon") {
          return HttpResponse.json(
            { message: "Only leader can kick participants" },
            { status: 403 },
          );
        }

        const roomId = String(params.roomId);
        state.rooms[roomId] = {
          ...state.rooms[roomId],
          participants: state.rooms[roomId].participants.filter(
            (participant) =>
              participant.userId !== String(params.targetUserId),
          ),
        };
        syncRoomCount(roomId);

        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.get(
      "http://localhost:8080/rooms/:roomId/participants",
      ({ params }) => {
        const room = state.rooms[String(params.roomId)];

        return HttpResponse.json(room?.participants ?? []);
      },
    ),
    http.patch(
      "http://localhost:8080/rooms/:roomId/participants/focus",
      ({ params }) => {
        setMyMode(String(params.roomId), "FOCUS");
        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.patch(
      "http://localhost:8080/rooms/:roomId/participants/break",
      ({ params }) => {
        setMyMode(String(params.roomId), "REST");
        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.get("http://localhost:8080/my-participations", () =>
      HttpResponse.json(state.myParticipations),
    ),
  );

  return state;
}

describe("StudyRoomPage", () => {
  it("renders public rooms and selected room participants", async () => {
    const user = userEvent.setup();
    setupStudyRoomHandlers();
    authenticate("/study-room/rooms/room-public");

    render(<App />);

    expect(
      await screen.findAllByRole(
        "heading",
        { name: "Morning focus" },
        { timeout: 10_000 },
      ),
    ).not.toHaveLength(0);
    expect(screen.queryByText("Joon")).toBeNull();

    await user.click(screen.getByRole("button", { name: "멤버 조회하기" }));
    const memberDialog = await screen.findByRole("dialog", { name: "방 멤버" });

    expect(within(memberDialog).getByText("Mina")).toBeInTheDocument();
    expect(within(memberDialog).getByText("Joon")).toBeInTheDocument();
  });

  it("creates a private room and shows its name and invite code", async () => {
    const user = userEvent.setup();
    setupStudyRoomHandlers();
    authenticate("/study-room/create");

    render(<App />);

    const createDialog = await screen.findByRole("dialog", {
      name: "스터디룸 만들기",
    });
    await user.type(within(createDialog).getByLabelText("방 이름"), "Deep work");
    await user.click(within(createDialog).getByRole("button", { name: "비공개" }));
    await user.click(within(createDialog).getByRole("button", { name: "방 만들기" }));

    expect(
      await screen.findByRole("heading", { name: "초대 코드를 확인하세요" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Deep work")).not.toHaveLength(0);
    expect(screen.getByText("INV123")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "방 입장하기" }));
    expect(
      await screen.findAllByRole("heading", { name: "Deep work" }),
    ).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "초대 코드 조회/생성" }));
    const inviteDialog = await screen.findByRole("dialog", {
      name: "초대 코드를 확인하세요",
    });
    expect(within(inviteDialog).getByText("INV123")).toBeInTheDocument();
    await user.click(
      within(inviteDialog).getByRole("button", { name: "초대 코드 재생성" }),
    );
    expect(await within(inviteDialog).findByText("NEWINV")).toBeInTheDocument();
  });

  it("creates a public room without exposing invite code controls", async () => {
    const user = userEvent.setup();
    setupStudyRoomHandlers();
    authenticate("/study-room/create");

    render(<App />);

    const createDialog = await screen.findByRole("dialog", {
      name: "스터디룸 만들기",
    });
    await user.type(within(createDialog).getByLabelText("방 이름"), "Open focus");
    await user.click(within(createDialog).getByRole("button", { name: "방 만들기" }));

    await waitFor(() =>
      expect(window.location.pathname).toBe("/study-room/rooms/room-created"),
    );
    expect(await screen.findAllByRole("heading", { name: "Open focus" })).not.toHaveLength(0);
    expect(
      screen.queryByRole("dialog", { name: "초대 코드를 확인하세요" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "초대 코드 조회/생성" }),
    ).not.toBeInTheDocument();
  });

  it("shows private invite controls when room detail omits visibility", async () => {
    const user = userEvent.setup();
    const privateRoom = createRoom({
      currentCount: 1,
      leaderUserId: "user-me",
      name: "Hidden invite room",
      participants: [createParticipant()],
      roomId: "room-private",
      visibility: "PRIVATE",
    });
    setupStudyRoomHandlers({
      initialState: {
        inviteCodes: {
          "room-private": "SECRET",
        },
        myParticipations: [
          {
            joinedAt: "2026-04-24T09:00:00",
            participantId: "participant-me",
            roomId: "room-private",
            sessionMode: "WAITING",
          },
        ],
        publicRooms: [],
        rooms: {
          "room-private": privateRoom,
        },
      },
    });
    server.use(
      http.get("http://localhost:8080/rooms/:roomId", ({ params }) => {
        if (params.roomId !== "room-private") {
          return HttpResponse.json({ message: "Room not found" }, { status: 404 });
        }

        const roomWithoutVisibility: Partial<StudyRoomDetail> = { ...privateRoom };
        delete roomWithoutVisibility.visibility;
        return HttpResponse.json(roomWithoutVisibility);
      }),
    );
    authenticate("/study-room/rooms/room-private");

    render(<App />);

    await user.click(
      await screen.findByRole("button", { name: "초대 코드 조회/생성" }),
    );

    const inviteDialog = await screen.findByRole("dialog", {
      name: "초대 코드를 확인하세요",
    });
    expect(within(inviteDialog).getByText("SECRET")).toBeInTheDocument();
  });

  it("hides private invite controls from non-leader members", async () => {
    const privateRoom = createRoom({
      currentCount: 1,
      leaderUserId: "user-leader",
      name: "Leader only invite",
      participants: [createParticipant()],
      roomId: "room-private",
      visibility: "PRIVATE",
    });
    setupStudyRoomHandlers({
      initialState: {
        inviteCodes: {
          "room-private": "SECRET",
        },
        myParticipations: [
          {
            joinedAt: "2026-04-24T09:00:00",
            participantId: "participant-me",
            roomId: "room-private",
            sessionMode: "WAITING",
          },
        ],
        publicRooms: [],
        rooms: {
          "room-private": privateRoom,
        },
      },
    });
    authenticate("/study-room/rooms/room-private");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "대기 상태" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "초대 코드 조회/생성" }),
    ).not.toBeInTheDocument();
  });

  it("shows the server error when private invite join fails", async () => {
    const user = userEvent.setup();
    setupStudyRoomHandlers();
    authenticate("/study-room/join");

    render(<App />);

    await screen.findByRole("heading", { name: "공개방 확인하기" });
    expect(screen.queryByLabelText("방 ID")).toBeNull();
    await user.click(screen.getByRole("button", { name: "초대 코드 입력" }));
    const inviteDialog = await screen.findByRole("dialog", {
      name: "초대 코드로 입장하기",
    });
    await user.type(within(inviteDialog).getByLabelText("초대 코드"), "BAD");
    await user.click(within(inviteDialog).getByRole("button", { name: "입장하기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid invite code",
    );
  });

  it("joins a private room through invite code modal and opens the new room", async () => {
    const user = userEvent.setup();
    setupStudyRoomHandlers();
    authenticate("/study-room");

    render(<App />);

    const joinedRail = await screen.findByRole("complementary", {
      name: "내가 참여한 방",
    });
    expect(within(joinedRail).getByText("Morning focus")).toBeInTheDocument();
    expect(screen.queryByLabelText("방 ID")).toBeNull();

    await user.click(screen.getByRole("button", { name: "초대 코드 입력" }));
    const inviteDialog = await screen.findByRole("dialog", {
      name: "초대 코드로 입장하기",
    });
    await user.type(within(inviteDialog).getByLabelText("초대 코드"), "SECRET");
    await user.click(within(inviteDialog).getByRole("button", { name: "입장하기" }));

    expect(await screen.findByText("초대 코드로 스터디룸에 참여했어요.")).toBeInTheDocument();
    expect(
      await screen.findAllByRole("heading", { name: "Invite only" }),
    ).not.toHaveLength(0);
  });

  it("dismisses success notices automatically", async () => {
    const user = userEvent.setup();
    setupStudyRoomHandlers();
    authenticate("/study-room/rooms/room-public");

    render(<App />);

    await screen.findByRole("button", { name: "집중 시작하기" });
    await user.click(screen.getByRole("button", { name: "집중 시작하기" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "집중 상태로 전환했어요.",
    );
    await waitFor(
      () => expect(screen.queryByRole("status")).not.toBeInTheDocument(),
      { timeout: 4000 },
    );
  });

  it("switches participant state and leaves the room", async () => {
    const user = userEvent.setup();
    setupStudyRoomHandlers();
    authenticate("/study-room/rooms/room-public");

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "집중 시작하기" }));
    expect(
      await screen.findByText("집중 상태로 전환했어요."),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /^00:/ })).toBeInTheDocument();
    expect(screen.queryByText("user-me")).toBeNull();
    expect(screen.queryByText("user-joon")).toBeNull();

    await user.click(screen.getByRole("button", { name: "멤버 조회하기" }));
    let memberDialog = await screen.findByRole("dialog", { name: "방 멤버" });
    let minaRow = within(memberDialog).getByText("Mina").closest("li");
    expect(minaRow).not.toBeNull();
    await waitFor(() =>
      expect(within(minaRow as HTMLElement).getByText("집중")).toBeInTheDocument(),
    );
    expect(within(minaRow as HTMLElement).getByText(/집중 00:/)).toBeInTheDocument();
    await user.click(
      within(memberDialog).getByRole("button", {
        name: "멤버 조회 모달 닫기",
      }),
    );

    await user.click(screen.getByRole("button", { name: "휴식 전환" }));
    expect(
      await screen.findByText("휴식 상태로 전환했어요."),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "휴식 중" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "멤버 조회하기" }));
    memberDialog = await screen.findByRole("dialog", { name: "방 멤버" });
    minaRow = within(memberDialog).getByText("Mina").closest("li");
    expect(minaRow).not.toBeNull();
    await waitFor(() =>
      expect(within(minaRow as HTMLElement).getByText("휴식")).toBeInTheDocument(),
    );
    await user.click(
      within(memberDialog).getByRole("button", {
        name: "멤버 조회 모달 닫기",
      }),
    );

    expect(screen.queryByRole("button", { name: "내보내기" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "방 나가기" }));
    expect(await screen.findByText("스터디룸에서 나갔어요.")).toBeInTheDocument();
    expect(await screen.findByText("아직 입장할 스터디룸이 없습니다.")).toBeInTheDocument();
  });

  it("redirects home and removes my joined room when I am kicked", async () => {
    setupStudyRoomHandlers({
      initialState: {
        rooms: {
          "room-public": createRoom({
            currentCount: 1,
            participants: [
              createParticipant({
                participantId: "participant-joon",
                participantName: "Joon",
                userId: "user-joon",
              }),
            ],
          }),
        },
      },
    });
    authenticate("/study-room/rooms/room-public");

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe("/study-room"));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "방에서 내보내졌어요.",
    );
    expect(
      await screen.findByText("아직 입장할 스터디룸이 없습니다."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Morning focus")).not.toBeInTheDocument();
  });

  it("shows kick actions only to the leader and displays server errors", async () => {
    const user = userEvent.setup();
    setupStudyRoomHandlers({
      initialState: {
        rooms: {
          "room-public": createRoom({ leaderUserId: "user-me" }),
        },
      },
    });
    authenticate("/study-room/rooms/room-public");

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "멤버 조회하기" }));
    const memberDialog = await screen.findByRole("dialog", { name: "방 멤버" });
    const minaRow = within(memberDialog).getByText("Mina").closest("li");
    const joonRow = within(memberDialog).getByText("Joon").closest("li");
    expect(minaRow).not.toBeNull();
    expect(joonRow).not.toBeNull();
    expect(
      within(minaRow as HTMLElement).queryByRole("button", { name: "내보내기" }),
    ).toBeNull();

    await user.click(
      within(joonRow as HTMLElement).getByRole("button", { name: "내보내기" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only leader can kick participants",
    );
  });

  it("keeps public room selection to join only before participation", async () => {
    const user = userEvent.setup();
    setupStudyRoomHandlers({
      initialState: {
        myParticipations: [],
      },
    });
    authenticate("/study-room/join");

    render(<App />);

    await screen.findByRole("heading", { name: "공개방 확인하기" });
    expect(screen.queryByRole("button", { name: "상세" })).toBeNull();

    expect(screen.queryByRole("button", { name: "집중 시작하기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "휴식 전환" })).toBeNull();
    expect(screen.queryByRole("button", { name: "방 나가기" })).toBeNull();
    expect(
      await screen.findByRole("button", { name: "참여하기" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "참여하기" }));
    expect(await screen.findByText("스터디룸에 참여했어요.")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "집중 시작하기" }),
    ).toBeInTheDocument();
  });
});
