import { HttpResponse, http } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../app/App";
import { server } from "../test/server";

describe("SignupPage", () => {
  it("submits the documented multipart signup request", async () => {
    const requests: Array<Record<string, FormDataEntryValue | null>> = [];
    server.use(
      http.post("http://localhost:8080/auth/signup", async ({ request }) => {
        const form = await request.formData();
        requests.push({
          accountId: form.get("accountId"),
          email: form.get("email"),
          password: form.get("password"),
          profileImage: form.get("profileImage"),
          profileName: form.get("profileName"),
        });

        return new HttpResponse(null, { status: 200 });
      }),
    );
    window.history.pushState({}, "", "/signup");

    render(<App />);

    await userEvent.type(screen.getByLabelText("이메일"), "student@example.com");
    await userEvent.type(screen.getByLabelText("계정 ID"), "student");
    await userEvent.type(screen.getByLabelText("프로필 이름"), "학생");
    await userEvent.upload(
      screen.getByLabelText("이미지 선택"),
      new File(["avatar"], "avatar.png", { type: "image/png" }),
    );
    await userEvent.type(screen.getByLabelText("비밀번호"), "password");
    await userEvent.type(screen.getByLabelText("비밀번호 확인"), "password");
    await userEvent.click(screen.getByRole("button", { name: "회원가입" }));

    await waitFor(() => expect(window.location.pathname).toBe("/login"));
    expect(
      await screen.findByRole("heading", { name: "로그인" }),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      accountId: "student",
      email: "student@example.com",
      password: "password",
      profileName: "학생",
    });
    expect(requests[0]?.profileImage).toMatchObject({
      size: 6,
      type: "image/png",
    });
  });

  it("shows a client error when password confirmation differs", async () => {
    window.history.pushState({}, "", "/signup");

    render(<App />);

    await userEvent.type(screen.getByLabelText("이메일"), "student@example.com");
    await userEvent.type(screen.getByLabelText("계정 ID"), "student");
    await userEvent.type(screen.getByLabelText("프로필 이름"), "학생");
    await userEvent.upload(
      screen.getByLabelText("이미지 선택"),
      new File(["avatar"], "avatar.png", { type: "image/png" }),
    );
    await userEvent.type(screen.getByLabelText("비밀번호"), "password");
    await userEvent.type(screen.getByLabelText("비밀번호 확인"), "different");
    await userEvent.click(screen.getByRole("button", { name: "회원가입" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "비밀번호 확인이 일치하지 않습니다.",
    );
  });
});
