import { type FormEvent } from "react";

import characterSuccess from "../../assets/auth/character-success.webp";
import type { RoomVisibility } from "./types";
import styles from "../../pages/StudyRoomPage.module.css";

export type CreateRoomForm = {
  name: string;
  visibility: RoomVisibility;
};

type CreateRoomModalProps = {
  form: CreateRoomForm;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setForm: (
    update: (current: CreateRoomForm) => CreateRoomForm,
  ) => void;
};

export function CreateRoomModal({
  form,
  isPending,
  onClose,
  onSubmit,
  setForm,
}: CreateRoomModalProps) {
  return (
    <div className={styles.modalBackdrop}>
      <section
        className={styles.inviteModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-room-modal-title"
      >
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.panelEyebrow}>Create</span>
            <h2 id="create-room-modal-title">스터디룸 만들기</h2>
          </div>
          <button
            className={styles.iconButton}
            onClick={onClose}
            type="button"
            aria-label="방 만들기 모달 닫기"
          >
            ×
          </button>
        </div>

        <div className={styles.createPreview} aria-hidden="true">
          <img src={characterSuccess} alt="" />
          <div>
            <span>PUBLIC</span>
            <strong>공개방 목록에 바로 노출</strong>
          </div>
          <div>
            <span>PRIVATE</span>
            <strong>초대 코드로만 입장</strong>
          </div>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.field} htmlFor="study-room-name">
            방 이름
            <input
              id="study-room-name"
              maxLength={20}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="예: 저녁 집중방"
              value={form.name}
            />
          </label>
          <div
            className={styles.segmentedControl}
            role="group"
            aria-label="방 공개 범위"
          >
            <button
              aria-pressed={form.visibility === "PUBLIC"}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  visibility: "PUBLIC",
                }))
              }
              type="button"
            >
              공개
            </button>
            <button
              aria-pressed={form.visibility === "PRIVATE"}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  visibility: "PRIVATE",
                }))
              }
              type="button"
            >
              비공개
            </button>
          </div>
          <button
            className={styles.primaryButton}
            disabled={isPending}
            type="submit"
          >
            방 만들기
          </button>
        </form>
      </section>
    </div>
  );
}
