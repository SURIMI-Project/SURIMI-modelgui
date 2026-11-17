import type { ReactNode } from "react";
import { FiArrowLeft } from "react-icons/fi";
import Logo from "../../components/Logo/Logo";
import ButtonLink from "../../components/ui/Button/ButtonLink";
import Tag from "../../components/ui/Tag/Tag";
import styles from "./Cmsy.module.css";

type Props = { title: string; description: string; backHref?: string; backLabel?: string; children: ReactNode };
export default function CmsyLayout({ title, description, backHref = "/scenarios", backLabel = "CASE STUDIES", children }: Props) {
  return <main className={styles.page}>
    <div className={styles.container}>
      <header className={styles.brand}><Logo className={styles.logo} /><span>MODEL USER INTERFACE</span>
        <ButtonLink to={backHref} variant="ghost" size="sm"><FiArrowLeft aria-hidden="true" />{backLabel}</ButtonLink>
      </header>
      <div className={styles.heading}><div><p className={styles.eyebrow}>CMSY</p><h1>{title}</h1><p>{description}</p></div><Tag tone="secondary">DEMO DATA</Tag></div>
      {children}
    </div>
  </main>;
}
