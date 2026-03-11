import TrophicLevelGraphCard from "./components/TrophicLevelGraphCard/TrophicLevelGraphCard";
import styles from "./AnchovyBayFeature.module.css";
import GlassCard from "../../../components/GlassCard/GlassCard";

const AnchovyBayFeature = () => {
  return (
    <GlassCard variant="anchovy" className={styles.anchovyCard}>
      <div className={styles.statusRow}>
        <div>
          <span>Recovered Marine Mammals</span>
          <strong>Predator pressure increasing</strong>
        </div>
        <div>
          <span>Fishery Shift</span>
          <strong>Groundfish to shrimp & pelagics</strong>
        </div>
      </div>

      <TrophicLevelGraphCard />
    </GlassCard>
  );
};

export default AnchovyBayFeature;
