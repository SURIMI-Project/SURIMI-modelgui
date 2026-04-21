import { Badge, Text, Title } from "@mantine/core";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import styles from "./DashboardLayout.module.css";

type DashboardLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  headerAside?: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  headerCopyClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  showKicker?: boolean;
  headerLayout?: "default" | "centered" | "three-column";
};

const DashboardLayout = ({
  title,
  subtitle,
  children,
  headerAside,
  headerLeft,
  headerRight,
  headerCopyClassName,
  titleClassName,
  subtitleClassName,
  showKicker = true,
  headerLayout = "default",
}: DashboardLayoutProps) => {
  return (
    <main className={styles.page}>
      <div className={styles.atmosphere} aria-hidden="true" />

      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={[
            styles.headerInner,
            headerLayout === "centered" ? styles.headerInnerCentered : "",
            headerLayout === "three-column" ? styles.headerInnerThreeColumn : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {headerLayout === "three-column" ? (
            <div className={styles.headerColumnLeft}>{headerLeft}</div>
          ) : null}

          {headerAside && headerLayout === "centered" ? (
            <div className={styles.headerAsideLeft}>{headerAside}</div>
          ) : null}

          <div
            className={[styles.headerCopy, headerCopyClassName]
              .filter(Boolean)
              .join(" ")}
          >
            {showKicker ? (
              <Badge className={styles.kicker} variant="light">
                Scenario Outputs Dashboard
              </Badge>
            ) : null}
            <Title
              className={[styles.title, titleClassName]
                .filter(Boolean)
                .join(" ")}
            >
              {title}
            </Title>
            <Text
              className={[styles.subtitle, subtitleClassName]
                .filter(Boolean)
                .join(" ")}
            >
              {subtitle}
            </Text>
          </div>

          {headerAside && headerLayout !== "centered" ? (
            <div className={styles.headerAside}>{headerAside}</div>
          ) : null}

          {headerLayout === "three-column" ? (
            <div className={styles.headerColumnRight}>{headerRight}</div>
          ) : null}

          {headerAside && headerLayout === "centered" ? (
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
