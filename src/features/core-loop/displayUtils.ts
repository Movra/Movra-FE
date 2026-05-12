import type { FriendAccountability, HomeToday } from "./types";

export function formatExamDistance(daysUntil: number) {
  if (daysUntil === 0) {
    return "D-Day";
  }

  return daysUntil > 0 ? `D-${daysUntil}` : `D+${Math.abs(daysUntil)}`;
}

export function getNextExamLabel(home: HomeToday) {
  return home.nextExamSchedule
    ? `${home.nextExamSchedule.title} ${formatExamDistance(
        home.nextExamSchedule.daysUntil,
      )}`
    : "목표 설정 전";
}

export function getFriendAccountabilityText(
  friendAccountability: FriendAccountability | null,
) {
  if (!friendAccountability?.relationCreated) {
    return "연결된 친구 없음";
  }

  if (friendAccountability.watchedByFriend && friendAccountability.watchingFriend) {
    return "서로 진행 상황 공유 중";
  }

  if (friendAccountability.watchedByFriend) {
    return "친구가 나를 지켜보는 중";
  }

  if (friendAccountability.watchingFriend) {
    return "내가 친구를 지켜보는 중";
  }

  const { inviteCodeStatus } = friendAccountability;
  if (!inviteCodeStatus) {
    return "친구 연결 대기 중";
  }

  if (typeof inviteCodeStatus === "string") {
    return inviteCodeStatus;
  }

  if (inviteCodeStatus.watcherConnected) {
    return "친구가 나를 지켜보는 중";
  }

  if (inviteCodeStatus.expired) {
    return inviteCodeStatus.reissuable
      ? "초대 코드 재발급 가능"
      : "초대 코드 만료";
  }

  return inviteCodeStatus.inviteCode ? "초대 코드 대기 중" : "친구 연결 대기 중";
}
