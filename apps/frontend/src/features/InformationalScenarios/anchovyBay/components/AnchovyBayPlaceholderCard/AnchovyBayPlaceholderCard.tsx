import { anchovyBayPlaceholderContent } from "../../../../../../mock-data/content/anchovyIntroduction";
import styles from "./AnchovyBayPlaceholderCard.module.css";


type AnchovyBayPlaceholderCardProps = {
  onOpenInfoModal?: () => void;
};

const AnchovyBayPlaceholderCard = ({
  onOpenInfoModal,
}: AnchovyBayPlaceholderCardProps) => {
  return (
    <div className={styles.placeholderRoot}>
      <div className={styles.headerRow}>
        <h4 className={styles.title}>{anchovyBayPlaceholderContent.title}</h4>
        {onOpenInfoModal ? (
          <button
            type="button"
            className={styles.infoButton}
            onClick={onOpenInfoModal}
            aria-label="Open more information about the Anchovy Bay models"
          >
            About the models
          </button>
        ) : null}
      </div>
      <p className={styles.subtitle}>{anchovyBayPlaceholderContent.subtitle}</p>
      <figure className={styles.mediaFrame}>
        <img
          className={styles.image}
          src={anchovyBayPlaceholderContent.imageSrc}
          alt={anchovyBayPlaceholderContent.imageAlt}
        />
      </figure>
    </div>
  );
};

export default AnchovyBayPlaceholderCard;
