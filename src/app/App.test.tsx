import { HttpResponse, http } from "msw";
import { render, screen } from "@testing-library/react";

import { createHomeTodayFixture } from "../test/fixtures";
import { server } from "../test/server";
import { App } from "./App";

describe("App foundation", () => {
  it("redirects unauthenticated users to login", async () => {
    window.history.pushState({}, "", "/");

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "로그인" }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it("renders the protected home shell when tokens are stored", async () => {
    const home = createHomeTodayFixture();

    server.use(
      http.get("http://localhost:8080/home/today", () =>
        HttpResponse.json(home),
      ),
      http.get("http://localhost:8080/behavior-profiles/me", () =>
        HttpResponse.json(home.behaviorProfile),
      ),
      http.get("http://localhost:8080/focus-sessions/today", () =>
        HttpResponse.json(home.focusSessions),
      ),
    );
    window.localStorage.setItem("movra.accessToken", "access-token");
    window.localStorage.setItem("movra.refreshToken", "refresh-token");
    window.history.pushState({}, "", "/");

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "오늘은 TopPick 하나만 끝내요",
      }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
  });
});
