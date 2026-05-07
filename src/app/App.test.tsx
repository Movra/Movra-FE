import { HttpResponse, http } from "msw";
import { render, screen } from "@testing-library/react";

import { createHomeTodayFixture } from "../test/fixtures";
import { server } from "../test/server";
import { App } from "./App";

describe("App foundation", () => {
  it("redirects unauthenticated users to login", () => {
    window.history.pushState({}, "", "/");

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "로그인" }),
    ).toBeInTheDocument();
  });

  it("renders the protected home shell when tokens are stored", async () => {
    server.use(
      http.get("http://localhost:8080/home/today", () =>
        HttpResponse.json(createHomeTodayFixture()),
      ),
    );
    window.localStorage.setItem("movra.accessToken", "access-token");
    window.localStorage.setItem("movra.refreshToken", "refresh-token");
    window.history.pushState({}, "", "/");

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "안녕하세요, 김모브라님!",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
  });
});
