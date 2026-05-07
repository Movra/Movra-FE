import { type FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { ApiClientError } from "../shared/api/client";
import { getOAuthAuthorizeUrl } from "../features/auth/api";
import { useAuth } from "../features/auth/useAuth";
import { AuthLayout } from "./AuthLayout";
import styles from "./LoginPage.module.css";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

function getLoginErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "로그인 중 문제가 발생했습니다.";
}

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const state = location.state as LocationState | null;
  const nextPath = state?.from?.pathname ?? "/";

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextAccountId = accountId.trim();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!nextAccountId || !password) {
      setErrorMessage("계정 ID와 비밀번호를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ accountId: nextAccountId, password });
      setSuccessMessage("로그인 완료");
      navigate(nextPath, { replace: true });
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout variant="login">
      <article className={styles.card} aria-labelledby="login-title">
        <div className={styles.cardHeader}>
          <p className={styles.eyebrow}>Welcome back</p>
          <h1 id="login-title" className={styles.title}>
            로그인
          </h1>
          <p className={styles.description}>
            Movra에 오신 것을 환영해요.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="accountId">
              계정 ID
            </label>
            <input
              id="accountId"
              className={styles.input}
              autoComplete="username"
              maxLength={20}
              name="accountId"
              onChange={(event) => setAccountId(event.target.value)}
              placeholder="아이디를 입력해주세요"
              required
              type="text"
              value={accountId}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              className={styles.input}
              autoComplete="current-password"
              maxLength={20}
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호를 입력해주세요"
              required
              type="password"
              value={password}
            />
          </div>

          {errorMessage ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}
          {successMessage ? (
            <p className={styles.success} role="status">
              {successMessage}
            </p>
          ) : null}

          <button
            className={styles.submit}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "로그인 중" : "로그인"}
          </button>
        </form>

        <div className={styles.divider}>
          <span>또는</span>
        </div>

        <div className={styles.oauthStack} aria-label="OAuth 로그인">
          <a className={styles.oauthButton} href={getOAuthAuthorizeUrl("google")}>
            <span className={styles.googleMark} aria-hidden="true">
              G
            </span>
            Google로 로그인
          </a>
          <a className={styles.oauthButton} href={getOAuthAuthorizeUrl("naver")}>
            <span className={styles.naverMark} aria-hidden="true">
              N
            </span>
            Naver로 로그인
          </a>
        </div>

        <p className={styles.switchText}>
          아직 계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </p>
      </article>
    </AuthLayout>
  );
}
