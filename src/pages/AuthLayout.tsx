import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import characterDefault from "../assets/auth/character-default.png";
import characterFocus from "../assets/auth/character-focus.png";
import characterMindSweep from "../assets/auth/character-mindsweep.png";
import movraLogo from "../assets/auth/movra-logo-cropped.png";
import styles from "./LoginPage.module.css";

type AuthLayoutVariant = "login" | "oauth" | "signup";

type AuthLayoutProps = {
  children: ReactNode;
  variant: AuthLayoutVariant;
};

const variantCopy: Record<
  AuthLayoutVariant,
  {
    character: string;
    characterAlt: string;
    description: string;
    highlight: string;
    title: string;
  }
> = {
  login: {
    character: characterDefault,
    characterAlt: "Movra 기본 캐릭터",
    description: "작은 시작이 쌓여 오늘의 루틴을 다시 세워요.",
    highlight: "다시 시작하는 힘",
    title: "무너져도,",
  },
  oauth: {
    character: characterMindSweep,
    characterAlt: "노트에 적고 있는 Movra 캐릭터",
    description: "프로필을 완성하고 더 집중된 하루를 시작해보세요.",
    highlight: "환영해요!",
    title: "Movra에 오신 것을",
  },
  signup: {
    character: characterDefault,
    characterAlt: "Movra 기본 캐릭터",
    description: "계정을 만들고 Movra의 하루 실행 루프를 시작하세요.",
    highlight: "자라나요",
    title: "함께, 더 나은 나로",
  },
};

export function AuthLayout({ children, variant }: AuthLayoutProps) {
  const copy = variantCopy[variant];
  const isSignup = variant === "signup";

  return (
    <section className={`${styles.authPage} ${isSignup ? styles.signupPage : ""}`}>
      <div className={styles.authBackdrop} aria-hidden="true">
        <span className={styles.leafOne} />
        <span className={styles.leafTwo} />
        <span className={styles.leafThree} />
      </div>

      <div className={`${styles.authShell} ${isSignup ? styles.signupShell : ""}`}>
        {!isSignup ? (
        <aside className={styles.brandPanel} aria-label="Movra 소개">
          <Link className={styles.logoLink} to="/login" aria-label="Movra 로그인">
            <img className={styles.logoImage} src={movraLogo} alt="Movra" />
          </Link>

          <div className={styles.brandCopy}>
            <p className={styles.brandTitle}>
              {copy.title}
              <br />
              <span>{copy.highlight}</span>
            </p>
            <p className={styles.brandDescription}>{copy.description}</p>
          </div>

          <div
            className={`${styles.characterScene} ${
              variant === "login" ? styles.loginCharacterScene : ""
            }`}
          >
            <div className={styles.characterGround} />
            <img
              className={styles.heroCharacter}
              src={copy.character}
              alt={copy.characterAlt}
            />
            {variant === "login" ? (
              <img
                className={styles.focusCharacter}
                src={characterFocus}
                alt="5분 집중을 시작한 Movra 캐릭터"
              />
            ) : null}
          </div>

          <div className={styles.brandNotes} aria-label="서비스 특징">
            <span>작은 시작</span>
            <span>학교 시간 배려</span>
            <span>다시 시작</span>
          </div>
        </aside>
        ) : null}

        <div className={styles.formPanel}>{children}</div>
      </div>

      <footer className={styles.authFooter}>
        <span>이용약관</span>
        <span>개인정보처리방침</span>
        <span>고객센터</span>
        <span>© Movra. All rights reserved.</span>
      </footer>
    </section>
  );
}
