import { HttpResponse, http } from "msw";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../app/App";
import type {
  FocusSession,
  HomeToday,
  RecoveryCard,
  RecoveryCardAction,
  TodayFocusSessions,
} from "../features/core-loop/types";
import type {
  DailyReflection,
  DailyReflectionRequest,
  DailyReflectionUpdateRequest,
} from "../features/feedback/api";
import { createHomeTodayFixture } from "../test/fixtures";
import { server } from "../test/server";

type SetupFocusHandlersOptions = {
  failFocusTimes?: number;
  initialFocusSessions?: TodayFocusSessions;
  initialHome?: HomeToday;
  recoveryCard?: RecoveryCard;
};

function authenticate(path = "/focus") {
  window.localStorage.setItem("movra.accessToken", "access-token");
  window.localStorage.setItem("movra.refreshToken", "refresh-token");
  window.history.pushState({}, "", path);
}

function createFocusSession(
  override: Partial<FocusSession> = {},
): FocusSession {
  return {
    elapsedSeconds: 0,
    endedAt: null,
    focusSessionId: "focus-session-id",
    inProgress: true,
    presetCompletionRate: null,
    presetMinutes: 5,
    presetSeconds: 300,
    recordedElapsedSeconds: null,
    startedAt: new Date().toISOString(),
    ...override,
  };
}

function createTodayFocusSessions(
  override: Partial<TodayFocusSessions> = {},
): TodayFocusSessions {
  return {
    focusing: false,
    queriedAt: new Date().toISOString(),
    sessions: [],
    targetDate: "2026-04-24",
    totalFocusSeconds: 0,
    ...override,
  };
}

function createRecoveryCard(override: Partial<RecoveryCard> = {}): RecoveryCard {
  return {
    daysSinceLastSession: null,
    daysSinceRecentExam: null,
    needsRecovery: false,
    postExamMode: false,
    recentExamDate: null,
    recentExamScheduleId: null,
    recentExamSubject: null,
    recentExamTitle: null,
    recentExamType: null,
    recoveryType: "NONE",
    suggestedAction: null,
    suggestedDurationMinutes: null,
    yesterdayFocusSeconds: 0,
    yesterdayTopPickCompletionRate: 0,
    ...override,
  };
}

function setupFocusHandlers({
  failFocusTimes = 0,
  initialFocusSessions = createTodayFocusSessions(),
  initialHome = createHomeTodayFixture(),
  recoveryCard = createRecoveryCard(),
}: SetupFocusHandlersOptions = {}) {
  let home = initialHome;
  let focusSessions = initialFocusSessions;
  let remainingFocusFailures = failFocusTimes;
  let savedDailyReflection: DailyReflection | null = null;
  const dailyReflectionRequests: DailyReflectionRequest[] = [];
  const dailyReflectionUpdateRequests: DailyReflectionUpdateRequest[] = [];
  const recoveryActions: RecoveryCardAction[] = [];
  const startRequests: number[] = [];
  const stopRequests: string[] = [];

  function syncActiveSession(activeFocusSession: FocusSession | null) {
    home = {
      ...home,
      activeFocusSession,
      focusSessions,
    };
  }

  server.use(
    http.get("http://localhost:8080/home/today", () => HttpResponse.json(home)),
    http.get("http://localhost:8080/focus-sessions/today", () => {
      if (remainingFocusFailures > 0) {
        remainingFocusFailures -= 1;
        return HttpResponse.json(
          {
            message: "집중 데이터를 불러오지 못했습니다.",
            statusCode: 500,
          },
          { status: 500 },
        );
      }

      return HttpResponse.json(focusSessions);
    }),
    http.get("http://localhost:8080/focus-sessions/recovery-card", () =>
      HttpResponse.json(recoveryCard),
    ),
    http.get("http://localhost:8080/daily-reflections", () => {
      if (!savedDailyReflection) {
        return HttpResponse.json(
          {
            message: "Daily Reflection을 찾을 수 없습니다.",
            statusCode: 404,
          },
          { status: 404 },
        );
      }

      return HttpResponse.json(savedDailyReflection);
    }),
    http.post("http://localhost:8080/focus-sessions/start", async ({ request }) => {
      const body = (await request.json()) as { presetMinutes: 3 | 5 | 10 | 25 };
      startRequests.push(body.presetMinutes);
      const activeFocusSession = createFocusSession({
        focusSessionId: `focus-session-${startRequests.length}`,
        presetMinutes: body.presetMinutes,
        presetSeconds: body.presetMinutes * 60,
      });

      focusSessions = {
        ...focusSessions,
        focusing: true,
        queriedAt: new Date().toISOString(),
        sessions: [activeFocusSession, ...focusSessions.sessions],
      };
      syncActiveSession(activeFocusSession);

      return HttpResponse.json(activeFocusSession);
    }),
    http.patch("http://localhost:8080/focus-sessions/stop", () => {
      stopRequests.push("STOP");
      const activeFocusSession =
        focusSessions.sessions.find((session) => session.inProgress) ??
        createFocusSession();
      const completedFocusSession = {
        ...activeFocusSession,
        elapsedSeconds: activeFocusSession.presetSeconds,
        endedAt: new Date().toISOString(),
        inProgress: false,
        presetCompletionRate: 1,
        recordedElapsedSeconds: activeFocusSession.presetSeconds,
      };

      focusSessions = {
        ...focusSessions,
        focusing: false,
        queriedAt: new Date().toISOString(),
        sessions: focusSessions.sessions.map((session) =>
          session.focusSessionId === completedFocusSession.focusSessionId
            ? completedFocusSession
            : session,
        ),
        totalFocusSeconds:
          focusSessions.totalFocusSeconds + completedFocusSession.elapsedSeconds,
      };
      syncActiveSession(null);

      return HttpResponse.json(completedFocusSession);
    }),
    http.post(
      "http://localhost:8080/focus-sessions/recovery-card/actions",
      async ({ request }) => {
        const body = (await request.json()) as { action: RecoveryCardAction };
        recoveryActions.push(body.action);

        return new HttpResponse(null, { status: 204 });
      },
    ),
    http.post("http://localhost:8080/daily-reflections", async ({ request }) => {
      const body = (await request.json()) as DailyReflectionRequest;
      dailyReflectionRequests.push(body);
      savedDailyReflection = {
        dailyReflectionId: "daily-reflection-id",
        ...body,
      };

      return new HttpResponse(null, { status: 200 });
    }),
    http.patch(
      "http://localhost:8080/daily-reflections/:dailyReflectionId",
      async ({ request }) => {
        const body = (await request.json()) as DailyReflectionUpdateRequest;
        dailyReflectionUpdateRequests.push(body);
        if (savedDailyReflection) {
          savedDailyReflection = {
            ...savedDailyReflection,
            ...body,
          };
        }

        return new HttpResponse(null, { status: 200 });
      },
    ),
  );

  return {
    getDailyReflectionRequests: () => dailyReflectionRequests,
    getDailyReflectionUpdateRequests: () => dailyReflectionUpdateRequests,
    getRecoveryActions: () => recoveryActions,
    getStartRequests: () => startRequests,
    getStopRequests: () => stopRequests,
  };
}

describe("FocusPage", () => {
  it("renders the focus page instead of the placeholder", async () => {
    setupFocusHandlers();
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Focus" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "기능 미구현" })).toBeNull();
  });

  it("starts and stops a focus session from the timer stage", async () => {
    const user = userEvent.setup();
    const handlers = setupFocusHandlers();
    authenticate();

    render(<App />);

    expect(await screen.findByText("00:00")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "10분" }));
    await user.click(screen.getByRole("button", { name: "Focus 시작하기" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "집중 세션을 시작했습니다.",
    );
    expect(handlers.getStartRequests()).toEqual([10]);

    expect(await screen.findByText("경과 시간")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Focus 멈추기" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "집중 세션을 멈췄습니다.",
    );
    expect(await screen.findAllByText("10m")).not.toHaveLength(0);
  });

  it("runs the continuous timer locally without focus session API calls", async () => {
    const user = userEvent.setup();
    const handlers = setupFocusHandlers();
    authenticate();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "계속" }));
    await user.click(screen.getByRole("button", { name: "Focus 시작하기" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "계속 Focus를 시작했습니다. 이 타이머는 아직 서버에 기록되지 않습니다.",
    );
    expect(await screen.findByText("계속 Focus가 켜져 있어요")).toBeInTheDocument();
    expect(handlers.getStartRequests()).toEqual([]);

    await user.click(screen.getByRole("button", { name: "잠시 멈춤" }));
    expect(await screen.findByText("타이머를 잠시 세워뒀어요.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "시간 초기화" }));
    expect(screen.getByText("00:00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 흐르게" }));
    await user.click(screen.getByRole("button", { name: "Focus 멈추기" }));

    expect(await screen.findByText("계속 Focus를 멈췄습니다.")).toBeInTheDocument();
    expect(handlers.getStartRequests()).toEqual([]);
    expect(handlers.getStopRequests()).toEqual([]);
  });

  it("shows an in-progress session and lets users stop it", async () => {
    const user = userEvent.setup();
    const activeFocusSession = createFocusSession({
      elapsedSeconds: 120,
      presetMinutes: 5,
      presetSeconds: 300,
    });
    setupFocusHandlers({
      initialFocusSessions: createTodayFocusSessions({
        focusing: true,
        sessions: [activeFocusSession],
      }),
      initialHome: createHomeTodayFixture({
        activeFocusSession,
        focusSessions: createTodayFocusSessions({
          focusing: true,
          sessions: [activeFocusSession],
        }),
      }),
    });
    authenticate();

    render(<App />);

    expect(await screen.findAllByText("진행 중")).not.toHaveLength(0);
    expect(await screen.findByText("02:00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Focus 멈추기" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "집중 세션을 멈췄습니다.",
    );
  });

  it("opens Recovery Card as a modal and saves a recovery reflection", async () => {
    const user = userEvent.setup();
    const handlers = setupFocusHandlers({
      recoveryCard: createRecoveryCard({
        daysSinceLastSession: 3,
        needsRecovery: true,
        recoveryType: "MISSED_FOCUS",
        suggestedAction: "어제는 쉬어갔어요. 지금 바로 시작해볼까요?",
        suggestedDurationMinutes: 3,
      }),
    });
    authenticate();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "카드 열기" }));
    expect(
      await screen.findByRole("dialog", { name: "다시 시작하기" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "회복 기록 남기기" }));
    await user.type(
      screen.getByLabelText("무너진 지점"),
      "점심 이후 휴대폰을 오래 봤다",
    );
    await user.type(
      screen.getByLabelText("If"),
      "휴대폰이 눈에 들어오면",
    );
    await user.type(
      screen.getByLabelText("Then"),
      "책상 밖에 두고 3분 타이머를 켠다",
    );
    await user.click(screen.getByRole("button", { name: "회복 기록 저장" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "회복 기록을 저장했습니다.",
    );
    expect(await screen.findByText("저장된 회복 기록")).toBeInTheDocument();
    expect(
      screen.getByText("점심 이후 휴대폰을 오래 봤다"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("책상 밖에 두고 3분 타이머를 켠다"),
    ).toBeInTheDocument();
    expect(handlers.getRecoveryActions()).toEqual(["REFLECT"]);
    expect(handlers.getDailyReflectionRequests()).toEqual([
      {
        ifCondition: "휴대폰이 눈에 들어오면",
        reflectionDate: "2026-04-24",
        thenAction: "책상 밖에 두고 3분 타이머를 켠다",
        whatBrokeDown: "점심 이후 휴대폰을 오래 봤다",
        whatWentWell: "다시 돌아오려고 앱을 열었습니다.",
      },
    ]);

    await user.click(screen.getByRole("button", { name: "수정하기" }));
    await user.clear(screen.getByLabelText("Then"));
    await user.type(
      screen.getByLabelText("Then"),
      "책상을 치우고 5분 타이머를 켠다",
    );
    await user.click(screen.getByRole("button", { name: "회복 기록 수정" }));

    expect(
      await screen.findByText("회복 기록을 수정했습니다."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("책상을 치우고 5분 타이머를 켠다"),
    ).toBeInTheDocument();
    expect(handlers.getDailyReflectionUpdateRequests()).toEqual([
      {
        ifCondition: "휴대폰이 눈에 들어오면",
        thenAction: "책상을 치우고 5분 타이머를 켠다",
        whatBrokeDown: "점심 이후 휴대폰을 오래 봤다",
        whatWentWell: "다시 돌아오려고 앱을 열었습니다.",
      },
    ]);
  });

  it("links to the full reflection page from the recovery modal", async () => {
    const user = userEvent.setup();
    setupFocusHandlers({
      recoveryCard: createRecoveryCard({
        needsRecovery: true,
        recoveryType: "MISSED_FOCUS",
        suggestedAction: "다시 켜볼까요?",
        suggestedDurationMinutes: 5,
      }),
    });
    authenticate();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "카드 열기" }));
    const reflectionLink = await screen.findByRole("link", {
      name: /전체 회고 보기/,
    });
    expect(reflectionLink).toHaveAttribute("href", "/reflection");
  });

  it("starts Recovery Focus from the modal with the suggested preset", async () => {
    const user = userEvent.setup();
    const handlers = setupFocusHandlers({
      recoveryCard: createRecoveryCard({
        needsRecovery: true,
        recoveryType: "LONG_ABSENCE",
        suggestedAction: "3분만 다시 켜볼까요?",
        suggestedDurationMinutes: 3,
      }),
    });
    authenticate();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "카드 열기" }));
    await user.click(
      await screen.findByRole("button", { name: "3분으로 복귀 시작" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "복귀 Focus를 시작했습니다.",
    );
    expect(handlers.getRecoveryActions()).toEqual(["START"]);
    expect(handlers.getStartRequests()).toEqual([3]);
  });

  it("links to Tiny Win creation after a server preset focus stop", async () => {
    const user = userEvent.setup();
    setupFocusHandlers();
    authenticate();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "5분" }));
    await user.click(screen.getByRole("button", { name: "Focus 시작하기" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "집중 세션을 시작했습니다.",
    );

    await user.click(screen.getByRole("button", { name: "Focus 멈추기" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "집중 세션을 멈췄습니다.",
    );

    const tinyWinLink = await screen.findByRole("link", {
      name: /작은 성취/,
    });
    expect(tinyWinLink).toHaveAttribute("href", "/reflection?focus=new");

    await user.click(screen.getByRole("button", { name: "닫기" }));
    expect(
      screen.queryByRole("link", { name: /작은 성취/ }),
    ).not.toBeInTheDocument();
  });

  it("renders post-exam fields in the recovery modal when postExamMode is on", async () => {
    const user = userEvent.setup();
    setupFocusHandlers({
      recoveryCard: createRecoveryCard({
        daysSinceRecentExam: 2,
        needsRecovery: true,
        postExamMode: true,
        recentExamDate: "2026-04-22",
        recentExamScheduleId: "exam-1",
        recentExamSubject: "수학",
        recentExamTitle: "중간고사",
        recentExamType: "NAESIN",
        recoveryType: "POST_EXAM_RECOVERY",
        suggestedAction: "시험 직후니 살살 풀어볼까요?",
        suggestedDurationMinutes: 5,
      }),
    });
    authenticate();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "카드 열기" }));

    expect(await screen.findByText("중간고사")).toBeInTheDocument();
    expect(screen.getByText("수학")).toBeInTheDocument();
    expect(screen.getByText("2026-04-22")).toBeInTheDocument();
    expect(screen.getByText("2일 전")).toBeInTheDocument();
  });

  it("does not render post-exam fields when postExamMode is off", async () => {
    const user = userEvent.setup();
    setupFocusHandlers({
      recoveryCard: createRecoveryCard({
        needsRecovery: true,
        postExamMode: false,
        recentExamTitle: "중간고사",
        recoveryType: "MISSED_FOCUS",
        suggestedAction: "다시 켜볼까요?",
        suggestedDurationMinutes: 3,
      }),
    });
    authenticate();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "카드 열기" }));
    await screen.findByRole("dialog", { name: "다시 시작하기" });

    expect(screen.queryByText("중간고사")).not.toBeInTheDocument();
  });

  it("does not show Tiny Win link after a continuous focus stop", async () => {
    const user = userEvent.setup();
    setupFocusHandlers();
    authenticate();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "계속" }));
    await user.click(screen.getByRole("button", { name: "Focus 시작하기" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "계속 Focus를 시작했습니다. 이 타이머는 아직 서버에 기록되지 않습니다.",
    );

    await user.click(screen.getByRole("button", { name: "Focus 멈추기" }));
    expect(await screen.findByText("계속 Focus를 멈췄습니다.")).toBeInTheDocument();

    expect(
      screen.queryByRole("link", { name: /작은 성취/ }),
    ).not.toBeInTheDocument();
  });

  it("shows a retry state when focus data fails to load", async () => {
    const user = userEvent.setup();
    setupFocusHandlers({ failFocusTimes: 2 });
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "집중 데이터를 불러오지 못했습니다.",
      }, { timeout: 5000 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(
      await screen.findByRole("heading", { name: "Focus" }),
    ).toBeInTheDocument();
  });
});
