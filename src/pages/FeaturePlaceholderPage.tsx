import { Link } from "react-router-dom";

import { SproutMark } from "../shared/ui/SproutMark";
import styles from "./FeaturePlaceholderPage.module.css";

type FeaturePlaceholderPageProps = {
  title: string;
};

export function FeaturePlaceholderPage({ title }: FeaturePlaceholderPageProps) {
  return (
    <section className={styles.page} aria-labelledby="placeholder-title">
      <div className={styles.panel}>
        <SproutMark className={styles.mark} aria-hidden />
        <p>{title}</p>
        <h1 id="placeholder-title">기능 미구현</h1>
        <Link to="/">홈으로 돌아가기</Link>
      </div>
    </section>
  );
}
