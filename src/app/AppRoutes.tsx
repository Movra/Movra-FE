import { lazy, Suspense } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";

import { RequireAuth } from "../features/auth/RequireAuth";
import { useAuth } from "../features/auth/useAuth";
import { SproutMark } from "../shared/ui/SproutMark";
import styles from "./AppRoutes.module.css";

const AccountabilityPage = lazy(() =>
  import("../pages/AccountabilityPage").then((module) => ({
    default: module.AccountabilityPage,
  })),
);
const ExamSchedulesPage = lazy(() =>
  import("../pages/ExamSchedulesPage").then((module) => ({
    default: module.ExamSchedulesPage,
  })),
);
const FocusPage = lazy(() =>
  import("../pages/FocusPage").then((module) => ({
    default: module.FocusPage,
  })),
);
const FutureVisionPage = lazy(() =>
  import("../pages/FutureVisionPage").then((module) => ({
    default: module.FutureVisionPage,
  })),
);
const HomePage = lazy(() =>
  import("../pages/HomePage").then((module) => ({
    default: module.HomePage,
  })),
);
const LoginPage = lazy(() =>
  import("../pages/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const OAuthProfileSetupPage = lazy(() =>
  import("../pages/OAuthProfileSetupPage").then((module) => ({
    default: module.OAuthProfileSetupPage,
  })),
);
const OnboardingPage = lazy(() =>
  import("../pages/OnboardingPage").then((module) => ({
    default: module.OnboardingPage,
  })),
);
const PlanningPage = lazy(() =>
  import("../pages/PlanningPage").then((module) => ({
    default: module.PlanningPage,
  })),
);
const ReflectionPage = lazy(() =>
  import("../pages/ReflectionPage").then((module) => ({
    default: module.ReflectionPage,
  })),
);
const SettingsPage = lazy(() =>
  import("../pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const SignupPage = lazy(() =>
  import("../pages/SignupPage").then((module) => ({
    default: module.SignupPage,
  })),
);
const StatisticsPage = lazy(() =>
  import("../pages/StatisticsPage").then((module) => ({
    default: module.StatisticsPage,
  })),
);
const StudyRoomPage = lazy(() =>
  import("../pages/StudyRoomPage").then((module) => ({
    default: module.StudyRoomPage,
  })),
);
const TimetablePage = lazy(() =>
  import("../pages/TimetablePage").then((module) => ({
    default: module.TimetablePage,
  })),
);

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
  const isAccountabilityRoute = location.pathname.startsWith("/accountability");

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
        <Suspense fallback={<div className={styles.routeFallback} />}>
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
              path="/accountability/*"
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
        </Suspense>
      </main>
    </div>
  );
}
