import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { SimulationCaseId } from "../../data/simulationCases";
import styles from "./FullBackgroundVideoPlayer.module.css";

type FullBackgroundVideoPlayerProps = {
  variant: SimulationCaseId;
  fromLanding?: boolean;
  isReturningToHome?: boolean;
  className?: string;
};

const sourceByVariant: Record<SimulationCaseId, string> = {
  "western-mediterranean": "/1.mp4",
  "aegean-sea": "/2.mp4",
  "anchovy-bay": "/3.mp4",
};

const playbackRateByVariant: Record<SimulationCaseId, number> = {
  "western-mediterranean": 1,
  "aegean-sea": 1,
  "anchovy-bay": 1,
};

const transitionEase = [0.22, 1, 0.36, 1] as const;

const FullBackgroundVideoPlayer = ({
  variant,
  fromLanding = false,
  isReturningToHome = false,
  className,
}: FullBackgroundVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoClassName = [styles.video, className].filter(Boolean).join(" ");
  const playbackRate = playbackRateByVariant[variant];

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.playbackRate = playbackRate;
  }, [playbackRate, variant]);

  return (
    <motion.video
      ref={videoRef}
      className={videoClassName}
      src={sourceByVariant[variant]}
      muted
      loop
      autoPlay
      playsInline
      onLoadedMetadata={(event) => {
        event.currentTarget.playbackRate = playbackRate;
      }}
      initial={{ scale: fromLanding ? 1.22 : 1.14 }}
      animate={{
        scale: isReturningToHome ? 1.2 : 1.08,
        opacity: isReturningToHome ? 0.72 : 1,
      }}
      transition={{
        duration: isReturningToHome ? 0.56 : fromLanding ? 0.78 : 0.58,
        ease: transitionEase,
      }}
    />
  );
};

export default FullBackgroundVideoPlayer;
