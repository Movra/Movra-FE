import type { CreateStudyRoomResponse, RoomVisibility } from "./types";
import styles from "../../pages/StudyRoomPage.module.css";

export type CreatedRoom = CreateStudyRoomResponse & {
  name: string;
  visibility: RoomVisibility;
};

type InviteCodeModalProps = {
  createdRoom: CreatedRoom;
  onClose: () => void;
  onCopy: () => void;
  onEnter: () => void;
};

export function InviteCodeModal({
  createdRoom,
  onClose,
  onCopy,
  onEnter,
}: InviteCodeModalProps) {
  return (
    <div className={styles.modalBackdrop}>
      <section
        className={styles.inviteModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
      >
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.panelEyebrow}>Invite</span>
            <h2 id="invite-modal-title">
              {createdRoom.visibility === "PRIVATE"
                ? "초대 코드를 확인하세요"
                : "방이 만들어졌어요"}
            </h2>
          </div>
          <button
            className={styles.iconButton}
            onClick={onClose}
            type="button"
            aria-label="초대 코드 모달 닫기"
          >
            ×
          </button>
        </div>

        <dl className={styles.inviteDetails}>
          <div>
            <dt>방 이름</dt>
            <dd>{createdRoom.name}</dd>
          </div>
        </dl>

        {createdRoom.inviteCode ? (
          <div className={styles.inviteCodeBox}>
            <span>초대 코드</span>
            <strong>{createdRoom.inviteCode}</strong>
          </div>
        ) : (
          <p className={styles.emptyText}>
            공개방은 공개방 참여 화면에서 바로 찾을 수 있습니다.
          </p>
        )}

        <div className={styles.modalActions}>
          <button
            className={styles.secondaryButton}
            onClick={onCopy}
            type="button"
          >
            초대 정보 복사
          </button>
          <button
            className={styles.primaryButton}
            onClick={onEnter}
            type="button"
          >
            방 입장하기
          </button>
        </div>
      </section>
    </div>
  );
}
