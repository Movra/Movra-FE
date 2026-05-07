import { NavLink, Route, Routes, useLocation } from "react-router-dom";

import { RequireAuth } from "../features/auth/RequireAuth";
import { FeaturePlaceholderPage } from "../pages/FeaturePlaceholderPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { OAuthProfileSetupPage } from "../pages/OAuthProfileSetupPage";
import { OnboardingPage } from "../pages/OnboardingPage";
import { PlanningPage } from "../pages/PlanningPage";
import { SignupPage } from "../pages/SignupPage";
import { TimetablePage } from "../pages/TimetablePage";
import { useAuth } from "../features/auth/useAuth";
import { SproutMark } from "../shared/ui/SproutMark";
import styles from "./AppRoutes.module.css";

const placeholderRoutes = [
  { path: "/focus", title: "집중" },
  { path: "/reflection", title: "회고" },
  { path: "/statistics", title: "통계" },
  { path: "/friends", title: "친구" },
  { path: "/settings", title: "설정" },
] as const;

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
  const isPlaceholderRoute = placeholderRoutes.some(
    (route) => route.path === location.pathname,
  );

  return (
    <div className={styles.appShell}>
      <a className={styles.skipLink} href="#main">
        본문으로 이동
      </a>
      {isAuthRoute ||
      isHomeRoute ||
      isPlanningRoute ||
      isTimetableRoute ||
      isPlaceholderRoute ? null : (
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
              : isPlanningRoute || isTimetableRoute || isPlaceholderRoute
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
          {placeholderRoutes.map((route) => (
            <Route
              element={
                <RequireAuth>
                  <FeaturePlaceholderPage title={route.title} />
                </RequireAuth>
              }
              key={route.path}
              path={route.path}
            />
          ))}
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
