import styles from "./Logo.module.css";

type LogoProps = {
  className?: string;
  alt?: string;
};

const Logo = ({ className, alt = "SURIMI logo" }: LogoProps) => {
  const rootClassName = className ? `${styles.root} ${className}` : styles.root;

  return (
    <div className={rootClassName}>
      <img src="/surimiLogo.webp" alt={alt} className={styles.image} />
    </div>
  );
};

export default Logo;
