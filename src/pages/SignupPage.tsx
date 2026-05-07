import { type FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import characterDefault from "../assets/auth/character-default.png";
import { signup } from "../features/auth/api";
import { useAuth } from "../features/auth/useAuth";
import { ApiClientError } from "../shared/api/client";
import { AuthLayout } from "./AuthLayout";
import styles from "./LoginPage.module.css";

function getSignupErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "회원가입 중 문제가 발생했습니다.";
}

export function SignupPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [accountId, setAccountId] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!profileImage) {
      setProfilePreviewUrl(null);
      return;
    }

    if (typeof URL.createObjectURL !== "function") {
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
    const nextEmail = email.trim();
    const nextProfileName = profileName.trim();
    setErrorMessage(null);

    if (!nextAccountId || !nextEmail || !nextProfileName) {
      setErrorMessage("필수 정보를 입력해주세요.");
      return;
    }

    if (!profileImage) {
      setErrorMessage("프로필 이미지를 선택해주세요.");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      await signup({
        accountId: nextAccountId,
        email: nextEmail,
        password,
        profileImage,
        profileName: nextProfileName,
      });
      navigate("/login", { replace: true });
    } catch (error) {
      setErrorMessage(getSignupErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout variant="signup">
      <article className={styles.card} aria-labelledby="signup-title">
        <div className={styles.cardHeader}>
          <p className={styles.eyebrow}>Create account</p>
          <h1 id="signup-title" className={styles.title}>
            회원가입
          </h1>
          <p className={styles.description}>
            계정을 만들어 Movra를 시작하세요.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-email">
              이메일
            </label>
            <input
              id="signup-email"
              className={styles.input}
              autoComplete="email"
              maxLength={255}
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="이메일을 입력해주세요"
              required
              type="email"
              value={email}
            />
          </div>

          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="signup-account-id">
                계정 ID
              </label>
              <input
                id="signup-account-id"
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
              <p className={styles.helpText}>20자 이하로 입력해주세요.</p>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="signup-profile-name">
                프로필 이름
              </label>
              <input
                id="signup-profile-name"
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
              <p className={styles.helpText}>20자 이하로 입력해주세요.</p>
            </div>
          </div>

          <div className={styles.profileUpload}>
            <div className={styles.profilePreview}>
              <img
                src={profilePreviewUrl ?? characterDefault}
                alt={profileImage ? "선택한 프로필 이미지" : "기본 프로필 캐릭터"}
              />
            </div>
            <div className={styles.profileUploadCopy}>
              <label className={styles.fileButton} htmlFor="signup-profile-image">
                이미지 선택
              </label>
              <input
                id="signup-profile-image"
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

          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="signup-password">
                비밀번호
              </label>
              <input
                id="signup-password"
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

            <div className={styles.field}>
              <label className={styles.label} htmlFor="signup-password-confirm">
                비밀번호 확인
              </label>
              <input
                id="signup-password-confirm"
                className={styles.input}
                autoComplete="new-password"
                maxLength={20}
                minLength={8}
                name="passwordConfirm"
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="다시 입력"
                required
                type="password"
                value={passwordConfirm}
              />
            </div>
          </div>

          {errorMessage ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}
          <button
            className={styles.submit}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "가입 중" : "회원가입"}
          </button>
        </form>

        <p className={styles.switchText}>
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </article>
    </AuthLayout>
  );
}
