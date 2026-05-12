import {
  formatExamDistance,
  getFriendAccountabilityText,
  getNextExamLabel,
} from "./displayUtils";
import type { FriendAccountability, HomeToday } from "./types";

function createHomeToday(nextExamSchedule: HomeToday["nextExamSchedule"]) {
  return {
    nextExamSchedule,
  } as HomeToday;
}

describe("core loop display utils", () => {
  it("formats upcoming, same-day, and past exam distances", () => {
    expect(formatExamDistance(3)).toBe("D-3");
    expect(formatExamDistance(0)).toBe("D-Day");
    expect(formatExamDistance(-2)).toBe("D+2");
  });

  it("builds the next exam label from the home summary", () => {
    expect(
      getNextExamLabel(
        createHomeToday({
          daysUntil: 7,
          examDate: "2026-05-14",
          examScheduleId: "exam-1",
          examType: "NAESIN",
          seasonMode: "내신 집중",
          subject: "수학",
          title: "중간고사",
        }),
      ),
    ).toBe("중간고사 D-7");
    expect(getNextExamLabel(createHomeToday(null))).toBe("목표 설정 전");
  });

  it("describes friend accountability state", () => {
    const base: FriendAccountability = {
      inviteCodeStatus: null,
      relationCreated: true,
      watchedByFriend: false,
      watchingFriend: false,
    };

    expect(getFriendAccountabilityText(null)).toBe("연결된 친구 없음");
    expect(
      getFriendAccountabilityText({
        ...base,
        watchedByFriend: true,
        watchingFriend: true,
      }),
    ).toBe("서로 진행 상황 공유 중");
    expect(getFriendAccountabilityText({ ...base, watchedByFriend: true })).toBe(
      "친구가 나를 지켜보는 중",
    );
    expect(getFriendAccountabilityText({ ...base, watchingFriend: true })).toBe(
      "내가 친구를 지켜보는 중",
    );
    expect(
      getFriendAccountabilityText({ ...base, inviteCodeStatus: "초대 대기" }),
    ).toBe("초대 대기");
    expect(
      getFriendAccountabilityText({
        ...base,
        inviteCodeStatus: {
          expired: false,
          expiredAt: "2026-04-25T09:00:00",
          inviteCode: "INVITE15",
          reissuable: true,
          watcherConnected: false,
        },
      }),
    ).toBe("초대 코드 대기 중");
    expect(
      getFriendAccountabilityText({
        ...base,
        inviteCodeStatus: {
          expired: true,
          expiredAt: "2026-04-25T09:00:00",
          inviteCode: "INVITE15",
          reissuable: true,
          watcherConnected: false,
        },
      }),
    ).toBe("초대 코드 재발급 가능");
  });
});
