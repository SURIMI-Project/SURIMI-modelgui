import Badge from "../../../../components/ui/Tag/Tag";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import styles from "./DashboardLayout.module.css";

type DashboardLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  headerAside?: ReactNode;
  headerLeft?: ReactNode;
  headerCenter?: ReactNode;
  headerRight?: ReactNode;
  headerCopyClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  showKicker?: boolean;
  headerLayout?: "default" | "centered" | "three-column" | "split";
};

const DashboardLayout = ({
  title,
  subtitle,
  children,
  headerAside,
  headerLeft,
  headerCenter,
  headerRight,
  headerCopyClassName,
  titleClassName,
  subtitleClassName,
  showKicker = true,
  headerLayout = "default",
}: DashboardLayoutProps) => {
  const isCentered = headerLayout === "centered";
  const isThreeColumn = headerLayout === "three-column";
  const isSplit = headerLayout === "split";

  return (
    <main className={styles.page}>
      <div className={styles.atmosphere} aria-hidden="true" />

      <div className={styles.mockBanner} role="status" aria-live="polite">
        <FiAlertTriangle className={styles.mockBannerIcon} aria-hidden="true" />
        <span className={styles.mockBannerText}>
          <strong>Mock data:</strong> the values shown on this page are
          placeholders for demonstration only — please disregard the figures
          themselves.
        </span>
      </div>

      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={[
            styles.headerInner,
            isCentered ? styles.headerInnerCentered : "",
            isThreeColumn ? styles.headerInnerThreeColumn : "",
            isSplit ? styles.headerInnerSplit : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {isThreeColumn || isSplit ? (
            <div className={styles.headerColumnLeft}>{headerLeft}</div>
          ) : null}

          {headerAside && isCentered ? (
            <div className={styles.headerAsideLeft}>{headerAside}</div>
          ) : null}

          {isThreeColumn && headerCenter ? (
            <div className={styles.headerColumnCenter}>{headerCenter}</div>
          ) : !isSplit ? (
            <div
              className={[styles.headerCopy, headerCopyClassName]
                .filter(Boolean)
                .join(" ")}
            >
              {showKicker ? (
                <Badge className={styles.kicker}>
                  Scenario Outputs Dashboard
                </Badge>
              ) : null}
              <h1
                className={[styles.title, titleClassName]
                  .filter(Boolean)
                  .join(" ")}
              >
                {title}
              </h1>
              <p
                className={[styles.subtitle, subtitleClassName]
                  .filter(Boolean)
                  .join(" ")}
              >
                {subtitle}
              </p>
            </div>
          ) : null}

          {headerAside && !isCentered ? (
            <div className={styles.headerAside}>{headerAside}</div>
          ) : null}

          {isThreeColumn || isSplit ? (
            <div className={styles.headerColumnRight}>{headerRight}</div>
          ) : null}

          {headerAside && isCentered ? (
            <div className={styles.headerAsideSpacer} aria-hidden="true" />
          ) : null}
        </div>
      </motion.header>

      <motion.section
        className={styles.content}
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.56, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.section>
    </main>
  );
};

export default DashboardLayout;
