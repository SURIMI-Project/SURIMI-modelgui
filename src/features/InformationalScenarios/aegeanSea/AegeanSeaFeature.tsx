import GlassCard from "../../../components/GlassCard/GlassCard";
import AegeanSeaPlaceholderCard from "./components/AegeanSeaPlaceholderCard/AegeanSeaPlaceholderCard";
import styles from "./AegeanSeaFeature.module.css";

const AegeanSeaFeature = () => {
  return (
    <GlassCard variant="western" className={styles.card}>
      <AegeanSeaPlaceholderCard />
    </GlassCard>
  );
};

export default AegeanSeaFeature;
