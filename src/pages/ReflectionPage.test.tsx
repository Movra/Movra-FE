import { HttpResponse, http } from "msw";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../app/App";
import type { HomeToday } from "../features/core-loop/types";
import type {
  DailyReflection,
  DailyReflectionRequest,
  DailyReflectionUpdateRequest,
  TinyWin,
  TinyWinContentRequest,
  TinyWinCreateRequest,
  TinyWinTitleRequest,
} from "../features/feedback/api";
import { createHomeTodayFixture } from "../test/fixtures";
import { server } from "../test/server";

type SetupReflectionHandlersOptions = {
  conflictOnCreate?: boolean;
  failTinyWinsListTimes?: number;
  initialHome?: HomeToday;
  initialReflection?: DailyReflection | null;
  initialTinyWins?: TinyWin[];
};

function authenticate(path = "/reflection") {
  window.localStorage.setItem("movra.accessToken", "access-token");
  window.localStorage.setItem("movra.refreshToken", "refresh-token");
  window.history.pushState({}, "", path);
}

function setupReflectionHandlers({
  conflictOnCreate = false,
  failTinyWinsListTimes = 0,
  initialHome = createHomeTodayFixture(),
  initialReflection = null,
  initialTinyWins = [],
}: SetupReflectionHandlersOptions = {}) {
  const home = initialHome;
  let reflection = initialReflection;
  let tinyWins = initialTinyWins;
  let nextIndex = 100;
  let remainingTinyWinFailures = failTinyWinsListTimes;
  const reflectionCreates: DailyReflectionRequest[] = [];
  const reflectionUpdates: DailyReflectionUpdateRequest[] = [];
  const tinyWinCreates: TinyWinCreateRequest[] = [];
  const tinyWinTitleUpdates: Array<{
    tinyWinId: string;
    values: TinyWinTitleRequest;
  }> = [];
  const tinyWinContentUpdates: Array<{
    tinyWinId: string;
    values: TinyWinContentRequest;
  }> = [];
  const tinyWinDeletes: string[] = [];

  server.use(
    http.get("http://localhost:8080/home/today", () => HttpResponse.json(home)),
    http.get("http://localhost:8080/daily-reflections", () => {
      if (!reflection) {
        return HttpResponse.json(
          {
            message: "Daily Reflection을 찾을 수 없습니다.",
            statusCode: 404,
          },
          { status: 404 },
        );
      }
      return HttpResponse.json(reflection);
    }),
    http.post(
      "http://localhost:8080/daily-reflections",
      async ({ request }) => {
        const body = (await request.json()) as DailyReflectionRequest;
        if (conflictOnCreate) {
          return HttpResponse.json(
            {
              message: "이미 오늘 회고가 있습니다.",
              statusCode: 409,
            },
            { status: 409 },
          );
        }
        reflectionCreates.push(body);
        reflection = {
          dailyReflectionId: "daily-reflection-id",
          ...body,
        };
        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.patch(
      "http://localhost:8080/daily-reflections/:dailyReflectionId",
      async ({ request }) => {
        const body = (await request.json()) as DailyReflectionUpdateRequest;
        reflectionUpdates.push(body);
        if (reflection) {
          reflection = { ...reflection, ...body };
        }
        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.get("http://localhost:8080/tiny-wins", () => {
      if (remainingTinyWinFailures > 0) {
        remainingTinyWinFailures -= 1;
        return HttpResponse.json(
          {
            message: "Tiny Win 목록을 불러오지 못했습니다.",
            statusCode: 500,
          },
          { status: 500 },
        );
      }
      return HttpResponse.json(tinyWins);
    }),
    http.get(
      "http://localhost:8080/tiny-wins/:tinyWinId",
      ({ params }) => {
        const target = tinyWins.find(
          (tinyWin) => tinyWin.tinyWinId === String(params.tinyWinId),
        );
        if (!target) {
          return HttpResponse.json(
            { message: "찾을 수 없습니다.", statusCode: 404 },
            { status: 404 },
          );
        }
        return HttpResponse.json(target);
      },
    ),
    http.post("http://localhost:8080/tiny-wins", async ({ request }) => {
      const body = (await request.json()) as TinyWinCreateRequest;
      tinyWinCreates.push(body);
      const tinyWinId = `tiny-win-${nextIndex}`;
      nextIndex += 1;
      tinyWins = [
        {
          content: body.content,
          localDate: home.targetDate,
          tinyWinId,
          title: body.title,
        },
        ...tinyWins,
      ];
      return new HttpResponse(null, { status: 200 });
    }),
    http.patch(
      "http://localhost:8080/tiny-wins/:tinyWinId/title",
      async ({ params, request }) => {
        const body = (await request.json()) as TinyWinTitleRequest;
        const tinyWinId = String(params.tinyWinId);
        tinyWinTitleUpdates.push({ tinyWinId, values: body });
        tinyWins = tinyWins.map((tinyWin) =>
          tinyWin.tinyWinId === tinyWinId
            ? { ...tinyWin, title: body.title }
            : tinyWin,
        );
        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.patch(
      "http://localhost:8080/tiny-wins/:tinyWinId/content",
      async ({ params, request }) => {
        const body = (await request.json()) as TinyWinContentRequest;
        const tinyWinId = String(params.tinyWinId);
        tinyWinContentUpdates.push({ tinyWinId, values: body });
        tinyWins = tinyWins.map((tinyWin) =>
          tinyWin.tinyWinId === tinyWinId
            ? { ...tinyWin, content: body.content }
            : tinyWin,
        );
        return new HttpResponse(null, { status: 200 });
      },
    ),
    http.delete(
      "http://localhost:8080/tiny-wins/:tinyWinId",
      ({ params }) => {
        const tinyWinId = String(params.tinyWinId);
        tinyWinDeletes.push(tinyWinId);
        tinyWins = tinyWins.filter(
          (tinyWin) => tinyWin.tinyWinId !== tinyWinId,
        );
        return new HttpResponse(null, { status: 200 });
      },
    ),
  );

  return {
    getReflectionCreates: () => reflectionCreates,
    getReflectionUpdates: () => reflectionUpdates,
    getTinyWinContentUpdates: () => tinyWinContentUpdates,
    getTinyWinCreates: () => tinyWinCreates,
    getTinyWinDeletes: () => tinyWinDeletes,
    getTinyWinTitleUpdates: () => tinyWinTitleUpdates,
    setConflictOnCreate: (next: boolean) => {
      conflictOnCreate = next;
    },
  };
}

describe("ReflectionPage", () => {
  it("renders the reflection page instead of the placeholder", async () => {
    setupReflectionHandlers();
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "회고" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "기능 미구현" })).toBeNull();
  });

  it("creates a daily reflection when none exists for today", async () => {
    const user = userEvent.setup();
    const handlers = setupReflectionHandlers();
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "회고" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("오늘 잘한 것"), {
      target: { value: "아침 계획대로 시작했다" },
    });
    fireEvent.change(screen.getByLabelText("무너진 지점"), {
      target: { value: "점심 이후 핸드폰" },
    });
    fireEvent.change(screen.getByLabelText("If"), {
      target: { value: "핸드폰이 눈에 들어오면" },
    });
    fireEvent.change(screen.getByLabelText("Then"), {
      target: { value: "서랍에 넣는다" },
    });
    await user.click(screen.getByRole("button", { name: "회고 저장" }));

    expect(
      await screen.findByText("회고를 저장했습니다."),
    ).toBeInTheDocument();
    expect(handlers.getReflectionCreates()).toEqual([
      {
        ifCondition: "핸드폰이 눈에 들어오면",
        reflectionDate: "2026-04-24",
        thenAction: "서랍에 넣는다",
        whatBrokeDown: "점심 이후 핸드폰",
        whatWentWell: "아침 계획대로 시작했다",
      },
    ]);
  });

  it("loads and edits an existing daily reflection for today", async () => {
    const user = userEvent.setup();
    const handlers = setupReflectionHandlers({
      initialReflection: {
        dailyReflectionId: "daily-reflection-1",
        ifCondition: "조건",
        reflectionDate: "2026-04-24",
        thenAction: "행동",
        whatBrokeDown: "무너짐",
        whatWentWell: "잘함",
      },
    });
    authenticate();

    render(<App />);

    const wentWell = await screen.findByLabelText("오늘 잘한 것");
    await waitFor(() => expect(wentWell).toHaveValue("잘함"));

    fireEvent.change(wentWell, { target: { value: "수정된 잘함" } });
    await user.click(screen.getByRole("button", { name: "회고 수정" }));

    expect(
      await screen.findByText("회고를 수정했습니다."),
    ).toBeInTheDocument();
    expect(handlers.getReflectionUpdates()).toEqual([
      {
        ifCondition: "조건",
        thenAction: "행동",
        whatBrokeDown: "무너짐",
        whatWentWell: "수정된 잘함",
      },
    ]);
  });

  it("shows duplicate-reflection error when 409 returned", async () => {
    const user = userEvent.setup();
    const handlers = setupReflectionHandlers({ conflictOnCreate: true });
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "회고" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("오늘 잘한 것"), {
      target: { value: "잘함" },
    });
    fireEvent.change(screen.getByLabelText("무너진 지점"), {
      target: { value: "무너짐" },
    });
    fireEvent.change(screen.getByLabelText("If"), {
      target: { value: "조건" },
    });
    fireEvent.change(screen.getByLabelText("Then"), {
      target: { value: "행동" },
    });
    await user.click(screen.getByRole("button", { name: "회고 저장" }));

    expect(
      await screen.findByText(
        "이미 오늘 회고가 저장되어 있습니다. 새로고침 후 수정해주세요.",
      ),
    ).toBeInTheDocument();

    handlers.setConflictOnCreate(false);
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));

    // After reload, no reflection exists yet (server-side state didn't change while
    // 409 was active), so we still see the create form.
    await waitFor(() =>
      expect(
        screen.queryByText(
          "이미 오늘 회고가 저장되어 있습니다. 새로고침 후 수정해주세요.",
        ),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows empty Tiny Win state and creates one", async () => {
    const user = userEvent.setup();
    const handlers = setupReflectionHandlers();
    authenticate();

    render(<App />);

    expect(
      await screen.findByText("아직 남긴 작은 성취가 없어요."),
    ).toBeInTheDocument();

    const addButtons = screen.getAllByRole("button", {
      name: "+ 작은 성취 추가",
    });
    await user.click(addButtons[0]);
    const dialog = await screen.findByRole("dialog", {
      name: "작은 성취 추가",
    });
    fireEvent.change(within(dialog).getByLabelText("제목"), {
      target: { value: "30분 집중" },
    });
    fireEvent.change(within(dialog).getByLabelText("내용"), {
      target: { value: "오늘 30분 집중을 끝냈다." },
    });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));

    expect(
      await screen.findByText("작은 성취를 추가했습니다."),
    ).toBeInTheDocument();
    expect(handlers.getTinyWinCreates()).toEqual([
      {
        content: "오늘 30분 집중을 끝냈다.",
        title: "30분 집중",
      },
    ]);
    expect(await screen.findByText("30분 집중")).toBeInTheDocument();
  });

  it("opens Tiny Win modal, edits title and content separately, saves", async () => {
    const user = userEvent.setup();
    const handlers = setupReflectionHandlers({
      initialTinyWins: [
        {
          content: "내용",
          localDate: "2026-04-24",
          tinyWinId: "tiny-win-existing",
          title: "기존 성취",
        },
      ],
    });
    authenticate();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /기존 성취/ }));
    const dialog = await screen.findByRole("dialog", {
      name: "작은 성취 수정",
    });
    fireEvent.change(within(dialog).getByLabelText("제목"), {
      target: { value: "수정된 성취" },
    });
    fireEvent.change(within(dialog).getByLabelText("내용"), {
      target: { value: "수정된 내용" },
    });
    await user.click(within(dialog).getByRole("button", { name: "저장" }));

    expect(
      await screen.findByText("작은 성취를 수정했습니다."),
    ).toBeInTheDocument();
    expect(handlers.getTinyWinTitleUpdates()).toEqual([
      {
        tinyWinId: "tiny-win-existing",
        values: { title: "수정된 성취" },
      },
    ]);
    expect(handlers.getTinyWinContentUpdates()).toEqual([
      {
        tinyWinId: "tiny-win-existing",
        values: { content: "수정된 내용" },
      },
    ]);
    expect(await screen.findByText("수정된 성취")).toBeInTheDocument();
  });

  it("deletes a Tiny Win after confirmation", async () => {
    const user = userEvent.setup();
    const handlers = setupReflectionHandlers({
      initialTinyWins: [
        {
          content: "삭제할 내용",
          localDate: "2026-04-24",
          tinyWinId: "tiny-win-delete",
          title: "삭제 대상",
        },
      ],
    });
    authenticate();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /삭제 대상/ }));
    const dialog = await screen.findByRole("dialog", {
      name: "작은 성취 수정",
    });
    await user.click(within(dialog).getByRole("button", { name: "삭제" }));
    const confirmDialog = await screen.findByRole("dialog", {
      name: "작은 성취 삭제 확인",
    });
    await user.click(
      within(confirmDialog).getByRole("button", { name: "삭제" }),
    );

    expect(
      await screen.findByText("작은 성취를 삭제했습니다."),
    ).toBeInTheDocument();
    expect(handlers.getTinyWinDeletes()).toEqual(["tiny-win-delete"]);
    await waitFor(() =>
      expect(screen.queryByText("삭제 대상")).not.toBeInTheDocument(),
    );
  });

  it("surfaces a network error with retry", async () => {
    const user = userEvent.setup();
    setupReflectionHandlers({ failTinyWinsListTimes: 2 });
    authenticate();

    render(<App />);

    expect(
      await screen.findByText(
        "작은 성취 목록을 불러오지 못했습니다.",
        undefined,
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(
      await screen.findByText("아직 남긴 작은 성취가 없어요."),
    ).toBeInTheDocument();
  });

  it("auto-focuses Tiny Win create dialog when navigating with focus=new", async () => {
    setupReflectionHandlers();
    authenticate("/reflection?focus=new");

    render(<App />);

    const dialog = await screen.findByRole("dialog", {
      name: "작은 성취 추가",
    });
    const titleInput = within(dialog).getByLabelText("제목");
    await waitFor(() => expect(titleInput).toHaveFocus());
  });
});
