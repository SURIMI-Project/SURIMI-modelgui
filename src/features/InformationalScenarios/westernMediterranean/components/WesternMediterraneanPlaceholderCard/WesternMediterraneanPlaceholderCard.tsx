import { westernPlaceholderContent } from "../../consts";
import styles from "./WesternMediterraneanPlaceholderCard.module.css";

type WesternMediterraneanPlaceholderCardProps = {
  onOpenInfoModal?: () => void;
};

const WesternMediterraneanPlaceholderCard = ({
  onOpenInfoModal,
}: WesternMediterraneanPlaceholderCardProps) => {
  return (
    <div className={styles.placeholderRoot}>
      <div className={styles.headerRow}>
        <h4 className={styles.title}>{westernPlaceholderContent.title}</h4>
        {onOpenInfoModal ? (
          <button
            type="button"
            className={styles.infoButton}
            onClick={onOpenInfoModal}
            aria-label="Open more information about the Northwestern Mediterranean models"
          >
            About the models
          </button>
        ) : null}
      </div>
      <p className={styles.subtitle}>{westernPlaceholderContent.subtitle}</p>
      <figure className={styles.mediaFrame}>
        <img
          className={styles.image}
          src={westernPlaceholderContent.imageSrc}
          alt={westernPlaceholderContent.imageAlt}
        />
      </figure>
    </div>
  );
};

export default WesternMediterraneanPlaceholderCard;
