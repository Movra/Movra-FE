import { HttpResponse, http } from "msw";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../app/App";
import { createHomeTodayFixture } from "../test/fixtures";
import { server } from "../test/server";

describe("OAuthProfileSetupPage", () => {
  it("stores issued tokens after OAuth profile setup and enters home", async () => {
    const requests: Array<Record<string, FormDataEntryValue | null>> = [];
    server.use(
      http.get("http://localhost:8080/home/today", () =>
        HttpResponse.json(createHomeTodayFixture()),
      ),
      http.post(
        "http://localhost:8080/auth/oauth/profile-setup",
        async ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("pendingToken")).toBe("pending-token");
          const form = await request.formData();
          requests.push({
            accountId: form.get("accountId"),
            password: form.get("password"),
            profileImage: form.get("profileImage"),
            profileName: form.get("profileName"),
          });

          return HttpResponse.json({
            accessToken: "oauth-access-token",
            isProfileCompleted: true,
            refreshToken: "oauth-refresh-token",
          });
        },
      ),
    );
    window.history.pushState(
      {},
      "",
      "/oauth/profile-setup?pendingToken=pending-token",
    );

    render(<App />);

    await userEvent.type(screen.getByLabelText("계정 ID"), "oauthstudent");
    await userEvent.type(screen.getByLabelText("프로필 이름"), "오스");
    await userEvent.upload(
      screen.getByLabelText("이미지 선택"),
      new File(["avatar"], "avatar.png", { type: "image/png" }),
    );
    await userEvent.type(screen.getByLabelText("비밀번호"), "password");
    await userEvent.click(screen.getByRole("button", { name: "Movra 시작" }));

    expect(
      await screen.findByRole("heading", {
        name: "안녕하세요, 김모브라님!",
      }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem("movra.accessToken")).toBe(
      "oauth-access-token",
    );
    expect(window.localStorage.getItem("movra.refreshToken")).toBe(
      "oauth-refresh-token",
    );
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      accountId: "oauthstudent",
      password: "password",
      profileName: "오스",
    });
    expect(requests[0]?.profileImage).toMatchObject({
      size: 6,
      type: "image/png",
    });
  });

  it("blocks submission when pendingToken is missing", async () => {
    window.history.pushState({}, "", "/oauth/profile-setup");

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "OAuth 인증 토큰이 없습니다.",
    );
    expect(screen.getByRole("button", { name: "Movra 시작" })).toBeDisabled();
  });
});
