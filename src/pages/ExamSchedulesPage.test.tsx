import { HttpResponse, http } from "msw";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "../app/App";
import type { ExamSchedule, HomeToday } from "../features/core-loop/types";
import { createHomeTodayFixture } from "../test/fixtures";
import { server } from "../test/server";

function authenticate(path = "/exam-schedules") {
  window.localStorage.setItem("movra.accessToken", "access-token");
  window.localStorage.setItem("movra.refreshToken", "refresh-token");
  window.history.pushState({}, "", path);
}

function setupExamScheduleHandlers({
  initialExams,
  initialHome,
}: {
  initialExams: ExamSchedule[];
  initialHome: HomeToday;
}) {
  let exams = initialExams;
  let home = initialHome;
  let nextIndex = 10;
  let homeRequestCount = 0;

  function syncNextExam() {
    const nextExam =
      exams
        .filter((exam) => exam.daysUntil >= 0)
        .sort((left, right) => left.daysUntil - right.daysUntil)[0] ?? null;

    home = {
      ...home,
      nextExamSchedule: nextExam,
      seasonMode: nextExam?.seasonMode ?? "BASELINE_MODE",
    };
  }

  server.use(
    http.get("http://localhost:8080/home/today", () => {
      homeRequestCount += 1;
      return HttpResponse.json(home);
    }),
    http.get("http://localhost:8080/exam-schedules", () =>
      HttpResponse.json(exams),
    ),
    http.post("http://localhost:8080/exam-schedules", async ({ request }) => {
      const body = (await request.json()) as {
        examDate: string;
        examType: ExamSchedule["examType"];
        subject: string;
        title: string;
      };
      const exam: ExamSchedule = {
        ...body,
        daysUntil: 32,
        examScheduleId: `exam-${nextIndex}`,
        seasonMode: "NAESIN_INTENSIVE",
      };
      nextIndex += 1;
      exams = [...exams, exam];
      syncNextExam();

      return HttpResponse.json(exam);
    }),
    http.patch(
      "http://localhost:8080/exam-schedules/:examScheduleId",
      async ({ params, request }) => {
        const body = (await request.json()) as {
          examDate: string;
          examType: ExamSchedule["examType"];
          subject: string;
          title: string;
        };
        const examScheduleId = String(params.examScheduleId);
        const updatedExam: ExamSchedule = {
          ...body,
          daysUntil: 20,
          examScheduleId,
          seasonMode: "MOPYUNG_FOCUSED",
        };
        exams = exams.map((exam) =>
          exam.examScheduleId === examScheduleId ? updatedExam : exam,
        );
        syncNextExam();

        return HttpResponse.json(updatedExam);
      },
    ),
    http.delete("http://localhost:8080/exam-schedules/:examScheduleId", ({ params }) => {
      const examScheduleId = String(params.examScheduleId);
      exams = exams.filter((exam) => exam.examScheduleId !== examScheduleId);
      syncNextExam();

      return new HttpResponse(null, { status: 200 });
    }),
  );

  return {
    getHomeRequestCount: () => homeRequestCount,
  };
}

describe("ExamSchedulesPage", () => {
  it("shows upcoming and past exams, then creates, edits, and deletes an exam", async () => {
    const user = userEvent.setup();
    const handlers = setupExamScheduleHandlers({
      initialExams: [
        {
          daysUntil: 21,
          examDate: "2026-06-04",
          examScheduleId: "exam-1",
          examType: "MOPYUNG",
          seasonMode: "MOPYUNG_FOCUSED",
          subject: "수학",
          title: "6월 모의평가",
        },
        {
          daysUntil: -5,
          examDate: "2026-05-02",
          examScheduleId: "exam-old",
          examType: "NAESIN",
          seasonMode: "BASELINE_MODE",
          subject: "영어",
          title: "지난 중간고사",
        },
      ],
      initialHome: createHomeTodayFixture({
        nextExamSchedule: {
          daysUntil: 21,
          examDate: "2026-06-04",
          examScheduleId: "exam-1",
          examType: "MOPYUNG",
          seasonMode: "MOPYUNG_FOCUSED",
          subject: "수학",
          title: "6월 모의평가",
        },
        seasonMode: "MOPYUNG_FOCUSED",
      }),
    });
    authenticate();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "시험 일정" }),
    ).toBeInTheDocument();
    expect(screen.getByText("6월 모의평가")).toBeInTheDocument();
    expect(screen.getAllByText("D-21").length).toBeGreaterThan(0);
    expect(screen.queryByText("지난 중간고사")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /지난 시험 보기/ }));
    expect(screen.getByText("지난 중간고사")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ 시험 추가" }));
    const createDialog = screen.getByRole("dialog", { name: "시험 일정 추가" });
    fireEvent.change(within(createDialog).getByLabelText("유형"), {
      target: { value: "NAESIN" },
    });
    fireEvent.change(within(createDialog).getByLabelText("제목"), {
      target: { value: "기말고사" },
    });
    fireEvent.change(within(createDialog).getByLabelText("과목"), {
      target: { value: "국어" },
    });
    fireEvent.change(within(createDialog).getByLabelText("날짜"), {
      target: { value: "2026-07-01" },
    });
    await user.click(within(createDialog).getByRole("button", { name: "저장" }));

    expect(await screen.findByText("시험 일정을 추가했습니다.")).toBeInTheDocument();
    expect(await screen.findByText("기말고사")).toBeInTheDocument();

    const createdCard = screen.getByText("기말고사").closest("li");
    expect(createdCard).not.toBeNull();
    await user.click(
      within(createdCard as HTMLElement).getByRole("button", { name: "수정" }),
    );
    const editDialog = screen.getByRole("dialog", { name: "시험 일정 수정" });
    fireEvent.change(within(editDialog).getByLabelText("제목"), {
      target: { value: "기말고사 수정" },
    });
    fireEvent.change(within(editDialog).getByLabelText("과목"), {
      target: { value: "수학" },
    });
    await user.click(within(editDialog).getByRole("button", { name: "저장" }));

    expect(await screen.findByText("시험 일정을 수정했습니다.")).toBeInTheDocument();
    expect(await screen.findByText("기말고사 수정")).toBeInTheDocument();

    const editedCard = screen.getByText("기말고사 수정").closest("li");
    expect(editedCard).not.toBeNull();
    await user.click(
      within(editedCard as HTMLElement).getByRole("button", { name: "삭제" }),
    );
    const deleteDialog = screen.getByRole("dialog", {
      name: "시험 일정 삭제 확인",
    });
    await user.click(within(deleteDialog).getByRole("button", { name: "삭제" }));

    expect(await screen.findByText("시험 일정을 삭제했습니다.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("기말고사 수정")).not.toBeInTheDocument(),
    );
    expect(handlers.getHomeRequestCount()).toBeGreaterThan(1);
  });

  it("shows an empty state when no upcoming exam exists", async () => {
    setupExamScheduleHandlers({
      initialExams: [],
      initialHome: createHomeTodayFixture(),
    });
    authenticate();

    render(<App />);

    expect(
      await screen.findByText("등록된 다가오는 시험이 없습니다."),
    ).toBeInTheDocument();
  });
});
