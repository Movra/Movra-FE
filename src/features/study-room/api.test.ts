import {
  createStudyRoom,
  getStudyRoomInviteCode,
  getMyParticipations,
  getPublicStudyRooms,
  getStudyRoom,
  getStudyRoomParticipants,
  joinStudyRoom,
  joinStudyRoomByInvite,
  kickStudyRoomParticipant,
  leaveStudyRoom,
  reissueStudyRoomInviteCode,
  startStudyRoomFocus,
  switchStudyRoomBreak,
} from "./api";

describe("study room api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the documented StudyRoom REST endpoints", async () => {
    const roomDetail = {
      createdAt: "2026-04-24T09:00:00",
      currentCount: 1,
      leaderUserId: "user-1",
      name: "Quiet focus",
      participants: [
        {
          joinedAt: "2026-04-24T09:00:00",
          participantId: "participant-1",
          participantName: "Mina",
          sessionMode: "WAITING",
          userId: "user-1",
        },
      ],
      roomId: "room-1",
      visibility: "PRIVATE",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ inviteCode: "ABCD12", roomId: "room-1" }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              createdAt: "2026-04-24T09:00:00",
              name: "Quiet focus",
              roomId: "room-1",
            },
          ]),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(roomDetail), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(roomDetail.participants), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              joinedAt: "2026-04-24T09:00:00",
              participantId: "participant-1",
              roomId: "room-1",
              sessionMode: "FOCUS",
            },
          ]),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createStudyRoom({
        name: "Quiet focus",
        token: "access-token",
        visibility: "PRIVATE",
      }),
    ).resolves.toEqual({ inviteCode: "ABCD12", roomId: "room-1" });
    await expect(
      getPublicStudyRooms({ token: "access-token" }),
    ).resolves.toHaveLength(1);
    await expect(
      getStudyRoom({ roomId: "room-1", token: "access-token" }),
    ).resolves.toEqual(roomDetail);
    await joinStudyRoom({
      inviteCode: "ABCD12",
      roomId: "room-1",
      token: "access-token",
    });
    await leaveStudyRoom({ roomId: "room-1", token: "access-token" });
    await kickStudyRoomParticipant({
      roomId: "room-1",
      targetUserId: "user-2",
      token: "access-token",
    });
    await expect(
      getStudyRoomParticipants({ roomId: "room-1", token: "access-token" }),
    ).resolves.toEqual(roomDetail.participants);
    await startStudyRoomFocus({ roomId: "room-1", token: "access-token" });
    await switchStudyRoomBreak({ roomId: "room-1", token: "access-token" });
    await expect(getMyParticipations({ token: "access-token" })).resolves.toEqual([
      {
        joinedAt: "2026-04-24T09:00:00",
        participantId: "participant-1",
        roomId: "room-1",
        sessionMode: "FOCUS",
      },
    ]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8080/rooms",
      expect.objectContaining({
        body: JSON.stringify({ name: "Quiet focus", visibility: "PRIVATE" }),
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8080/rooms",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8080/rooms/room-1",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:8080/rooms/join",
      expect.objectContaining({
        body: JSON.stringify({ inviteCode: "ABCD12", roomId: "room-1" }),
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "http://localhost:8080/rooms/room-1/leave",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "http://localhost:8080/rooms/room-1/participants/user-2",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      "http://localhost:8080/rooms/room-1/participants",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      8,
      "http://localhost:8080/rooms/room-1/participants/focus",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      9,
      "http://localhost:8080/rooms/room-1/participants/break",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      10,
      "http://localhost:8080/my-participations",
      expect.objectContaining({ method: "GET" }),
    );

    fetchMock.mock.calls.forEach(([, init]) => {
      expect(new Headers((init as RequestInit).headers).get("Authorization")).toBe(
        "Bearer access-token",
      );
    });
  });

  it("creates public rooms without invite code payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ inviteCode: "PUBLIC-SHOULD-NOT-RETURN", roomId: "room-public" }),
        {
        headers: { "content-type": "application/json" },
        status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createStudyRoom({
        name: "Open focus",
        token: "access-token",
        visibility: "PUBLIC",
      }),
    ).resolves.toEqual({ roomId: "room-public" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/rooms",
      expect.objectContaining({
        body: JSON.stringify({ name: "Open focus", visibility: "PUBLIC" }),
        method: "POST",
      }),
    );
  });

  it("sends only roomId when joining a public room", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await joinStudyRoom({ roomId: "room-public", token: "access-token" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/rooms/join",
      expect.objectContaining({
        body: JSON.stringify({ roomId: "room-public" }),
        method: "POST",
      }),
    );
  });

  it("joins a private room with invite code only", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await joinStudyRoomByInvite({
      inviteCode: "INV123",
      token: "access-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/rooms/join",
      expect.objectContaining({
        body: JSON.stringify({ inviteCode: "INV123" }),
        method: "POST",
      }),
    );
  });

  it("queries and reissues a private room invite code", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ inviteCode: "INV123" }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ inviteCode: "NEW456" }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getStudyRoomInviteCode({
        roomId: "room-private",
        token: "access-token",
      }),
    ).resolves.toEqual({ inviteCode: "INV123" });
    await expect(
      reissueStudyRoomInviteCode({
        roomId: "room-private",
        token: "access-token",
      }),
    ).resolves.toEqual({ inviteCode: "NEW456" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8080/rooms/room-private/invite-code",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8080/rooms/room-private/invite-code/reissue",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
