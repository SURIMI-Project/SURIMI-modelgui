import { aegeanPlaceholderContent } from "../../consts";
import styles from "./AegeanSeaPlaceholderCard.module.css";

const AegeanSeaPlaceholderCard = () => {
  return (
    <div className={styles.placeholderRoot}>
      <p className={styles.eyebrow}>{aegeanPlaceholderContent.eyebrow}</p>
      <h4 className={styles.title}>{aegeanPlaceholderContent.title}</h4>
      {aegeanPlaceholderContent.body.map((paragraph) => (
        <p key={paragraph} className={styles.body}>
          {paragraph}
        </p>
      ))}
      <div className={styles.noteBox}>{aegeanPlaceholderContent.note}</div>
    </div>
  );
};

export default AegeanSeaPlaceholderCard;
