import { motion } from "framer-motion";
import { useState } from "react";
import type { SimulationCaseId } from "../../data/simulationCases";
import { useAutoplayVideo } from "../../hooks/useAutoplayVideo";
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
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const videoClassName = [styles.video, className].filter(Boolean).join(" ");
  const playbackRate = playbackRateByVariant[variant];

  useAutoplayVideo(videoElement, { playbackRate });

  return (
    <motion.video
      ref={setVideoElement}
      className={videoClassName}
      preload="auto"
      muted
      loop
      autoPlay
      playsInline
      disablePictureInPicture
      key={variant}
      initial={{ scale: fromLanding ? 1.22 : 1.14 }}
      animate={{
        scale: isReturningToHome ? 1.2 : 1.08,
        opacity: isReturningToHome ? 0.72 : 1,
      }}
      transition={{
        duration: isReturningToHome ? 0.56 : fromLanding ? 0.78 : 0.58,
        ease: transitionEase,
      }}
    >
      <source src={sourceByVariant[variant]} type="video/mp4" />
    </motion.video>
  );
};

export default FullBackgroundVideoPlayer;
