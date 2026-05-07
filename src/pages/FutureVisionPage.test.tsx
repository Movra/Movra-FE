import { HttpResponse, http } from "msw";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../app/App";
import type { HomeToday } from "../features/core-loop/types";
import { createHomeTodayFixture } from "../test/fixtures";
import { server } from "../test/server";

function authenticate(path = "/future-vision") {
  window.localStorage.setItem("movra.accessToken", "access-token");
  window.localStorage.setItem("movra.refreshToken", "refresh-token");
  window.history.pushState({}, "", path);
}

function setupCanvas() {
  const context = {
    beginPath: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    stroke: vi.fn(),
  };

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,aW1hZ2U=",
  );
}

function drawOnCanvas(name: string) {
  const canvas = screen.getByLabelText(name);

  fireEvent.pointerDown(canvas, { clientX: 12, clientY: 12, pointerId: 1 });
  fireEvent.pointerMove(canvas, { clientX: 80, clientY: 80, pointerId: 1 });
  fireEvent.pointerUp(canvas, { clientX: 80, clientY: 80, pointerId: 1 });
}

function setupFutureVisionHandlers(initialHome: HomeToday) {
  let home = initialHome;
  let createRequestCount = 0;
  let weeklyUpdateRequestCount = 0;
  let yearlyUpdateRequestCount = 0;

  server.use(
    http.get("http://localhost:8080/home/today", () => HttpResponse.json(home)),
    http.post("http://localhost:8080/future-vision", async ({ request }) => {
      createRequestCount += 1;
      const form = await request.formData();

      expect(form.get("weeklyVisionImageUrl")).toHaveProperty("type", "image/png");
      expect(form.get("yearlyVisionImageUrl")).toHaveProperty("type", "image/png");
      expect(form.get("yearlyVisionDescription")).toBe("원하는 미래 설명");

      home = {
        ...home,
        futureVision: {
          futureVisionId: "future-vision-id",
          weeklyVisionImageUrl: "https://example.com/weekly.png",
          yearlyVisionCreatedAt: "2026-05-07",
          yearlyVisionDescription: "원하는 미래 설명",
          yearlyVisionImageUrl: "https://example.com/yearly.png",
        },
      };

      return new HttpResponse(null, { status: 200 });
    }),
    http.patch("http://localhost:8080/future-vision/weekly", async ({ request }) => {
      weeklyUpdateRequestCount += 1;
      const form = await request.formData();
      expect(form.get("weeklyVisionImageUrl")).toHaveProperty("type", "image/png");

      return new HttpResponse(null, { status: 200 });
    }),
    http.patch("http://localhost:8080/future-vision/yearly", async ({ request }) => {
      yearlyUpdateRequestCount += 1;
      const form = await request.formData();
      expect(form.get("yearlyVisionImageUrl")).toHaveProperty("type", "image/png");
      expect(form.get("yearlyVisionDescription")).toBe("수정한 미래 설명");

      return new HttpResponse(null, { status: 200 });
    }),
  );

  return {
    getCreateRequestCount: () => createRequestCount,
    getWeeklyUpdateRequestCount: () => weeklyUpdateRequestCount,
    getYearlyUpdateRequestCount: () => yearlyUpdateRequestCount,
  };
}

describe("FutureVisionPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lets users draw yearly and weekly vision images before creating Future Vision", async () => {
    const user = userEvent.setup();
    setupCanvas();
    const handlers = setupFutureVisionHandlers(createHomeTodayFixture());
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "내가 꿈꾸는 미래를 그려보세요.",
      }),
    ).toBeInTheDocument();

    drawOnCanvas("연간 목표 그림판");
    await user.click(screen.getByRole("tab", { name: "주간 목표" }));
    drawOnCanvas("주간 목표 그림판");
    fireEvent.change(screen.getByLabelText("연간 목표 설명"), {
      target: { value: "원하는 미래 설명" },
    });

    await user.click(
      screen.getByRole("button", { name: "Future Vision 저장" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Future Vision을 저장했습니다.",
    );
    await waitFor(() => expect(handlers.getCreateRequestCount()).toBe(1));
  });

  it("shows saved Vision previews and updates weekly and yearly images separately", async () => {
    const user = userEvent.setup();
    setupCanvas();
    const handlers = setupFutureVisionHandlers(
      createHomeTodayFixture({
        futureVision: {
          futureVisionId: "future-vision-id",
          weeklyVisionImageUrl: "https://example.com/weekly.png",
          yearlyVisionCreatedAt: "2026-05-07",
          yearlyVisionDescription: "저장된 미래 설명",
          yearlyVisionImageUrl: "https://example.com/yearly.png",
        },
      }),
    );
    authenticate();

    render(<App />);

    const preview = await screen.findByRole("complementary", {
      name: "Vision 저장 정보",
    });
    expect(
      within(preview).getByRole("img", { name: "저장된 연간 Future Vision" }),
    ).toBeInTheDocument();
    expect(within(preview).getAllByText("저장된 미래 설명").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("tab", { name: "주간 목표" }));
    drawOnCanvas("주간 목표 그림판");
    await user.click(screen.getByRole("button", { name: "주간 저장" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "주간 Future Vision을 수정했습니다.",
    );
    await waitFor(() => expect(handlers.getWeeklyUpdateRequestCount()).toBe(1));

    await user.click(screen.getByRole("tab", { name: "연간 목표" }));
    drawOnCanvas("연간 목표 그림판");
    fireEvent.change(screen.getByLabelText("연간 목표 설명"), {
      target: { value: "수정한 미래 설명" },
    });
    await user.click(screen.getByRole("button", { name: "연간 저장" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "연간 Future Vision을 수정했습니다.",
    );
    await waitFor(() => expect(handlers.getYearlyUpdateRequestCount()).toBe(1));
  });
});
