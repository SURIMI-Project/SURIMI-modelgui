import GlassCard from "../../../components/GlassCard/GlassCard";
import WesternMediterraneanPlaceholderCard from "./components/WesternMediterraneanPlaceholderCard/WesternMediterraneanPlaceholderCard";
import styles from "./WesternMediterraneanFeature.module.css";

const WesternMediterraneanFeature = () => {
  return (
    <GlassCard variant="aegean" className={styles.card}>
      <WesternMediterraneanPlaceholderCard />
    </GlassCard>
  );
};

export default WesternMediterraneanFeature;
