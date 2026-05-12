import { NavLink } from "react-router-dom";

import characterFocus from "../../assets/auth/character-focus.png";
import styles from "../../pages/StudyRoomPage.module.css";

type StudyRoomHomeViewProps = {
  onOpenCreateModal: () => void;
  onOpenInviteJoinModal: () => void;
};

export function StudyRoomHomeView({
  onOpenCreateModal,
  onOpenInviteJoinModal,
}: StudyRoomHomeViewProps) {
  return (
    <div className={styles.overviewGrid}>
      <section
        className={styles.overviewHero}
        aria-labelledby="study-room-overview-title"
      >
        <div className={styles.overviewHeroCopy}>
          <span className={styles.panelEyebrow}>Room Flow</span>
          <h2 id="study-room-overview-title">함께 공부할 방을 빠르게 고르세요.</h2>
          <p>
            만들기, 참여하기, 입장하기가 분리되어 지금 필요한 행동만 바로
            선택할 수 있습니다.
          </p>
          <div className={styles.heroActions}>
            <button
              className={styles.primaryButton}
              onClick={onOpenCreateModal}
              type="button"
            >
              방 만들기
            </button>
            <NavLink className={styles.secondaryButton} to="/study-room/join">
              공개방 확인하기
            </NavLink>
          </div>
        </div>
        <div className={styles.studyScene} aria-hidden="true">
          <div className={styles.sceneBoard}>
            <span />
            <span />
            <span />
          </div>
          <img src={characterFocus} alt="" />
        </div>
      </section>

      <section
        className={styles.inviteEntryPanel}
        aria-labelledby="home-invite-title"
      >
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.panelEyebrow}>Invite</span>
            <h2 id="home-invite-title">초대코드로 입장하기</h2>
          </div>
        </div>
        <p className={styles.inviteCtaText}>
          초대받은 코드를 입력하면 비공개 스터디룸에 바로 참여할 수 있습니다.
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
