import { NavLink } from "react-router-dom";

import characterDefault from "../../assets/auth/character-default.webp";
import movraLogo from "../../assets/auth/movra-logo-cropped.webp";
import styles from "./AppSidebar.module.css";

type SidebarItem = {
  icon: SidebarIconType;
  label: string;
  meta?: string;
  path: string;
};

type SidebarIconType =
  | "accountability"
  | "exam"
  | "focus"
  | "friends"
  | "home"
  | "plan"
  | "reflection"
  | "settings"
  | "statistics"
  | "studyRoom"
  | "timetable"
  | "vision";

type AppSidebarProps = {
  ariaHidden?: boolean;
  friendText?: string;
  onLogout: () => void;
  profileName?: string;
  profileSubtitle: string;
  quote?: string;
};

const sidebarItems: SidebarItem[] = [
  { icon: "home", label: "홈", meta: "Today", path: "/" },
  { icon: "plan", label: "계획", path: "/planning" },
  { icon: "vision", label: "비전", path: "/future-vision" },
  { icon: "timetable", label: "시간표", path: "/timetable" },
  { icon: "exam", label: "시험 일정", path: "/exam-schedules" },
  { icon: "focus", label: "집중", path: "/focus" },
  { icon: "reflection", label: "회고", path: "/reflection" },
  { icon: "statistics", label: "통계", path: "/statistics" },
  { icon: "studyRoom", label: "스터디룸", path: "/study-room" },
  { icon: "accountability", label: "친구 동행", path: "/accountability" },
  { icon: "settings", label: "설정", path: "/settings" },
];

function SidebarIcon({ type }: { type: SidebarIconType }) {
  return (
    <svg
      aria-hidden="true"
      className={styles.navIcon}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {type === "home" ? (
        <>
          <path d="m4 11 8-7 8 7" />
          <path d="M6 10v9h12v-9" />
        </>
      ) : null}
      {type === "plan" ? (
        <>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="m9 12 2 2 4-5" />
        </>
      ) : null}
      {type === "timetable" ? (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </>
      ) : null}
      {type === "vision" ? (
        <>
          <path d="M12 19V8" />
          <path d="M8 12c-2.5 0-4-1.8-4-4 2.6-.2 4.3.8 5 3" />
          <path d="M16 12c2.5 0 4-1.8 4-4-2.6-.2-4.3.8-5 3" />
          <path d="M7 20h10" />
        </>
      ) : null}
      {type === "exam" ? (
        <>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h3" />
          <path d="m15 16 1 1 2-3" />
        </>
      ) : null}
      {type === "focus" ? (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </>
      ) : null}
      {type === "reflection" ? (
        <>
          <path d="M4 12a8 8 0 0 1 13.7-5.7" />
          <path d="M18 3v5h-5" />
          <path d="M20 12a8 8 0 0 1-13.7 5.7" />
          <path d="M6 21v-5h5" />
        </>
      ) : null}
      {type === "statistics" ? (
        <>
          <path d="M5 19V9" />
          <path d="M12 19V5" />
          <path d="M19 19v-7" />
        </>
      ) : null}
      {type === "friends" ? (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M16 11a3 3 0 0 0 0-6" />
          <path d="M17 20a5 5 0 0 0-3-4.5" />
        </>
      ) : null}
      {type === "studyRoom" ? (
        <>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M8 6V4M16 6V4" />
          <circle cx="9" cy="13" r="1.5" />
          <circle cx="15" cy="13" r="1.5" />
        </>
      ) : null}
      {type === "accountability" ? (
        <>
          <circle cx="12" cy="9" r="3" />
          <path d="M6 21a6 6 0 0 1 12 0" />
          <path d="M19 6l2 2-2 2" />
          <path d="M21 8h-6" />
        </>
      ) : null}
      {type === "settings" ? (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.3 3.1h5l.3-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" />
        </>
      ) : null}
    </svg>
  );
}

function FriendsIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 11a3 3 0 0 0 0-6" />
      <path d="M17 20a5 5 0 0 0-3-4.5" />
    </svg>
  );
}

export function AppSidebar({
  ariaHidden = false,
  friendText = "연결된 친구 없음",
  onLogout,
  profileName = "김모브라",
  profileSubtitle,
  quote = "작은 실행이 큰 변화를 만들어요.",
}: AppSidebarProps) {
  return (
    <aside className={styles.sidebar} aria-hidden={ariaHidden ? true : undefined}>
      <NavLink className={styles.brand} to="/" aria-label="Movra 홈">
        <img className={styles.brandLogo} src={movraLogo} alt="Movra" />
      </NavLink>

      <nav className={styles.sideNav} aria-label="기능 메뉴">
        {sidebarItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              isActive ? styles.activeNavItem : styles.navItem
            }
            end={item.path === "/"}
            key={item.path}
            to={item.path}
          >
            <SidebarIcon type={item.icon} />
            <strong>{item.label}</strong>
            {item.meta ? <small>{item.meta}</small> : null}
          </NavLink>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.profileCard}>
          <img src={characterDefault} alt="" aria-hidden="true" />
          <div>
            <strong>{profileName}</strong>
            <span>{profileSubtitle}</span>
          </div>
        </div>
        <div className={styles.friendCard} aria-label="친구 동행">
          <span className={styles.friendCardIcon} aria-hidden="true">
            <FriendsIcon />
          </span>
          <div>
            <strong>친구 동행</strong>
            <span>{friendText}</span>
          </div>
        </div>
        <button className={styles.logoutButton} onClick={onLogout} type="button">
          로그아웃
        </button>
        <p className={styles.sidebarQuote}>{quote}</p>
      </div>
    </aside>
  );
}
