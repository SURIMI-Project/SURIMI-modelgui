import { westernPlaceholderContent } from "../../consts";
import styles from "./WesternMediterraneanPlaceholderCard.module.css";

const WesternMediterraneanPlaceholderCard = () => {
  return (
    <div className={styles.placeholderRoot}>
      <p className={styles.eyebrow}>{westernPlaceholderContent.eyebrow}</p>
      <h4 className={styles.title}>{westernPlaceholderContent.title}</h4>
      {westernPlaceholderContent.body.map((paragraph) => (
        <p key={paragraph} className={styles.body}>
          {paragraph}
        </p>
      ))}
      <div className={styles.noteBox}>{westernPlaceholderContent.note}</div>
    </div>
  );
};

export default WesternMediterraneanPlaceholderCard;
