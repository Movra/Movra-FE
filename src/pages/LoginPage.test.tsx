import { HttpResponse, http } from "msw";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../app/App";
import {
  createBehaviorProfileFixture,
  createHomeTodayFixture,
} from "../test/fixtures";
import { server } from "../test/server";

describe("LoginPage", () => {
  it("stores tokens and navigates to the protected home after login", async () => {
    server.use(
      http.get("http://localhost:8080/home/today", () =>
        HttpResponse.json(createHomeTodayFixture()),
      ),
      http.post("http://localhost:8080/auth/login", async ({ request }) => {
        expect(await request.json()).toEqual({
          accountId: "student",
          password: "password",
        });

        return HttpResponse.json({
          accessToken: "access-token",
          refreshToken: "refresh-token",
        });
      }),
    );
    window.history.pushState({}, "", "/login");

    render(<App />);

    expect(screen.getByRole("link", { name: "Google로 로그인" })).toHaveAttribute(
      "href",
      "http://localhost:8080/oauth2/authorization/google",
    );
    expect(screen.getByRole("link", { name: "Naver로 로그인" })).toHaveAttribute(
      "href",
      "http://localhost:8080/oauth2/authorization/naver",
    );

    await userEvent.type(screen.getByLabelText("계정 ID"), "student");
    await userEvent.type(screen.getByLabelText("비밀번호"), "password");
    await userEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(
      await screen.findByRole("heading", {
        name: "안녕하세요, 김모브라님!",
      }),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem("movra.accessToken")).toBe(
      "access-token",
    );
    expect(window.sessionStorage.getItem("movra.refreshToken")).toBe(
      "refresh-token",
    );
    expect(window.localStorage.getItem("movra.accessToken")).toBeNull();
  });

  it("redirects to onboarding after login when behavior profile is missing", async () => {
    let profileCreated = false;

    server.use(
      http.get("http://localhost:8080/auth/onboarding-context", () =>
        HttpResponse.json({ pendingSchoolHours: false }),
      ),
      http.get("http://localhost:8080/home/today", () =>
        HttpResponse.json(
          createHomeTodayFixture({
            behaviorProfile: profileCreated
              ? createBehaviorProfileFixture()
              : null,
          }),
        ),
      ),
      http.post("http://localhost:8080/auth/login", () =>
        HttpResponse.json({
          accessToken: "access-token",
          refreshToken: "refresh-token",
        }),
      ),
      http.post("http://localhost:8080/behavior-profiles", () => {
        profileCreated = true;

        return new HttpResponse(null, { status: 200 });
      }),
    );
    window.history.pushState({}, "", "/login");

    render(<App />);

    await userEvent.type(screen.getByLabelText("계정 ID"), "student");
    await userEvent.type(screen.getByLabelText("비밀번호"), "password");
    await userEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(
      await screen.findByRole("heading", {
        name: "지금의 공부 루프를 가볍게 맞춰볼게요.",
      }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "건너뛰기" }));

    expect(
      await screen.findByRole("heading", {
        name: "안녕하세요, 김모브라님!",
      }),
    ).toBeInTheDocument();
  });

  it("shows the API error message when login fails", async () => {
    server.use(
      http.post("http://localhost:8080/auth/login", () =>
        HttpResponse.json(
          {
            httpStatus: "UNAUTHORIZED",
            statusCode: 401,
            message: "비밀번호가 일치하지 않습니다.",
            timestamp: "2026-04-24T09:30:00",
          },
          { status: 401 },
        ),
      ),
    );
    window.history.pushState({}, "", "/login");

    render(<App />);

    await userEvent.type(screen.getByLabelText("계정 ID"), "student");
    await userEvent.type(screen.getByLabelText("비밀번호"), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "비밀번호가 일치하지 않습니다.",
    );
  });
});
