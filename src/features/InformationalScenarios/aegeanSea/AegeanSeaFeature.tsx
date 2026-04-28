import GlassCard from "../../../components/GlassCard/GlassCard";
import AegeanSeaPlaceholderCard from "./components/AegeanSeaPlaceholderCard/AegeanSeaPlaceholderCard";
import styles from "./AegeanSeaFeature.module.css";

type AegeanSeaFeatureProps = {
  onOpenInfoModal?: () => void;
};

const AegeanSeaFeature = ({ onOpenInfoModal }: AegeanSeaFeatureProps) => {
  return (
    <GlassCard variant="western" className={styles.card}>
      <AegeanSeaPlaceholderCard onOpenInfoModal={onOpenInfoModal} />
    </GlassCard>
  );
};

export default AegeanSeaFeature;
