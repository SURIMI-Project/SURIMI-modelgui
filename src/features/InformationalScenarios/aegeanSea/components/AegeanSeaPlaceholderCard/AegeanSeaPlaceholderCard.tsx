import { aegeanPlaceholderContent } from "../../consts";
import styles from "./AegeanSeaPlaceholderCard.module.css";

type AegeanSeaPlaceholderCardProps = {
  onOpenInfoModal?: () => void;
};

const AegeanSeaPlaceholderCard = ({
  onOpenInfoModal,
}: AegeanSeaPlaceholderCardProps) => {
  return (
    <div className={styles.placeholderRoot}>
      <div className={styles.headerRow}>
        <h4 className={styles.title}>{aegeanPlaceholderContent.title}</h4>
        {onOpenInfoModal ? (
          <button
            type="button"
            className={styles.infoButton}
            onClick={onOpenInfoModal}
            aria-label="Open more information about the Aegean Sea models"
          >
            About the models
          </button>
        ) : null}
      </div>
      <p className={styles.subtitle}>{aegeanPlaceholderContent.subtitle}</p>
      <figure className={styles.mediaFrame}>
        <img
          className={styles.image}
          src={aegeanPlaceholderContent.imageSrc}
          alt={aegeanPlaceholderContent.imageAlt}
        />
      </figure>
    </div>
  );
};

export default AegeanSeaPlaceholderCard;
