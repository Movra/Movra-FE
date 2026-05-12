import {
  createAccountabilityRelation,
  disconnectWatcher,
  disconnectWatching,
  getAccountabilityFriends,
  getInviteCodeStatus,
  getWatcherDateSummary,
  getWatcherRangeSummary,
  joinAccountabilityRelation,
  reissueInviteCode,
  updateVisibilityPolicy,
} from "./api";

describe("accountability api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the documented Accountability endpoints with auth and documented bodies", async () => {
    const friendsResponse = {
      watchedByFriends: [
        {
          accountabilityRelationId: "relation-subject",
          allowedTargets: ["FOCUS_SESSION", "TOP_PICKS"],
          subjectUserId: "subject-user",
          watcherConnected: false,
          watcherUserId: null,
        },
      ],
      watchingFriends: [
        {
          accountabilityRelationId: "relation-watching",
          allowedTargets: ["FOCUS_SESSION"],
          subjectUserId: "friend-user",
          watcherConnected: true,
          watcherUserId: "watcher-user",
        },
      ],
    };
    const updatedRelation = {
      accountabilityRelationId: "relation-subject",
      allowedTargets: ["FOCUS_SESSION", "TIMETABLE_TASK"],
      subjectUserId: "subject-user",
      watcherConnected: true,
      watcherUserId: "watcher-user",
    };
    const summaryResponse = {
      completedCount: 2,
      targetDate: "2026-04-24",
      totalFocusSeconds: 1800,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            expiresAt: "2026-04-25T09:00:00",
            inviteCode: "INVITE1",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            expired: false,
            expiredAt: "2026-04-25T09:00:00",
            inviteCode: "INVITE1",
            reissuable: true,
            watcherConnected: false,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(friendsResponse), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(updatedRelation), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ days: [summaryResponse] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ topPickCount: 3 }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ days: [{ topPickCount: 1 }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ scheduledCount: 4 }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ days: [{ scheduledCount: 2 }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await createAccountabilityRelation({
      targets: ["FOCUS_SESSION", "TOP_PICKS"],
      token: "access-token",
    });
    await joinAccountabilityRelation({
      inviteCode: "INVITE1",
      token: "access-token",
    });
    await expect(
      reissueInviteCode({ token: "access-token" }),
    ).resolves.toEqual({
      expiresAt: "2026-04-25T09:00:00",
      inviteCode: "INVITE1",
    });
    await expect(getInviteCodeStatus({ token: "access-token" })).resolves.toEqual({
      expired: false,
      expiredAt: "2026-04-25T09:00:00",
      inviteCode: "INVITE1",
      reissuable: true,
      watcherConnected: false,
    });
    await expect(
      getAccountabilityFriends({ token: "access-token" }),
    ).resolves.toEqual(friendsResponse);
    await expect(
      updateVisibilityPolicy({
        targets: ["FOCUS_SESSION", "TIMETABLE_TASK"],
        token: "access-token",
      }),
    ).resolves.toEqual(updatedRelation);
    await disconnectWatcher({ token: "access-token" });
    await disconnectWatching({ token: "access-token" });
    await expect(
      getWatcherDateSummary({
        date: "2026-04-24",
        target: "focus-sessions",
        token: "access-token",
      }),
    ).resolves.toBeNull();
    await expect(
      getWatcherRangeSummary({
        from: "2026-04-20",
        target: "focus-sessions",
        to: "2026-04-24",
        token: "access-token",
      }),
    ).resolves.toEqual({ days: [summaryResponse] });
    await getWatcherDateSummary({
      date: "2026-04-24",
      target: "top-picks",
      token: "access-token",
    });
    await getWatcherRangeSummary({
      from: "2026-04-20",
      target: "top-picks",
      to: "2026-04-24",
      token: "access-token",
    });
    await getWatcherDateSummary({
      date: "2026-04-24",
      target: "timetable-tasks",
      token: "access-token",
    });
    await getWatcherRangeSummary({
      from: "2026-04-20",
      target: "timetable-tasks",
      to: "2026-04-24",
      token: "access-token",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8080/accountability-relations",
      expect.objectContaining({
        body: JSON.stringify({ targets: ["FOCUS_SESSION", "TOP_PICKS"] }),
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8080/accountability-relations/join",
      expect.objectContaining({
        body: JSON.stringify({ inviteCode: "INVITE1" }),
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8080/accountability-relations/invite-code/reissue",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:8080/accountability-relations/invite-code/status",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "http://localhost:8080/accountability-relations/friends",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "http://localhost:8080/accountability-relations/visibility-policy",
      expect.objectContaining({
        body: JSON.stringify({ targets: ["FOCUS_SESSION", "TIMETABLE_TASK"] }),
        method: "PATCH",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      "http://localhost:8080/accountability-relations/watcher",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      8,
      "http://localhost:8080/accountability-relations/watching",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      9,
      "http://localhost:8080/accountability-relations/watcher/focus-sessions?date=2026-04-24",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      10,
      "http://localhost:8080/accountability-relations/watcher/focus-sessions/range?from=2026-04-20&to=2026-04-24",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      11,
      "http://localhost:8080/accountability-relations/watcher/top-picks?date=2026-04-24",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      12,
      "http://localhost:8080/accountability-relations/watcher/top-picks/range?from=2026-04-20&to=2026-04-24",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      13,
      "http://localhost:8080/accountability-relations/watcher/timetable-tasks?date=2026-04-24",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      14,
      "http://localhost:8080/accountability-relations/watcher/timetable-tasks/range?from=2026-04-20&to=2026-04-24",
      expect.objectContaining({ method: "GET" }),
    );

    fetchMock.mock.calls.forEach(([, init]) => {
      expect(new Headers((init as RequestInit).headers).get("Authorization")).toBe(
        "Bearer access-token",
      );
    });
  });
});
