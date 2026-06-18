import { HttpResponse, http } from "msw";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../app/App";
import type {
  AccountabilityRelation,
  InviteCodeStatus,
  MonitoringTarget,
  WatcherSummary,
} from "../features/accountability/types";
import { server } from "../test/server";

type AccountabilityState = {
  inviteStatus: InviteCodeStatus | null;
  subjectRelation: AccountabilityRelation | null;
  summaryResponse: "empty" | "forbidden" | WatcherSummary;
  watchingRelations: AccountabilityRelation[];
};

function authenticate(path = "/accountability") {
  window.localStorage.setItem("movra.accessToken", "access-token");
  window.localStorage.setItem("movra.refreshToken", "refresh-token");
  window.history.pushState({}, "", path);
}

function createRelation(
  override: Partial<AccountabilityRelation> = {},
): AccountabilityRelation {
  return {
    accountabilityRelationId: "relation-1",
    allowedTargets: ["FOCUS_SESSION"],
    subjectUserId: "subject-user",
    watcherConnected: false,
    watcherUserId: null,
    ...override,
  };
}

function createInviteStatus(
  override: Partial<InviteCodeStatus> = {},
): InviteCodeStatus {
  return {
    expired: false,
    expiredAt: "2026-04-25T09:00:00",
    inviteCode: "INVITE15",
    reissuable: true,
    watcherConnected: false,
    ...override,
  };
}

function setupAccountabilityHandlers(
  initialState: Partial<AccountabilityState> = {},
) {
  const state: AccountabilityState = {
    inviteStatus: null,
    subjectRelation: null,
    summaryResponse: { targetDate: "2026-04-24", totalFocusSeconds: 1800 },
    watchingRelations: [],
    ...initialState,
  };

  server.use(
    http.get("http://localhost:8080/accountability-relations/friends", () =>
      HttpResponse.json({
        watchedByFriends: state.subjectRelation ? [state.subjectRelation] : [],
        watchingFriends: state.watchingRelations,
      }),
    ),
    http.get(
      "http://localhost:8080/accountability-relations/invite-code/status",
      () => {
        if (!state.inviteStatus) {
          return HttpResponse.json(
            { message: "Accountability relation not found" },
            { status: 404 },
          );
        }

        return HttpResponse.json(state.inviteStatus);
      },
    ),
    http.post("http://localhost:8080/accountability-relations", async ({
      request,
    }) => {
      const body = (await request.json()) as { targets: MonitoringTarget[] };
      state.subjectRelation = createRelation({
        accountabilityRelationId: "relation-created",
        allowedTargets: body.targets,
      });
      state.inviteStatus = createInviteStatus({
        inviteCode: "CODE15",
      });

      return new HttpResponse(null, { status: 200 });
    }),
    http.post("http://localhost:8080/accountability-relations/join", async ({
      request,
    }) => {
      const body = (await request.json()) as { inviteCode: string };

      if (body.inviteCode !== "FRIEND15") {
        return HttpResponse.json(
          { message: "Invalid invite code" },
          { status: 400 },
        );
      }

      state.watchingRelations = [
        createRelation({
          accountabilityRelationId: "relation-watching",
          allowedTargets: ["FOCUS_SESSION", "TOP_PICKS"],
          subjectUserId: "friend-user",
          watcherConnected: true,
          watcherUserId: "current-user",
        }),
      ];

      return new HttpResponse(null, { status: 200 });
    }),
    http.post(
      "http://localhost:8080/accountability-relations/invite-code/reissue",
      () => {
        state.inviteStatus = createInviteStatus({
          inviteCode: "NEWCODE15",
        });

        return HttpResponse.json({
          expiresAt: "2026-04-26T09:00:00",
          inviteCode: "NEWCODE15",
        });
      },
    ),
    http.patch(
      "http://localhost:8080/accountability-relations/visibility-policy",
      async ({ request }) => {
        const body = (await request.json()) as { targets: MonitoringTarget[] };
        state.subjectRelation = createRelation({
          ...(state.subjectRelation ?? {}),
          allowedTargets: body.targets,
        });

        return HttpResponse.json(state.subjectRelation);
      },
    ),
    http.delete("http://localhost:8080/accountability-relations/watcher", () => {
      if (state.subjectRelation) {
        state.subjectRelation = {
          ...state.subjectRelation,
          watcherConnected: false,
          watcherUserId: null,
        };
      }
      if (state.inviteStatus) {
        state.inviteStatus = {
          ...state.inviteStatus,
          reissuable: true,
          watcherConnected: false,
        };
      }

      return new HttpResponse(null, { status: 200 });
    }),
    http.delete("http://localhost:8080/accountability-relations/watching", () => {
      state.watchingRelations = [];

      return new HttpResponse(null, { status: 200 });
    }),
    http.get(
      "http://localhost:8080/accountability-relations/watcher/focus-sessions",
      () => {
        if (state.summaryResponse === "empty") {
          return new HttpResponse(null, { status: 204 });
        }

        if (state.summaryResponse === "forbidden") {
          return HttpResponse.json(
            { message: "Monitoring target not allowed" },
            { status: 403 },
          );
        }

        return HttpResponse.json(state.summaryResponse);
      },
    ),
    http.get(
      "http://localhost:8080/accountability-relations/watcher/top-picks",
      () =>
        HttpResponse.json(
          { message: "Monitoring target not allowed" },
          { status: 403 },
        ),
    ),
    http.post("http://localhost:8080/analytics/events", () =>
      HttpResponse.json({
        analyticsEventId: "event-1",
        eventType: "ACCOUNTABILITY_INVITE_SENT",
        occurredAt: "2026-04-24T01:00:00Z",
        properties: {},
      }),
    ),
  );

  return state;
}

describe("AccountabilityPage", () => {
  it("routes overview CTA to sharing and opens the invite-code modal", async () => {
    const user = userEvent.setup();
    setupAccountabilityHandlers();
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "친구 동행" }, { timeout: 5000 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "내 진행 공유 시작" }));
    expect(window.location.pathname).toBe("/accountability/share");
    expect(
      await screen.findByRole("heading", { name: "공개 범위" }),
    ).toBeInTheDocument();

    await user.click(
      within(screen.getByRole("navigation", { name: "친구 동행 화면" })).getByRole(
        "link",
        { name: "홈" },
      ),
    );
    await user.click(screen.getByRole("button", { name: "친구 코드 입력" }));
    expect(window.location.pathname).toBe("/accountability");
    const dialog = await screen.findByRole("dialog", { name: "친구 코드 입력" });
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "이 코드를 입력하면 내가 감시자가 되어 친구가 허용한 진행 요약을 볼 수 있어요.",
      ),
    ).toBeInTheDocument();
  });

  it("hides the code input CTA after a watching relation exists", async () => {
    setupAccountabilityHandlers({
      watchingRelations: [
        createRelation({
          accountabilityRelationId: "relation-watching",
          allowedTargets: ["FOCUS_SESSION", "TOP_PICKS"],
          subjectUserId: "friend-user",
          watcherConnected: true,
          watcherUserId: "current-user",
        }),
      ],
    });
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "친구 동행" }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "친구 진행 보기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "친구 코드 입력" })).toBeNull();
  });

  it("opens invite-code management from the overview", async () => {
    const user = userEvent.setup();
    setupAccountabilityHandlers({
      inviteStatus: createInviteStatus({ inviteCode: "CODE15" }),
      subjectRelation: createRelation({
        accountabilityRelationId: "relation-created",
        allowedTargets: ["FOCUS_SESSION", "TOP_PICKS"],
      }),
    });
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "친구 동행" }, { timeout: 5000 }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "초대 코드 조회/생성" }));

    const dialog = await screen.findByRole("dialog", {
      name: "초대 코드 조회/생성",
    });
    expect(within(dialog).getByText("CODE15")).toBeInTheDocument();
    expect(screen.getByText("집중 기록, TopPick")).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: "초대 코드 재생성" }),
    );
    expect(await within(dialog).findByText("NEWCODE15")).toBeInTheDocument();
  });

  it("creates a relation from the share page without showing invite-code controls", async () => {
    const user = userEvent.setup();
    setupAccountabilityHandlers();
    authenticate("/accountability/share");

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "친구 동행" }, { timeout: 5000 }),
    ).toBeInTheDocument();
    await user.click(screen.getByLabelText(/TopPick/));
    await user.click(screen.getByRole("button", { name: "공유 시작" }));

    expect(
      await screen.findByText("공유 관계를 만들었어요. 홈에서 초대 코드를 확인해 주세요."),
    ).toBeInTheDocument();
    expect(screen.getByText("집중 기록, TopPick")).toBeInTheDocument();
    expect(screen.queryByText("CODE15")).toBeNull();
    expect(screen.queryByRole("button", { name: "초대 코드 조회/생성" })).toBeNull();
    expect(screen.queryByText("relation-created")).toBeNull();
    expect(screen.queryByText("subject-user")).toBeNull();
  });

  it("keeps the join success UI and moves to watch when analytics fails", async () => {
    const user = userEvent.setup();
    setupAccountabilityHandlers();
    server.use(
      http.post("http://localhost:8080/analytics/events", () =>
        HttpResponse.json({ message: "analytics failed" }, { status: 500 }),
      ),
    );
    authenticate("/accountability/join");

    render(<App />);

    await screen.findByRole("heading", { name: "친구 동행" });
    const dialog = await screen.findByRole("dialog", { name: "친구 코드 입력" });
    await user.type(within(dialog).getByLabelText("친구 초대 코드"), "FRIEND15");
    await user.click(within(dialog).getByRole("button", { name: "코드로 참여" }));

    expect(
      await screen.findByText("친구 동행 참여가 완료됐어요."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(window.location.pathname).toBe("/accountability/watch"),
    );
    expect(await screen.findByText("연결된 친구 1")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows empty and invalid code states before or after join submission", async () => {
    const user = userEvent.setup();
    setupAccountabilityHandlers();
    authenticate("/accountability/join");

    render(<App />);

    await screen.findByRole("heading", { name: "친구 동행" });
    const dialog = await screen.findByRole("dialog", { name: "친구 코드 입력" });
    await user.click(within(dialog).getByRole("button", { name: "코드로 참여" }));

    expect(
      await within(dialog).findByText("친구 초대 코드를 입력해 주세요."),
    ).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("친구 초대 코드"), "WRONG");
    await user.click(within(dialog).getByRole("button", { name: "코드로 참여" }));

    expect(await within(dialog).findByText("Invalid invite code")).toBeInTheDocument();
  });

  it("updates visibility and disconnects watcher and watching relations", async () => {
    const user = userEvent.setup();
    setupAccountabilityHandlers({
      inviteStatus: createInviteStatus({
        reissuable: false,
        watcherConnected: true,
      }),
      subjectRelation: createRelation({
        watcherConnected: true,
        watcherUserId: "watcher-user",
      }),
      watchingRelations: [
        createRelation({
          accountabilityRelationId: "relation-watching",
          allowedTargets: ["FOCUS_SESSION"],
          subjectUserId: "friend-user",
          watcherConnected: true,
          watcherUserId: "current-user",
        }),
      ],
    });
    authenticate("/accountability/share");

    render(<App />);

    await screen.findByRole("heading", { name: "친구 동행" });
    await user.click(screen.getByLabelText(/TopPick/));
    await user.click(screen.getByRole("button", { name: "공개 범위 저장" }));

    expect(await screen.findByText("공개 범위를 수정했어요.")).toBeInTheDocument();
    expect(screen.getByText("집중 기록, TopPick")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "홈" }));
    await user.click(screen.getByRole("button", { name: "보는 친구 해제" }));
    expect(await screen.findByText("연결된 친구를 해제했어요.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByText("초대 대기").length).toBeGreaterThan(0),
    );

    await user.click(screen.getByRole("link", { name: /친구 보기/ }));
    await user.click(screen.getByRole("button", { name: "해제" }));
    expect(await screen.findByText("보는 관계를 해제했어요.")).toBeInTheDocument();
    expect(await screen.findByText("아직 연결된 친구가 없어요.")).toBeInTheDocument();
  });

  it("disables summary targets that the friend did not allow", async () => {
    setupAccountabilityHandlers({
      watchingRelations: [
        createRelation({
          accountabilityRelationId: "relation-watching",
          allowedTargets: ["FOCUS_SESSION"],
          subjectUserId: "friend-user",
          watcherConnected: true,
          watcherUserId: "current-user",
        }),
      ],
    });
    authenticate("/accountability/watch");

    render(<App />);

    await screen.findByRole("heading", { name: "친구 동행" });
    const targetTabs = screen.getByRole("group", { name: "요약 대상" });
    expect(
      within(targetTabs).getByRole("button", { name: "TopPick" }),
    ).toBeDisabled();
    expect(
      within(targetTabs).getByRole("button", { name: "시간표" }),
    ).toBeDisabled();
    expect(
      screen.getByText("미공개 항목"),
    ).toBeInTheDocument();
  });

  it("loads the allowed daily summary when the watch page opens", async () => {
    setupAccountabilityHandlers({
      summaryResponse: {
        targetDate: "2026-04-24",
        totalFocusSeconds: 2400,
      },
      watchingRelations: [
        createRelation({
          accountabilityRelationId: "relation-watching",
          allowedTargets: ["FOCUS_SESSION"],
          subjectUserId: "friend-user",
          watcherConnected: true,
          watcherUserId: "current-user",
        }),
      ],
    });
    authenticate("/accountability/watch");

    render(<App />);

    await screen.findByRole("heading", { name: "친구 동행" });

    expect(await screen.findByText("총 집중 시간(초)")).toBeInTheDocument();
    expect(screen.getByText("2400")).toBeInTheDocument();
  });

  it("shows an empty state when the summary endpoint returns 204 No Content", async () => {
    setupAccountabilityHandlers({
      summaryResponse: "empty",
      watchingRelations: [
        createRelation({
          accountabilityRelationId: "relation-watching",
          allowedTargets: ["FOCUS_SESSION"],
          subjectUserId: "friend-user",
          watcherConnected: true,
          watcherUserId: "current-user",
        }),
      ],
    });
    authenticate("/accountability/watch");

    render(<App />);

    await screen.findByRole("heading", { name: "친구 동행" });

    expect(await screen.findByText("요약 데이터가 없습니다.")).toBeInTheDocument();
  });

  it("blocks an invalid summary date range before requesting the API", async () => {
    const user = userEvent.setup();
    const rangeRequest = vi.fn();
    setupAccountabilityHandlers({
      watchingRelations: [
        createRelation({
          accountabilityRelationId: "relation-watching",
          allowedTargets: ["FOCUS_SESSION"],
          subjectUserId: "friend-user",
          watcherConnected: true,
          watcherUserId: "current-user",
        }),
      ],
    });
    server.use(
      http.get(
        "http://localhost:8080/accountability-relations/watcher/focus-sessions/range",
        () => {
          rangeRequest();

          return HttpResponse.json({ days: [] });
        },
      ),
    );
    authenticate("/accountability/watch");

    render(<App />);

    await screen.findByRole("heading", { name: "친구 동행" });
    await user.click(screen.getByRole("button", { name: "기간" }));
    await user.clear(screen.getByLabelText("시작 날짜"));
    await user.type(screen.getByLabelText("시작 날짜"), "2026-04-25");
    await user.clear(screen.getByLabelText("종료 날짜"));
    await user.type(screen.getByLabelText("종료 날짜"), "2026-04-20");
    await user.click(screen.getByRole("button", { name: "요약 조회" }));

    expect(
      await screen.findByText("시작 날짜는 종료 날짜보다 늦을 수 없습니다."),
    ).toBeInTheDocument();
    expect(rangeRequest).not.toHaveBeenCalled();
  });

  it("hides identifier fields from generic summary responses", async () => {
    setupAccountabilityHandlers({
      summaryResponse: {
        days: [
          {
            focusSessionId: "focus-session-secret",
            totalFocusSeconds: 1200,
          },
        ],
        targetDate: "2026-04-24",
        task: {
          content: "수학 오답 정리",
          taskId: "task-secret",
        },
      },
      watchingRelations: [
        createRelation({
          accountabilityRelationId: "relation-watching",
          allowedTargets: ["FOCUS_SESSION"],
          subjectUserId: "friend-user",
          watcherConnected: true,
          watcherUserId: "current-user",
        }),
      ],
    });
    authenticate("/accountability/watch");

    render(<App />);

    await screen.findByRole("heading", { name: "친구 동행" });

    expect(await screen.findByText(/수학 오답 정리/)).toBeInTheDocument();
    expect(screen.getByText(/1200/)).toBeInTheDocument();
    expect(screen.queryByText(/task-secret/)).toBeNull();
    expect(screen.queryByText(/focus-session-secret/)).toBeNull();
  });
});
