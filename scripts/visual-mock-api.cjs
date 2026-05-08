const http = require("node:http");

const defaultHost = "127.0.0.1";
const defaultPort = 18080;

function createVisionSvg(label, background, accent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="${background}"/>
  <circle cx="735" cy="150" r="68" fill="#dfeecf"/>
  <path d="M110 360 C255 215 360 270 455 170 C560 65 710 180 825 95" fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
  <path d="M155 410 H805" stroke="#223326" stroke-width="10" stroke-linecap="round" opacity="0.18"/>
  <text x="480" y="430" font-family="Arial, sans-serif" font-size="48" fill="${accent}" text-anchor="middle">${label}</text>
</svg>`;
}

function createHeaders(contentType = "application/json; charset=utf-8") {
  return {
    "access-control-allow-headers": "authorization,content-type",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-origin": "*",
    "content-type": contentType,
  };
}

function sendJson(response, value, status = 200) {
  response.writeHead(status, createHeaders());
  response.end(JSON.stringify(value));
}

function sendEmpty(response) {
  response.writeHead(204, createHeaders());
  response.end();
}

function sendSvg(response, body) {
  response.writeHead(200, createHeaders("image/svg+xml; charset=utf-8"));
  response.end(body);
}

function readJsonBody(request) {
  return new Promise((resolve) => {
    let rawBody = "";

    request.on("data", (chunk) => {
      rawBody += chunk;
    });
    request.on("end", () => {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch {
        resolve({});
      }
    });
  });
}

function drainBody(request) {
  return new Promise((resolve) => {
    request.resume();
    request.on("end", resolve);
  });
}

function createInitialExams() {
  return [
    {
      daysUntil: 1,
      examDate: "2026-05-15",
      examScheduleId: "exam-1",
      examType: "NAESIN",
      seasonMode: "Midterm focus",
      subject: "Core subjects",
      title: "Second term midterm",
    },
    {
      daysUntil: 21,
      examDate: "2026-06-04",
      examScheduleId: "exam-2",
      examType: "MOPYUNG",
      seasonMode: "Mock exam",
      subject: "All subjects",
      title: "June mock exam",
    },
    {
      daysUntil: 48,
      examDate: "2026-07-01",
      examScheduleId: "exam-3",
      examType: "NAESIN",
      seasonMode: "Final focus",
      subject: "Core subjects",
      title: "Second term final",
    },
    {
      daysUntil: 162,
      examDate: "2026-11-13",
      examScheduleId: "exam-4",
      examType: "SUNUNG",
      seasonMode: "Sunung practice",
      subject: "All subjects",
      title: "2026 CSAT practice",
    },
    {
      daysUntil: -12,
      examDate: "2026-04-10",
      examScheduleId: "exam-old",
      examType: "OTHER",
      seasonMode: "Baseline mode",
      subject: "Math",
      title: "Past practice test",
    },
  ];
}

function createFutureVision(host, port) {
  return {
    futureVisionId: "future-vision-id",
    weeklyVisionImageUrl: `http://${host}:${port}/mock/weekly-vision.svg`,
    yearlyVisionCreatedAt: "2026-05-07",
    yearlyVisionDescription:
      "A clear yearly vision saved through the visual verification harness.",
    yearlyVisionImageUrl: `http://${host}:${port}/mock/yearly-vision.svg`,
  };
}

function createHomeToday(exams, futureVision) {
  const nextExamSchedule =
    exams
      .filter((exam) => exam.daysUntil >= 0)
      .sort((left, right) => left.daysUntil - right.daysUntil)[0] ?? null;

  return {
    activeFocusSession: null,
    behaviorProfile: {
      behaviorProfileId: "behavior-profile-id",
      coachingMode: "GENTLE",
      examTrack: "NAESIN",
      executionDifficulty: "MEDIUM",
      preferredFocusEndHour: 22,
      preferredFocusStartHour: 8,
      recoveryStyle: "QUICK_RESTART",
      socialPreference: "LOW",
    },
    focusSessions: {
      focusing: false,
      queriedAt: "2026-05-07T00:00:00Z",
      sessions: [],
      targetDate: "2026-05-07",
      totalFocusSeconds: 0,
    },
    friendAccountability: {
      inviteCodeStatus: null,
      relationCreated: false,
      watchedByFriend: false,
      watchingFriend: false,
    },
    futureVision,
    morningTasks: [],
    nextExamSchedule,
    notificationPreference: null,
    recoveryCard: {
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
    },
    seasonMode: nextExamSchedule?.seasonMode ?? "Baseline mode",
    showFocusTimingCard: false,
    targetDate: "2026-05-07",
    timetable: {
      dailyPlanId: "daily-plan-id",
      slots: [],
      timetableId: "timetable-id",
      topPickTotal: 0,
    },
    todayDailyPlan: {
      dailyPlanId: "daily-plan-id",
      morningTasks: [],
      planDate: "2026-05-07",
      tasks: [],
    },
    topPicks: [],
  };
}

function withDaysUntil(values, daysUntil) {
  return {
    daysUntil,
    examDate: values.examDate ?? "2026-06-04",
    examScheduleId: values.examScheduleId,
    examType: values.examType ?? "OTHER",
    seasonMode: values.examType === "SUNUNG" ? "Sunung practice" : "visual mode",
    subject: values.subject ?? "Subject",
    title: values.title ?? "Visual smoke exam",
  };
}

function createVisualMockServer(options = {}) {
  const host = options.host ?? defaultHost;
  const port = options.port ?? defaultPort;
  const yearlyVisionSvg = createVisionSvg("Yearly Vision", "#f4f8f1", "#1f4a30");
  const weeklyVisionSvg = createVisionSvg("Weekly Vision", "#f7f3ea", "#4f83cc");
  let exams = createInitialExams();
  let futureVision = createFutureVision(host, port);
  let nextExamIndex = 10;

  async function handleExamSchedules(request, response, pathname) {
    if (pathname === "/exam-schedules" && request.method === "GET") {
      sendJson(response, exams);
      return true;
    }

    if (pathname === "/exam-schedules" && request.method === "POST") {
      const body = await readJsonBody(request);
      const exam = withDaysUntil(
        {
          ...body,
          examScheduleId: `exam-${nextExamIndex}`,
        },
        32,
      );
      nextExamIndex += 1;
      exams = [...exams, exam];
      sendJson(response, exam);
      return true;
    }

    const match = /^\/exam-schedules\/([^/]+)$/.exec(pathname);
    if (!match) {
      return false;
    }

    const examScheduleId = match[1];
    if (request.method === "PATCH") {
      const body = await readJsonBody(request);
      const updatedExam = withDaysUntil({ ...body, examScheduleId }, 20);
      exams = exams.map((exam) =>
        exam.examScheduleId === examScheduleId ? updatedExam : exam,
      );
      sendJson(response, updatedExam);
      return true;
    }

    if (request.method === "DELETE") {
      exams = exams.filter((exam) => exam.examScheduleId !== examScheduleId);
      sendEmpty(response);
      return true;
    }

    return false;
  }

  async function handleFutureVision(request, response, pathname) {
    if (pathname === "/future-vision" && request.method === "GET") {
      sendJson(response, futureVision);
      return true;
    }

    if (pathname === "/future-vision" && request.method === "POST") {
      await drainBody(request);
      futureVision = {
        ...futureVision,
        futureVisionId: "future-vision-created",
        yearlyVisionDescription: "A visual-mode vision created during smoke test.",
      };
      sendEmpty(response);
      return true;
    }

    if (pathname === "/future-vision/weekly" && request.method === "PATCH") {
      await drainBody(request);
      sendEmpty(response);
      return true;
    }

    if (pathname === "/future-vision/yearly" && request.method === "PATCH") {
      await drainBody(request);
      futureVision = {
        ...futureVision,
        yearlyVisionDescription: "A visual-mode vision updated during smoke test.",
      };
      sendEmpty(response);
      return true;
    }

    return false;
  }

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${host}:${port}`);

    if (request.method === "OPTIONS") {
      response.writeHead(204, createHeaders());
      response.end();
      return;
    }

    if (url.pathname === "/mock/yearly-vision.svg") {
      sendSvg(response, yearlyVisionSvg);
      return;
    }

    if (url.pathname === "/mock/weekly-vision.svg") {
      sendSvg(response, weeklyVisionSvg);
      return;
    }

    if (url.pathname === "/home/today") {
      sendJson(response, createHomeToday(exams, futureVision));
      return;
    }

    if (await handleExamSchedules(request, response, url.pathname)) {
      return;
    }

    if (await handleFutureVision(request, response, url.pathname)) {
      return;
    }

    sendJson(response, { code: "NOT_FOUND", message: url.pathname }, 404);
  });

  return { host, port, server };
}

if (require.main === module) {
  const { host, port, server } = createVisualMockServer();

  server.on("error", (error) => {
    console.error(`[visual-mock-api] ${error.message}`);
    process.exitCode = 1;
  });

  server.listen(port, host, () => {
    console.log(`[visual-mock-api] listening on http://${host}:${port}`);
  });
}

module.exports = { createVisualMockServer };
