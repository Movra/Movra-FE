import type { ReactNode } from "react";

import styles from "./PageHeader.module.css";

type PageHeaderProps = {
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  titleId: string;
};

export function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  title,
  titleId,
}: PageHeaderProps) {
  const headerClassName = [styles.pageHeader, styles.pageHeaderSurface, className]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={headerClassName}>
      <div className={styles.copy}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.title} id={titleId}>
          {title}
        </h1>
        {description ? (
          <p className={styles.description}>{description}</p>
        ) : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
