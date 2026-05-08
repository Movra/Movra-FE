import { ApiClientError } from "../../shared/api/client";
import {
  createDailyReflection,
  createTinyWin,
  deleteTinyWin,
  getDailyReflection,
  getTinyWin,
  getTinyWins,
  updateDailyReflection,
  updateTinyWinContent,
  updateTinyWinTitle,
} from "./api";

describe("feedback api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the documented Daily Reflection create endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await createDailyReflection({
      token: "access-token",
      values: {
        ifCondition: "휴대폰이 눈에 들어오면",
        reflectionDate: "2026-04-24",
        thenAction: "책상 밖에 두고 3분 타이머를 켠다",
        whatBrokeDown: "점심 이후 휴대폰을 오래 봤다",
        whatWentWell: "다시 돌아와 기록을 남겼다",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/daily-reflections",
      expect.objectContaining({
        body: JSON.stringify({
          ifCondition: "휴대폰이 눈에 들어오면",
          reflectionDate: "2026-04-24",
          thenAction: "책상 밖에 두고 3분 타이머를 켠다",
          whatBrokeDown: "점심 이후 휴대폰을 오래 봤다",
          whatWentWell: "다시 돌아와 기록을 남겼다",
        }),
        method: "POST",
      }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("calls the documented Daily Reflection read endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          dailyReflectionId: "daily-reflection-id",
          ifCondition: "휴대폰이 눈에 들어오면",
          reflectionDate: "2026-04-24",
          thenAction: "책상 밖에 두고 3분 타이머를 켠다",
          whatBrokeDown: "점심 이후 휴대폰을 오래 봤다",
          whatWentWell: "다시 돌아와 기록을 남겼다",
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getDailyReflection({
        targetDate: "2026-04-24",
        token: "access-token",
      }),
    ).resolves.toEqual({
      dailyReflectionId: "daily-reflection-id",
      ifCondition: "휴대폰이 눈에 들어오면",
      reflectionDate: "2026-04-24",
      thenAction: "책상 밖에 두고 3분 타이머를 켠다",
      whatBrokeDown: "점심 이후 휴대폰을 오래 봤다",
      whatWentWell: "다시 돌아와 기록을 남겼다",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/daily-reflections?targetDate=2026-04-24",
      expect.objectContaining({ method: "GET" }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("treats a missing Daily Reflection as an empty record", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getDailyReflection({
        targetDate: "2026-04-24",
        token: "access-token",
      }),
    ).resolves.toBeNull();
  });

  it("calls the documented Daily Reflection update endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await updateDailyReflection({
      dailyReflectionId: "daily-reflection-id",
      token: "access-token",
      values: {
        ifCondition: "휴대폰이 눈에 들어오면",
        thenAction: "책상 밖에 두고 3분 타이머를 켠다",
        whatBrokeDown: "점심 이후 휴대폰을 오래 봤다",
        whatWentWell: "다시 돌아와 기록을 남겼다",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/daily-reflections/daily-reflection-id",
      expect.objectContaining({
        body: JSON.stringify({
          ifCondition: "휴대폰이 눈에 들어오면",
          thenAction: "책상 밖에 두고 3분 타이머를 켠다",
          whatBrokeDown: "점심 이후 휴대폰을 오래 봤다",
          whatWentWell: "다시 돌아와 기록을 남겼다",
        }),
        method: "PATCH",
      }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });
});

describe("tiny win api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the documented Tiny Win create endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await createTinyWin({
      token: "access-token",
      values: {
        content: "오늘 30분 집중을 끝냈습니다.",
        title: "30분 집중",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/tiny-wins",
      expect.objectContaining({
        body: JSON.stringify({
          content: "오늘 30분 집중을 끝냈습니다.",
          title: "30분 집중",
        }),
        method: "POST",
      }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("calls the documented Tiny Win list endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            content: "오늘 30분 집중을 끝냈습니다.",
            localDate: "2026-04-24",
            tinyWinId: "tiny-win-1",
            title: "30분 집중",
          },
        ]),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTinyWins({ token: "access-token" })).resolves.toEqual([
      {
        content: "오늘 30분 집중을 끝냈습니다.",
        localDate: "2026-04-24",
        tinyWinId: "tiny-win-1",
        title: "30분 집중",
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/tiny-wins",
      expect.objectContaining({ method: "GET" }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("calls the documented Tiny Win detail endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: "오늘 30분 집중을 끝냈습니다.",
          localDate: "2026-04-24",
          tinyWinId: "tiny-win-1",
          title: "30분 집중",
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getTinyWin({ tinyWinId: "tiny-win-1", token: "access-token" }),
    ).resolves.toEqual({
      content: "오늘 30분 집중을 끝냈습니다.",
      localDate: "2026-04-24",
      tinyWinId: "tiny-win-1",
      title: "30분 집중",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/tiny-wins/tiny-win-1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("propagates a Tiny Win 404 via ApiClientError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "찾을 수 없습니다.",
          statusCode: 404,
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 404,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = getTinyWin({
      tinyWinId: "missing",
      token: "access-token",
    });
    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toMatchObject({ status: 404 });
  });

  it("calls the documented Tiny Win title update endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await updateTinyWinTitle({
      tinyWinId: "tiny-win-1",
      token: "access-token",
      values: { title: "새 제목" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/tiny-wins/tiny-win-1/title",
      expect.objectContaining({
        body: JSON.stringify({ title: "새 제목" }),
        method: "PATCH",
      }),
    );
  });

  it("calls the documented Tiny Win content update endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await updateTinyWinContent({
      tinyWinId: "tiny-win-1",
      token: "access-token",
      values: { content: "새 내용" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/tiny-wins/tiny-win-1/content",
      expect.objectContaining({
        body: JSON.stringify({ content: "새 내용" }),
        method: "PATCH",
      }),
    );
  });

  it("calls the documented Tiny Win delete endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteTinyWin({
      tinyWinId: "tiny-win-1",
      token: "access-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/tiny-wins/tiny-win-1",
      expect.objectContaining({ method: "DELETE" }),
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });
});
