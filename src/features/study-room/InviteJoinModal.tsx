import { type FormEvent } from "react";

import styles from "../../pages/StudyRoomPage.module.css";

type InviteJoinModalProps = {
  actionError: string | null;
  inviteCode: string;
  isPending: boolean;
  onClose: () => void;
  onInviteCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function InviteJoinModal({
  actionError,
  inviteCode,
  isPending,
  onClose,
  onInviteCodeChange,
  onSubmit,
}: InviteJoinModalProps) {
  return (
    <div className={styles.modalBackdrop}>
      <section
        className={styles.inviteModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-join-modal-title"
      >
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.panelEyebrow}>Invite</span>
            <h2 id="invite-join-modal-title">초대 코드로 입장하기</h2>
          </div>
          <button
            className={styles.iconButton}
            onClick={onClose}
            type="button"
            aria-label="초대 코드 입장 모달 닫기"
          >
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.field} htmlFor="invite-join-code">
            초대 코드
            <input
              id="invite-join-code"
              onChange={(event) => onInviteCodeChange(event.target.value)}
              placeholder="초대 코드 입력"
              value={inviteCode}
            />
          </label>
          {actionError ? (
            <p className={styles.error} role="alert">
              {actionError}
            </p>
          ) : null}
          <button
            className={styles.primaryButton}
            disabled={isPending}
            type="submit"
          >
            입장하기
          </button>
        </form>
      </section>
    </div>
  );
}
