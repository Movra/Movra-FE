import { type FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import characterMindSweep from "../assets/auth/character-mindsweep.webp";
import { useAuth } from "../features/auth/useAuth";
import { ApiClientError } from "../shared/api/client";
import { AuthLayout } from "./AuthLayout";
import styles from "./LoginPage.module.css";

function getOAuthSetupErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "OAuth 프로필 설정 중 문제가 발생했습니다.";
}

export function OAuthProfileSetupPage() {
  const { completeOAuthProfileSetup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pendingToken = searchParams.get("pendingToken") ?? "";
  const [accountId, setAccountId] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!profileImage || typeof URL.createObjectURL !== "function") {
      setProfilePreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(profileImage);
    setProfilePreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [profileImage]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextAccountId = accountId.trim();
    const nextProfileName = profileName.trim();
    setErrorMessage(null);

    if (!pendingToken) {
      setErrorMessage("OAuth 인증 토큰이 없어 프로필을 설정할 수 없습니다.");
      return;
    }

    if (!nextAccountId || !nextProfileName || !password) {
      setErrorMessage("필수 정보를 입력해주세요.");
      return;
    }

    if (!profileImage) {
      setErrorMessage("프로필 이미지를 선택해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      await completeOAuthProfileSetup({
        accountId: nextAccountId,
        password,
        pendingToken,
        profileImage,
        profileName: nextProfileName,
      });
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(getOAuthSetupErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout variant="oauth">
      <article className={styles.card} aria-labelledby="oauth-title">
        <div className={styles.cardHeader}>
          <p className={styles.eyebrow}>OAuth setup</p>
          <h1 id="oauth-title" className={styles.title}>
            프로필 설정
          </h1>
          <p className={styles.description}>
            나를 나타내는 정보를 입력하고 Movra를 시작하세요.
          </p>
        </div>

        {!pendingToken ? (
          <p className={styles.error} role="alert">
            OAuth 인증 토큰이 없습니다. 다시 로그인해 주세요.
          </p>
        ) : null}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="oauth-account-id">
                계정 ID
              </label>
              <input
                id="oauth-account-id"
                className={styles.input}
                autoComplete="username"
                maxLength={20}
                name="accountId"
                onChange={(event) => setAccountId(event.target.value)}
                placeholder="아이디"
                required
                type="text"
                value={accountId}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="oauth-profile-name">
                프로필 이름
              </label>
              <input
                id="oauth-profile-name"
                className={styles.input}
                autoComplete="nickname"
                maxLength={20}
                name="profileName"
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="표시 이름"
                required
                type="text"
                value={profileName}
              />
            </div>
          </div>

          <div className={styles.profileUpload}>
            <div className={styles.profilePreview}>
              <img
                src={profilePreviewUrl ?? characterMindSweep}
                alt={profileImage ? "선택한 프로필 이미지" : "기본 프로필 캐릭터"}
              />
            </div>
            <div className={styles.profileUploadCopy}>
              <label className={styles.fileButton} htmlFor="oauth-profile-image">
                이미지 선택
              </label>
              <input
                id="oauth-profile-image"
                accept="image/jpeg,image/png,image/webp"
                className={styles.fileInput}
                name="profileImage"
                onChange={(event) =>
                  setProfileImage(event.target.files?.[0] ?? null)
                }
                required
                type="file"
              />
              <p className={styles.helpText}>
                {profileImage?.name ?? "JPG, PNG, WEBP 파일"}
              </p>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="oauth-password">
              비밀번호
            </label>
            <input
              id="oauth-password"
              className={styles.input}
              autoComplete="new-password"
              maxLength={20}
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8~20자"
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

          <button
            className={styles.submit}
            disabled={!pendingToken || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "설정 중" : "Movra 시작"}
          </button>
        </form>

        <p className={styles.switchText}>
          다른 계정으로 시작할까요? <Link to="/login">로그인</Link>
        </p>
      </article>
    </AuthLayout>
  );
}
