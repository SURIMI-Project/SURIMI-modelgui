import GlassCard from "../../../components/GlassCard/GlassCard";
import AnchovyBayPlaceholderCard from "./components/AnchovyBayPlaceholderCard/AnchovyBayPlaceholderCard";
import styles from "./AnchovyBayFeature.module.css";
// import TrophicLevelGraphCard from "./components/TrophicLevelGraphCard/TrophicLevelGraphCard";

type AnchovyBayFeatureProps = {
  onOpenInfoModal?: () => void;
};

const AnchovyBayFeature = ({ onOpenInfoModal }: AnchovyBayFeatureProps) => {
  return (
    <GlassCard variant="anchovy" className={styles.anchovyCard}>
      <AnchovyBayPlaceholderCard onOpenInfoModal={onOpenInfoModal} />

      {/* <div className={styles.statusRow}>
        <div>
          <span>Recovered Marine Mammals</span>
          <strong>Predator pressure increasing</strong>
        </div>
        <div>
          <span>Fishery Shift</span>
          <strong>Groundfish to shrimp & pelagics</strong>
        </div>
      </div>

      <TrophicLevelGraphCard /> */}
    </GlassCard>
  );
};

export default AnchovyBayFeature;
