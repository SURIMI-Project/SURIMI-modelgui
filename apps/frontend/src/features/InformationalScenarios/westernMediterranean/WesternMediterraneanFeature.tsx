import GlassCard from "../../../components/GlassCard/GlassCard";
import WesternMediterraneanPlaceholderCard from "./components/WesternMediterraneanPlaceholderCard/WesternMediterraneanPlaceholderCard";
import styles from "./WesternMediterraneanFeature.module.css";

type WesternMediterraneanFeatureProps = {
  onOpenInfoModal?: () => void;
};

const WesternMediterraneanFeature = ({
  onOpenInfoModal,
}: WesternMediterraneanFeatureProps) => {
  return (
    <GlassCard variant="aegean" className={styles.card}>
      <WesternMediterraneanPlaceholderCard onOpenInfoModal={onOpenInfoModal} />
    </GlassCard>
  );
};

export default WesternMediterraneanFeature;
