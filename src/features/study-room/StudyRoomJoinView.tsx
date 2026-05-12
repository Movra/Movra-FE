import { NavLink } from "react-router-dom";

import characterDefault from "../../assets/auth/character-default.png";
import type { MyParticipation, StudyRoomSummary } from "./types";
import styles from "../../pages/StudyRoomPage.module.css";

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}

function getRoomPath(roomId: string) {
  return `/study-room/rooms/${encodeURIComponent(roomId)}`;
}

type StudyRoomJoinViewProps = {
  isJoinPending: boolean;
  myParticipations: MyParticipation[];
  onJoinPublicRoom: (roomId: string) => void;
  onOpenInviteJoinModal: () => void;
  onRefreshPublicRooms: () => void;
  publicRooms: StudyRoomSummary[];
};

export function StudyRoomJoinView({
  isJoinPending,
  myParticipations,
  onJoinPublicRoom,
  onOpenInviteJoinModal,
  onRefreshPublicRooms,
  publicRooms,
}: StudyRoomJoinViewProps) {
  return (
    <div className={styles.joinLayout}>
      <section
        className={styles.publicRoomsPanel}
        aria-labelledby="public-rooms-title"
      >
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.panelEyebrow}>Public</span>
            <h2 id="public-rooms-title">공개방 목록</h2>
          </div>
          <button
            className={styles.textButton}
            onClick={onRefreshPublicRooms}
            type="button"
          >
            새로고침
          </button>
        </div>
        {publicRooms.length === 0 ? (
          <div className={styles.emptyState}>
            <img src={characterDefault} alt="" aria-hidden="true" />
            <p>아직 공개방이 없습니다.</p>
          </div>
        ) : (
          <ul className={styles.publicRoomGrid}>
            {publicRooms.map((room) => {
              const alreadyJoined = myParticipations.some(
                (participation) => participation.roomId === room.roomId,
              );

              return (
                <li className={styles.publicRoomCard} key={room.roomId}>
                  <span className={styles.roomAvatar} aria-hidden="true">
                    {getInitial(room.name)}
                  </span>
                  <div>
                    <strong>{room.name}</strong>
                    <span>공개 · 생성 {formatDateTime(room.createdAt)}</span>
                  </div>
                  {alreadyJoined ? (
                    <NavLink
                      className={styles.secondaryButton}
                      to={getRoomPath(room.roomId)}
                    >
                      입장하기
                    </NavLink>
                  ) : (
                    <button
                      className={styles.primaryButton}
                      disabled={isJoinPending}
                      onClick={() => onJoinPublicRoom(room.roomId)}
                      type="button"
                    >
                      참여하기
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        className={styles.privateJoinPanel}
        aria-labelledby="private-join-title"
      >
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.panelEyebrow}>Invite</span>
            <h2 id="private-join-title">초대 코드로 참여</h2>
          </div>
        </div>
        <div className={styles.invitePreview} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className={styles.inviteCtaText}>
          방 ID 없이 초대 코드만 입력해 비공개방에 입장합니다.
        </p>
        <button
          className={styles.secondaryButton}
          onClick={onOpenInviteJoinModal}
          type="button"
        >
          초대 코드 입력
        </button>
      </section>
    </div>
  );
}
