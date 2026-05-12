import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";

import { RequireAuth } from "../features/auth/RequireAuth";
import { AccountabilityPage } from "../pages/AccountabilityPage";
import { ExamSchedulesPage } from "../pages/ExamSchedulesPage";
import { FocusPage } from "../pages/FocusPage";
import { FutureVisionPage } from "../pages/FutureVisionPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { OAuthProfileSetupPage } from "../pages/OAuthProfileSetupPage";
import { OnboardingPage } from "../pages/OnboardingPage";
import { PlanningPage } from "../pages/PlanningPage";
import { ReflectionPage } from "../pages/ReflectionPage";
import { SettingsPage } from "../pages/SettingsPage";
import { SignupPage } from "../pages/SignupPage";
import { StatisticsPage } from "../pages/StatisticsPage";
import { StudyRoomPage } from "../pages/StudyRoomPage";
import { TimetablePage } from "../pages/TimetablePage";
import { useAuth } from "../features/auth/useAuth";
import { SproutMark } from "../shared/ui/SproutMark";
import styles from "./AppRoutes.module.css";

export function AppRoutes() {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const isAuthRoute =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/oauth/profile-setup" ||
    location.pathname === "/onboarding";
  const isHomeRoute = location.pathname === "/";
  const isPlanningRoute = location.pathname === "/planning";
  const isTimetableRoute = location.pathname === "/timetable";
  const isFocusRoute = location.pathname === "/focus";
  const isFutureVisionRoute = location.pathname === "/future-vision";
  const isExamSchedulesRoute = location.pathname === "/exam-schedules";
  const isReflectionRoute = location.pathname === "/reflection";
  const isStatisticsRoute = location.pathname === "/statistics";
  const isSettingsRoute = location.pathname === "/settings";
  const isStudyRoomRoute =
    location.pathname.startsWith("/study-room") || location.pathname === "/friends";
  const isAccountabilityRoute = location.pathname === "/accountability";

  return (
    <div className={styles.appShell}>
      <a className={styles.skipLink} href="#main">
        본문으로 이동
      </a>
      {isAuthRoute ||
      isHomeRoute ||
      isPlanningRoute ||
      isTimetableRoute ||
      isFocusRoute ||
      isFutureVisionRoute ||
      isExamSchedulesRoute ||
      isReflectionRoute ||
      isStatisticsRoute ||
      isSettingsRoute ||
      isStudyRoomRoute ||
      isAccountabilityRoute ? null : (
        <header className={styles.header}>
          <nav className={styles.nav} aria-label="주요 메뉴">
            <NavLink className={styles.wordmark} to="/" aria-label="Movra 홈">
              <SproutMark className={styles.wordmarkIcon} aria-hidden />
              <span>Movra</span>
            </NavLink>
            <div className={styles.navLinks}>
              <NavLink className={styles.navLink} to="/">
                오늘
              </NavLink>
              {isAuthenticated ? (
                <button className={styles.navButton} onClick={logout} type="button">
                  로그아웃
                </button>
              ) : (
                <NavLink className={styles.navLink} to="/login">
                  로그인
                </NavLink>
              )}
            </div>
          </nav>
        </header>
      )}
      <main
        id="main"
        className={
          isAuthRoute
            ? styles.authMain
            : isHomeRoute
              ? styles.dashboardMain
              : isPlanningRoute ||
                  isTimetableRoute ||
                  isFocusRoute ||
                  isFutureVisionRoute ||
                  isExamSchedulesRoute ||
                  isReflectionRoute ||
                  isStatisticsRoute ||
                  isSettingsRoute ||
                  isStudyRoomRoute ||
                  isAccountabilityRoute
                ? styles.dashboardMain
                : styles.main
        }
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/oauth/profile-setup"
            element={<OAuthProfileSetupPage />}
          />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <OnboardingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <HomePage />
              </RequireAuth>
            }
          />
          <Route
            path="/planning"
            element={
              <RequireAuth>
                <PlanningPage />
              </RequireAuth>
            }
          />
          <Route
            path="/timetable"
            element={
              <RequireAuth>
                <TimetablePage />
              </RequireAuth>
            }
          />
          <Route
            path="/focus"
            element={
              <RequireAuth>
                <FocusPage />
              </RequireAuth>
            }
          />
          <Route
            path="/future-vision"
            element={
              <RequireAuth>
                <FutureVisionPage />
              </RequireAuth>
            }
          />
          <Route
            path="/exam-schedules"
            element={
              <RequireAuth>
                <ExamSchedulesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/reflection"
            element={
              <RequireAuth>
                <ReflectionPage />
              </RequireAuth>
            }
          />
          <Route
            path="/statistics"
            element={
              <RequireAuth>
                <StatisticsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/study-room"
            element={
              <RequireAuth>
                <StudyRoomPage />
              </RequireAuth>
            }
          />
          <Route
            path="/study-room/create"
            element={
              <RequireAuth>
                <StudyRoomPage />
              </RequireAuth>
            }
          />
          <Route
            path="/study-room/join"
            element={
              <RequireAuth>
                <StudyRoomPage />
              </RequireAuth>
            }
          />
          <Route
            path="/study-room/rooms/:roomId"
            element={
              <RequireAuth>
                <StudyRoomPage />
              </RequireAuth>
            }
          />
          <Route
            path="/friends"
            element={
              <RequireAuth>
                <Navigate replace to="/study-room" />
              </RequireAuth>
            }
          />
          <Route
            path="/accountability"
            element={
              <RequireAuth>
                <AccountabilityPage />
              </RequireAuth>
            }
          />
          <Route
            path="*"
            element={
              <RequireAuth>
                <HomePage />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
